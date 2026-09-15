<?php

namespace App\Services;

use App\Models\Kitchen;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class OrderService
{
    /**
     * Authoritatively estimate order pricing entirely on the backend.
     * Frontend-supplied prices/totals are strictly ignored.
     */
    public static function estimateOrder(int $kitchenId, array $items, ?float $deliveryLat, ?float $deliveryLng): array
    {
        $kitchen = Kitchen::findOrFail($kitchenId);

        if (! $kitchen->is_open) {
            throw new InvalidArgumentException("This kitchen is currently closed for orders.");
        }

        if (empty($items)) {
            throw new InvalidArgumentException("Cart cannot be empty.");
        }

        $itemIds = array_column($items, 'item_id');
        $menuItems = MenuItem::whereIn('id', $itemIds)->get()->keyBy('id');

        $subtotal = 0.00;
        $validatedItems = [];

        foreach ($items as $itemData) {
            $itemId = $itemData['item_id'];
            $quantity = max(1, (int) ($itemData['quantity'] ?? 1));

            if (! isset($menuItems[$itemId])) {
                throw new InvalidArgumentException("Dish with ID [{$itemId}] does not exist.");
            }

            $menuItem = $menuItems[$itemId];

            // Strict single-kitchen validation: every item must belong to the same kitchen
            if ($menuItem->kitchen_id !== $kitchen->id) {
                throw new InvalidArgumentException("All items in an order must be from the same kitchen ({$kitchen->name}).");
            }

            if (! $menuItem->is_available) {
                throw new InvalidArgumentException("Dish '{$menuItem->name}' is currently sold out.");
            }

            $unitPrice = (float) $menuItem->price;
            $lineTotal = round($unitPrice * $quantity, 2);
            $subtotal += $lineTotal;

            $validatedItems[] = [
                'menu_item' => $menuItem,
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'total_price' => $lineTotal,
                'notes' => $itemData['notes'] ?? null,
            ];
        }

        // Check minimum order amount
        if ($subtotal < (float) $kitchen->minimum_order_amount) {
            $minAmount = number_format($kitchen->minimum_order_amount, 2);
            throw new InvalidArgumentException("Order subtotal (PKR {$subtotal}) is below this kitchen's minimum requirement of PKR {$minAmount}.");
        }

        // Calculate delivery fee according to kitchen's delivery_mode
        $deliveryFee = 0.00;
        $deliveryFeeStatus = Order::FEE_STATUS_NOT_APPLICABLE;
        $distanceKm = null;

        if ($kitchen->delivery_mode === Kitchen::DELIVERY_MODE_OWN) {
            // Own rider orders have zero platform delivery fee in MVP
            $deliveryFee = 0.00;
            $deliveryFeeStatus = Order::FEE_STATUS_NOT_APPLICABLE;
        } else {
            // Platform rider matching requires distance calculation
            if ($deliveryLat === null || $deliveryLng === null) {
                throw new InvalidArgumentException("Delivery location coordinates are required to calculate delivery fee.");
            }

            $distanceKm = DistanceService::calculateDistance(
                (float) $kitchen->latitude,
                (float) $kitchen->longitude,
                $deliveryLat,
                $deliveryLng
            );

            if ($distanceKm > (float) $kitchen->delivery_radius_km) {
                throw new InvalidArgumentException("Delivery address is ~{$distanceKm} km away, which exceeds this kitchen's delivery radius of {$kitchen->delivery_radius_km} km.");
            }

            $bandFee = DistanceService::getDeliveryFeeBand($distanceKm);
            if ($bandFee === null) {
                throw new InvalidArgumentException("Delivery address is ~{$distanceKm} km away, which exceeds the platform's maximum allowed delivery range.");
            }

            $deliveryFee = $bandFee;
            $deliveryFeeStatus = Order::FEE_STATUS_PENDING;
        }

        $total = round($subtotal + $deliveryFee, 2);

        return [
            'kitchen' => [
                'id' => $kitchen->id,
                'name' => $kitchen->name,
                'delivery_mode' => $kitchen->delivery_mode,
            ],
            'subtotal' => round($subtotal, 2),
            'delivery_fee' => $deliveryFee,
            'total' => $total,
            'delivery_fee_status' => $deliveryFeeStatus,
            'distance_km' => $distanceKm,
            'items' => $validatedItems,
        ];
    }

    /**
     * Create a new customer order with database transaction and snapshotting.
     */
    public static function createOrder(User $customer, array $payload): Order
    {
        return DB::transaction(function () use ($customer, $payload) {
            $estimate = self::estimateOrder(
                (int) $payload['kitchen_id'],
                $payload['items'],
                (float) $payload['delivery_latitude'],
                (float) $payload['delivery_longitude']
            );

            $kitchen = Kitchen::findOrFail($payload['kitchen_id']);

            // Generate unique human-readable order number
            $orderNumber = 'ORD-' . date('Ymd') . '-' . strtoupper(Str::random(6));

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $customer->id,
                'kitchen_id' => $kitchen->id,
                // Snapshot kitchen's delivery mode onto the order!
                'delivery_mode' => $kitchen->delivery_mode,
                'status' => Order::STATUS_PENDING,
                'subtotal' => $estimate['subtotal'],
                'delivery_fee' => $estimate['delivery_fee'],
                'total' => $estimate['total'],
                'delivery_fee_status' => $estimate['delivery_fee_status'],
                'delivery_address_text' => $payload['delivery_address_text'],
                'delivery_area' => $payload['delivery_area'],
                'delivery_landmark' => $payload['delivery_landmark'] ?? null,
                'delivery_latitude' => $payload['delivery_latitude'],
                'delivery_longitude' => $payload['delivery_longitude'],
                'customer_phone' => $payload['customer_phone'] ?? $customer->phone,
                'customer_notes' => $payload['customer_notes'] ?? null,
            ]);

            // Save order items
            foreach ($estimate['items'] as $itemData) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $itemData['menu_item']->id,
                    'item_name' => $itemData['menu_item']->name,
                    'unit_price' => $itemData['unit_price'],
                    'quantity' => $itemData['quantity'],
                    'total_price' => $itemData['total_price'],
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            // Create initial status history entry
            \App\Models\OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => Order::STATUS_PENDING,
                'changed_by_user_id' => $customer->id,
                'reason' => 'Order placed by customer',
            ]);

            AuditService::log('order.placed', $order, [
                'order_number' => $order->order_number,
                'total' => $order->total,
                'delivery_mode' => $order->delivery_mode,
            ], $customer->id);

            return $order->load(['items', 'kitchen']);
        });
    }
}
