<?php

namespace App\Services;

use App\Models\DeliveryAssignment;
use App\Models\Order;
use App\Models\RiderProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RiderMatchingService
{
    /**
     * Dispatch an order to the next closest eligible rider.
     * If order is own_rider mode, dispatch is bypassed.
     */
    public static function dispatchOrder(Order $order): ?DeliveryAssignment
    {
        // 1. Guard against own_rider mode
        if ($order->isOwnRider()) {
            return null;
        }

        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            // Ensure order is in finding rider state
            if ($lockedOrder->status !== Order::STATUS_FINDING_RIDER) {
                return null;
            }

            // Check if there is already an active (unexpired offered) assignment for this order
            $activeAssignment = DeliveryAssignment::where('order_id', $lockedOrder->id)
                ->where('status', DeliveryAssignment::STATUS_OFFERED)
                ->where('expires_at', '>', now())
                ->first();

            if ($activeAssignment) {
                return $activeAssignment;
            }

            // Clean up any previously expired offered assignments for this order
            DeliveryAssignment::where('order_id', $lockedOrder->id)
                ->where('status', DeliveryAssignment::STATUS_OFFERED)
                ->where('expires_at', '<=', now())
                ->update(['status' => DeliveryAssignment::STATUS_EXPIRED]);

            // Release rider status for riders whose offer expired
            $expiredRiderIds = DeliveryAssignment::where('order_id', $lockedOrder->id)
                ->where('status', DeliveryAssignment::STATUS_EXPIRED)
                ->pluck('rider_id');

            if ($expiredRiderIds->isNotEmpty()) {
                RiderProfile::whereIn('user_id', $expiredRiderIds)
                    ->where('availability_status', RiderProfile::AVAILABILITY_OFFERED)
                    ->update(['availability_status' => RiderProfile::AVAILABILITY_AVAILABLE]);
            }

            // Find riders who have already rejected, expired, or been offered this order
            $alreadyContactedRiderIds = DeliveryAssignment::where('order_id', $lockedOrder->id)
                ->pluck('rider_id')
                ->toArray();

            $kitchen = $lockedOrder->kitchen;
            $maxRadius = (float) SettingsService::get('delivery_radius_max_km', 5.0);
            $timeoutSeconds = (int) SettingsService::get('rider_offer_timeout_seconds', 60);

            // Fetch candidate riders who are approved, available, and have coordinates
            $candidateRiders = RiderProfile::where('approval_status', RiderProfile::APPROVAL_APPROVED)
                ->where('availability_status', RiderProfile::AVAILABILITY_AVAILABLE)
                ->whereNotNull('current_latitude')
                ->whereNotNull('current_longitude')
                ->whereNotIn('user_id', $alreadyContactedRiderIds)
                ->get();

            $rankedRiders = [];
            foreach ($candidateRiders as $rider) {
                $distance = DistanceService::calculateDistance(
                    (float) $rider->current_latitude,
                    (float) $rider->current_longitude,
                    (float) $kitchen->latitude,
                    (float) $kitchen->longitude
                );

                if ($distance <= $maxRadius) {
                    $rankedRiders[] = [
                        'profile' => $rider,
                        'distance' => $distance,
                    ];
                }
            }

            // Sort by straight-line distance to kitchen (closest first)
            usort($rankedRiders, fn ($a, $b) => $a['distance'] <=> $b['distance']);

            if (empty($rankedRiders)) {
                // No eligible rider found -> transition order to NO_RIDER_FOUND
                OrderStateService::transition(
                    $lockedOrder,
                    Order::STATUS_NO_RIDER_FOUND,
                    null,
                    'No available riders within delivery radius.'
                );
                return null;
            }

            // Pick the closest rider
            $chosen = $rankedRiders[0];
            $riderProfile = $chosen['profile'];
            $distanceKm = $chosen['distance'];

            // Mark rider as OFFERED
            $riderProfile->update([
                'availability_status' => RiderProfile::AVAILABILITY_OFFERED,
            ]);

            // Create delivery assignment with expiration timestamp
            $assignment = DeliveryAssignment::create([
                'order_id' => $lockedOrder->id,
                'rider_id' => $riderProfile->user_id,
                'status' => DeliveryAssignment::STATUS_OFFERED,
                'distance_to_kitchen_km' => $distanceKm,
                'expires_at' => Carbon::now()->addSeconds($timeoutSeconds),
            ]);

            return $assignment;
        });
    }

    /**
     * Rider accepts an offered assignment.
     * Strictly protected against race conditions with pessimistic locking.
     */
    public static function acceptOffer(int $assignmentId, User $riderUser): Order
    {
        return DB::transaction(function () use ($assignmentId, $riderUser) {
            // Lock the assignment row
            $assignment = DeliveryAssignment::where('id', $assignmentId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($assignment->rider_id !== $riderUser->id) {
                throw new \InvalidArgumentException('You are not authorized to accept this offer.');
            }

            if ($assignment->status !== DeliveryAssignment::STATUS_OFFERED) {
                throw new \InvalidArgumentException("This delivery offer is no longer available ({$assignment->status}).");
            }

            if ($assignment->expires_at->isPast()) {
                $assignment->update(['status' => DeliveryAssignment::STATUS_EXPIRED]);
                // Free rider
                RiderProfile::where('user_id', $riderUser->id)
                    ->update(['availability_status' => RiderProfile::AVAILABILITY_AVAILABLE]);

                throw new \InvalidArgumentException('This delivery offer has expired.');
            }

            // Lock the order
            $order = Order::where('id', $assignment->order_id)->lockForUpdate()->firstOrFail();

            if ($order->status !== Order::STATUS_FINDING_RIDER) {
                $assignment->update(['status' => DeliveryAssignment::STATUS_CANCELLED]);
                throw new \InvalidArgumentException('This order is no longer looking for a rider.');
            }

            // 1. Mark assignment accepted
            $assignment->update([
                'status' => DeliveryAssignment::STATUS_ACCEPTED,
                'responded_at' => now(),
            ]);

            // 2. Set rider to BUSY
            RiderProfile::where('user_id', $riderUser->id)->update([
                'availability_status' => RiderProfile::AVAILABILITY_BUSY,
            ]);

            // 3. Assign rider to order and transition state
            $order->update(['assigned_rider_id' => $riderUser->id]);

            OrderStateService::transition(
                $order,
                Order::STATUS_RIDER_ASSIGNED,
                $riderUser,
                "Rider {$riderUser->name} accepted the delivery assignment."
            );

            // Automatically transition to AWAITING_CUSTOMER_PAYMENT now that rider is secured
            return OrderStateService::transition(
                $order,
                Order::STATUS_AWAITING_CUSTOMER_PAYMENT,
                $riderUser,
                'Rider secured. Awaiting customer payment to chef.'
            );
        });
    }

    /**
     * Rider rejects an offered assignment.
     */
    public static function rejectOffer(int $assignmentId, User $riderUser, ?string $reason = null): ?DeliveryAssignment
    {
        return DB::transaction(function () use ($assignmentId, $riderUser, $reason) {
            $assignment = DeliveryAssignment::where('id', $assignmentId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($assignment->rider_id !== $riderUser->id) {
                throw new \InvalidArgumentException('You are not authorized to reject this offer.');
            }

            if ($assignment->status === DeliveryAssignment::STATUS_OFFERED) {
                $assignment->update([
                    'status' => DeliveryAssignment::STATUS_REJECTED,
                    'responded_at' => now(),
                    'rejection_reason' => $reason,
                ]);
            }

            // Return rider to AVAILABLE
            RiderProfile::where('user_id', $riderUser->id)
                ->where('availability_status', RiderProfile::AVAILABILITY_OFFERED)
                ->update(['availability_status' => RiderProfile::AVAILABILITY_AVAILABLE]);

            // Immediately attempt sequential dispatch to the next candidate rider
            $order = Order::find($assignment->order_id);
            if ($order && $order->status === Order::STATUS_FINDING_RIDER) {
                return self::dispatchOrder($order);
            }

            return null;
        });
    }

    /**
     * Rider marks themselves "Unable to deliver" before pickup.
     * Order returns to FINDING_RIDER for automatic reassignment.
     */
    public static function unableToDeliver(Order $order, User $riderUser, string $reason): Order
    {
        return DB::transaction(function () use ($order, $riderUser, $reason) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->assigned_rider_id !== $riderUser->id) {
                throw new \InvalidArgumentException('You are not the assigned rider for this order.');
            }

            // Only permitted before order is PICKED_UP
            $allowedStatuses = [
                Order::STATUS_RIDER_ASSIGNED,
                Order::STATUS_AWAITING_CUSTOMER_PAYMENT,
                Order::STATUS_PAYMENT_SUBMITTED,
                Order::STATUS_PAYMENT_CONFIRMED,
                Order::STATUS_PREPARING,
                Order::STATUS_READY_FOR_PICKUP,
            ];

            if (!in_array($lockedOrder->status, $allowedStatuses, true)) {
                throw new \InvalidArgumentException("Cannot reassign order in status {$lockedOrder->status}.");
            }

            // Free the rider
            RiderProfile::where('user_id', $riderUser->id)->update([
                'availability_status' => RiderProfile::AVAILABILITY_AVAILABLE,
            ]);

            // Detach rider and transition order back to FINDING_RIDER
            $lockedOrder->update(['assigned_rider_id' => null]);

            $reassignedOrder = OrderStateService::transition(
                $lockedOrder,
                Order::STATUS_FINDING_RIDER,
                $riderUser,
                "Rider unable to deliver: {$reason}. Re-entering rider matching queue."
            );

            // Trigger dispatch for next candidate
            self::dispatchOrder($reassignedOrder);

            return $reassignedOrder;
        });
    }

    /**
     * Process expired offers across the system (invoked via cron or check hooks).
     */
    public static function processExpiredOffers(): int
    {
        $expiredAssignments = DeliveryAssignment::where('status', DeliveryAssignment::STATUS_OFFERED)
            ->where('expires_at', '<=', now())
            ->get();

        $count = 0;
        foreach ($expiredAssignments as $assignment) {
            DB::transaction(function () use ($assignment) {
                $assignment->update(['status' => DeliveryAssignment::STATUS_EXPIRED]);

                RiderProfile::where('user_id', $assignment->rider_id)
                    ->where('availability_status', RiderProfile::AVAILABILITY_OFFERED)
                    ->update(['availability_status' => RiderProfile::AVAILABILITY_AVAILABLE]);

                $order = Order::find($assignment->order_id);
                if ($order && $order->status === Order::STATUS_FINDING_RIDER) {
                    self::dispatchOrder($order);
                }
            });
            $count++;
        }

        return $count;
    }
}
