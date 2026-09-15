<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\OrderStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class OrderController extends Controller
{
    /**
     * Estimate prices, subtotal, and delivery fee band entirely on the server.
     */
    public function estimate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kitchen_id' => ['required', 'integer', 'exists:kitchens,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'delivery_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'delivery_longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        try {
            $estimate = OrderService::estimateOrder(
                $validated['kitchen_id'],
                $validated['items'],
                $validated['delivery_latitude'] ?? null,
                $validated['delivery_longitude'] ?? null
            );

            return response()->json([
                'success' => true,
                'data' => $estimate,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Place new food order.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kitchen_id' => ['required', 'integer', 'exists:kitchens,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
            'delivery_address_text' => ['required', 'string', 'max:500'],
            'delivery_area' => ['required', 'string', 'max:150'],
            'delivery_landmark' => ['nullable', 'string', 'max:150'],
            'delivery_latitude' => ['required', 'numeric', 'between:-90,90'],
            'delivery_longitude' => ['required', 'numeric', 'between:-180,180'],
            'customer_phone' => ['nullable', 'string', 'max:20'],
            'customer_notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $order = OrderService::createOrder($request->user(), $validated);

            return response()->json([
                'success' => true,
                'message' => 'Your order has been placed and sent to the home kitchen.',
                'data' => $order,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Customer order history.
     */
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()
            ->with(['kitchen:id,name,slug,cuisine_type,delivery_mode,area_locality'])
            ->withCount('items')
            ->latest()
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * Customer order details with strict privacy protections.
     */
    public function show(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::where('order_number', $orderNumber)
            ->where('customer_id', $request->user()->id)
            ->with(['kitchen:id,name,slug,cuisine_type,delivery_mode,area_locality', 'items'])
            ->firstOrFail();

        // Reveal chef payment destination ONLY when payment is requested or active
        $paymentDetails = null;
        if (in_array($order->status, [
            Order::STATUS_AWAITING_CUSTOMER_PAYMENT,
            Order::STATUS_PAYMENT_SUBMITTED,
            Order::STATUS_PAYMENT_CONFIRMED,
            Order::STATUS_PREPARING,
            Order::STATUS_READY_FOR_PICKUP,
            Order::STATUS_PICKED_UP,
            Order::STATUS_OUT_FOR_DELIVERY,
            Order::STATUS_DELIVERED,
        ], true)) {
            // Find active payment methods for this chef
            $paymentDetails = $order->kitchen->chefProfile?->paymentMethods()
                ->active()
                ->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'method_type' => $m->method_type,
                    'account_title' => $m->account_title,
                    'account_number' => $m->account_number,
                    'bank_name' => $m->bank_name,
                    'instructions' => $m->instructions,
                    'verification_status' => $m->verification_status,
                ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'order' => $order,
                'payment_methods' => $paymentDetails,
                'timeline' => $order->statusHistories,
            ],
        ]);
    }

    /**
     * Customer order cancellation before payment / chef acceptance.
     */
    public function cancel(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::where('order_number', $orderNumber)
            ->where('customer_id', $request->user()->id)
            ->firstOrFail();

        if (! in_array($order->status, [Order::STATUS_PENDING, Order::STATUS_AWAITING_CUSTOMER_PAYMENT], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Orders cannot be cancelled once payment has been submitted or food preparation has started.',
            ], 422);
        }

        $reason = $request->input('reason', 'Cancelled by customer before payment');
        $updatedOrder = OrderStateService::transition(
            $order,
            Order::STATUS_CUSTOMER_CANCELLED,
            $request->user(),
            $reason
        );

        return response()->json([
            'success' => true,
            'message' => 'Order cancelled successfully.',
            'data' => $updatedOrder,
        ]);
    }
}
