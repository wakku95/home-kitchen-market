<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class OrderStateService
{
    /**
     * Allowed state transitions per delivery mode.
     */
    protected const ALLOWED_TRANSITIONS = [
        Order::STATUS_PENDING => [
            Order::STATUS_CHEF_ACCEPTED,
            Order::STATUS_CHEF_REJECTED,
            Order::STATUS_CUSTOMER_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_CHEF_ACCEPTED => [
            Order::STATUS_FINDING_RIDER,             // Platform rider path
            Order::STATUS_AWAITING_CUSTOMER_PAYMENT, // Own rider path
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_FINDING_RIDER => [
            Order::STATUS_RIDER_ASSIGNED,
            Order::STATUS_NO_RIDER_FOUND,
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_CUSTOMER_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_RIDER_ASSIGNED => [
            Order::STATUS_AWAITING_CUSTOMER_PAYMENT,
            Order::STATUS_FINDING_RIDER, // If rider unable to deliver / reassignment
            Order::STATUS_RIDER_CANCELLED,
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_AWAITING_CUSTOMER_PAYMENT => [
            Order::STATUS_PAYMENT_SUBMITTED,
            Order::STATUS_PAYMENT_TIMEOUT,
            Order::STATUS_FINDING_RIDER, // If rider unable to deliver before payment
            Order::STATUS_CUSTOMER_CANCELLED,
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_PAYMENT_SUBMITTED => [
            Order::STATUS_PAYMENT_CONFIRMED,
            Order::STATUS_FINDING_RIDER, // If rider unable to deliver
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_PAYMENT_CONFIRMED => [
            Order::STATUS_PREPARING,
            Order::STATUS_FINDING_RIDER, // If rider unable to deliver
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_PREPARING => [
            Order::STATUS_READY_FOR_PICKUP,
            Order::STATUS_FINDING_RIDER, // If rider unable to deliver
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_READY_FOR_PICKUP => [
            Order::STATUS_PICKED_UP,       // Platform rider flow
            Order::STATUS_OUT_FOR_DELIVERY, // Own rider flow (sent with my rider)
            Order::STATUS_FINDING_RIDER,   // Platform rider dropped before pickup
            Order::STATUS_CHEF_CANCELLED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_PICKED_UP => [
            Order::STATUS_OUT_FOR_DELIVERY,
            Order::STATUS_DELIVERY_FAILED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
        Order::STATUS_OUT_FOR_DELIVERY => [
            Order::STATUS_DELIVERED,
            Order::STATUS_DELIVERY_FAILED,
            Order::STATUS_ADMIN_CANCELLED,
        ],
    ];

    /**
     * Atomically transition an order to a new state.
     */
    public static function transition(
        Order $order,
        string $toStatus,
        ?User $actor = null,
        ?string $reason = null,
        ?array $metadata = null
    ): Order {
        return DB::transaction(function () use ($order, $toStatus, $actor, $reason, $metadata) {
            // Re-fetch and lock for update to prevent concurrent race conditions
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();
            $fromStatus = $lockedOrder->status;

            if ($fromStatus === $toStatus) {
                return $lockedOrder;
            }

            // Validate transition
            $allowed = self::ALLOWED_TRANSITIONS[$fromStatus] ?? [];
            if (! in_array($toStatus, $allowed, true)) {
                throw new InvalidArgumentException("Invalid order transition from [{$fromStatus}] to [{$toStatus}].");
            }

            // Mode-specific validation checks
            if ($lockedOrder->isOwnRider()) {
                if (in_array($toStatus, [Order::STATUS_FINDING_RIDER, Order::STATUS_RIDER_ASSIGNED, Order::STATUS_PICKED_UP], true)) {
                    throw new InvalidArgumentException("Platform rider steps cannot be used for own-rider orders.");
                }
            }

            // Apply updates
            $lockedOrder->status = $toStatus;
            $lockedOrder->save();

            // Record status history audit
            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'changed_by_user_id' => $actor?->id,
                'reason' => $reason,
                'metadata' => $metadata,
            ]);

            AuditService::log("order.transition.{$toStatus}", $lockedOrder, [
                'from' => $fromStatus,
                'to' => $toStatus,
                'reason' => $reason,
            ], $actor?->id);

            return $lockedOrder;
        });
    }
}
