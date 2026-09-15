<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    // Delivery Modes
    public const DELIVERY_MODE_PLATFORM = 'platform_rider';
    public const DELIVERY_MODE_OWN = 'own_rider';

    // Order Lifecycle States
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_CHEF_ACCEPTED = 'CHEF_ACCEPTED';
    public const STATUS_FINDING_RIDER = 'FINDING_RIDER';
    public const STATUS_RIDER_ASSIGNED = 'RIDER_ASSIGNED';
    public const STATUS_AWAITING_CUSTOMER_PAYMENT = 'AWAITING_CUSTOMER_PAYMENT';
    public const STATUS_PAYMENT_SUBMITTED = 'PAYMENT_SUBMITTED';
    public const STATUS_PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED';
    public const STATUS_PREPARING = 'PREPARING';
    public const STATUS_READY_FOR_PICKUP = 'READY_FOR_PICKUP';
    public const STATUS_PICKED_UP = 'PICKED_UP';
    public const STATUS_OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY';
    public const STATUS_DELIVERED = 'DELIVERED';

    // Terminal / Cancellation States
    public const STATUS_CHEF_REJECTED = 'CHEF_REJECTED';
    public const STATUS_CUSTOMER_CANCELLED = 'CUSTOMER_CANCELLED';
    public const STATUS_NO_RIDER_FOUND = 'NO_RIDER_FOUND';
    public const STATUS_PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT';
    public const STATUS_CHEF_CANCELLED = 'CHEF_CANCELLED';
    public const STATUS_RIDER_CANCELLED = 'RIDER_CANCELLED';
    public const STATUS_DELIVERY_FAILED = 'DELIVERY_FAILED';
    public const STATUS_ADMIN_CANCELLED = 'ADMIN_CANCELLED';

    // Delivery Fee Statuses
    public const FEE_STATUS_PENDING = 'PENDING';
    public const FEE_STATUS_PAID_TO_RIDER = 'PAID_TO_RIDER';
    public const FEE_STATUS_DISPUTED = 'DISPUTED';
    public const FEE_STATUS_NOT_APPLICABLE = 'NOT_APPLICABLE';

    protected $fillable = [
        'order_number',
        'customer_id',
        'kitchen_id',
        'assigned_rider_id',
        'delivery_mode',
        'status',
        'subtotal',
        'delivery_fee',
        'total',
        'delivery_fee_status',
        'delivery_address_text',
        'delivery_area',
        'delivery_landmark',
        'delivery_latitude',
        'delivery_longitude',
        'customer_phone',
        'preparation_minutes',
        'ready_at',
        'customer_notes',
        'cancellation_reason',
        'chef_payment_method_id',
        'payment_submitted_reference',
        'payment_deadline_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'total' => 'decimal:2',
            'delivery_latitude' => 'decimal:7',
            'delivery_longitude' => 'decimal:7',
            'preparation_minutes' => 'integer',
            'ready_at' => 'datetime',
            'payment_deadline_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function kitchen(): BelongsTo
    {
        return $this->belongsTo(Kitchen::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->latest();
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(ChefPaymentMethod::class, 'chef_payment_method_id');
    }

    public function assignedRider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_rider_id');
    }

    public function deliveryAssignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class)->latest();
    }

    public function isPlatformRider(): bool
    {
        return $this->delivery_mode === self::DELIVERY_MODE_PLATFORM;
    }

    public function isOwnRider(): bool
    {
        return $this->delivery_mode === self::DELIVERY_MODE_OWN;
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [
            self::STATUS_DELIVERED,
            self::STATUS_CHEF_REJECTED,
            self::STATUS_CUSTOMER_CANCELLED,
            self::STATUS_NO_RIDER_FOUND,
            self::STATUS_PAYMENT_TIMEOUT,
            self::STATUS_CHEF_CANCELLED,
            self::STATUS_RIDER_CANCELLED,
            self::STATUS_DELIVERY_FAILED,
            self::STATUS_ADMIN_CANCELLED,
        ], true);
    }
}
