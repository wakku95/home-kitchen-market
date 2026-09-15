<?php

namespace App\Http\Controllers\Api\V1\Rider;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use App\Models\Order;
use App\Models\RiderProfile;
use App\Services\RiderMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RiderController extends Controller
{
    /**
     * Get the rider profile, current status, active assignment or offer.
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = RiderProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'vehicle_type' => 'motorcycle',
                'approval_status' => RiderProfile::APPROVAL_APPROVED, // Auto-approved in MVP for development
                'availability_status' => RiderProfile::AVAILABILITY_OFFLINE,
            ]
        );

        // Process any expired offers
        RiderMatchingService::processExpiredOffers();

        // Check if there is an active pending offer for this rider
        $pendingOffer = DeliveryAssignment::with(['order.kitchen:id,name,area_locality,latitude,longitude'])
            ->where('rider_id', $user->id)
            ->where('status', DeliveryAssignment::STATUS_OFFERED)
            ->where('expires_at', '>', now())
            ->first();

        // Check if rider has an active in-progress order
        $activeOrder = Order::with(['kitchen:id,name,address_text,area_locality,phone_contact,latitude,longitude'])
            ->where('assigned_rider_id', $user->id)
            ->whereNotIn('status', [
                Order::STATUS_DELIVERED,
                Order::STATUS_DELIVERY_FAILED,
                Order::STATUS_RIDER_CANCELLED,
                Order::STATUS_CHEF_CANCELLED,
                Order::STATUS_ADMIN_CANCELLED,
            ])
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'profile' => $profile,
                'pending_offer' => $pendingOffer,
                'active_order' => $activeOrder,
            ],
        ]);
    }

    /**
     * Update rider availability status (AVAILABLE vs OFFLINE).
     */
    public function updateStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:AVAILABLE,OFFLINE',
        ]);

        $user = $request->user();
        $profile = RiderProfile::where('user_id', $user->id)->firstOrFail();

        if ($profile->availability_status === RiderProfile::AVAILABILITY_BUSY) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot change status while on an active delivery assignment.',
            ], 422);
        }

        $profile->update([
            'availability_status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => "Availability updated to {$validated['status']}.",
            'data' => $profile,
        ]);
    }

    /**
     * Update rider current GPS coordinates.
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();
        $profile = RiderProfile::where('user_id', $user->id)->firstOrFail();

        $profile->update([
            'current_latitude' => $validated['latitude'],
            'current_longitude' => $validated['longitude'],
            'location_updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Location updated successfully.',
            'data' => $profile,
        ]);
    }

    /**
     * Accept a delivery assignment.
     */
    public function acceptAssignment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        try {
            $order = RiderMatchingService::acceptOffer($id, $user);

            return response()->json([
                'success' => true,
                'message' => 'Delivery assignment accepted successfully.',
                'data' => [
                    'order' => $order->load('kitchen:id,name,address_text,area_locality,phone_contact,latitude,longitude'),
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Reject a delivery assignment.
     */
    public function rejectAssignment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:150',
        ]);

        $user = $request->user();

        try {
            RiderMatchingService::rejectOffer($id, $user, $validated['reason'] ?? null);

            return response()->json([
                'success' => true,
                'message' => 'Offer declined.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Report unable to deliver before pickup.
     */
    public function reportUnableToDeliver(Request $request, string $orderNumber): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:200',
        ]);

        $user = $request->user();
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        try {
            $updatedOrder = RiderMatchingService::unableToDeliver($order, $user, $validated['reason']);

            return response()->json([
                'success' => true,
                'message' => 'Delivery unassigned. Re-dispatched to next candidate rider.',
                'data' => [
                    'order' => $updatedOrder,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Mark order picked up from kitchen.
     */
    public function markPickedUp(Request $request, string $orderNumber): JsonResponse
    {
        $user = $request->user();
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        if ($order->assigned_rider_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        try {
            $updated = \App\Services\OrderStateService::transition(
                $order,
                Order::STATUS_PICKED_UP,
                $user,
                'Rider picked up order from kitchen.'
            );

            // Immediately mark OUT_FOR_DELIVERY
            $outForDelivery = \App\Services\OrderStateService::transition(
                $updated,
                Order::STATUS_OUT_FOR_DELIVERY,
                $user,
                'Rider is on the way to customer.'
            );

            return response()->json([
                'success' => true,
                'message' => 'Order marked picked up and out for delivery.',
                'data' => $outForDelivery,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Mark delivery completed.
     */
    public function markDelivered(Request $request, string $orderNumber): JsonResponse
    {
        $user = $request->user();
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        if ($order->assigned_rider_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        try {
            $updated = \App\Services\OrderStateService::transition(
                $order,
                Order::STATUS_DELIVERED,
                $user,
                'Rider marked order delivered to customer.'
            );

            // Free rider
            RiderProfile::where('user_id', $user->id)->update([
                'availability_status' => RiderProfile::AVAILABILITY_AVAILABLE,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order delivered successfully.',
                'data' => $updated,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Rider delivery history.
     */
    public function deliveryHistory(Request $request): JsonResponse
    {
        $user = $request->user();
        $deliveries = Order::with('kitchen:id,name,area_locality')
            ->where('assigned_rider_id', $user->id)
            ->latest()
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $deliveries,
        ]);
    }
}
