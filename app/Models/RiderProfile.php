<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RiderProfile extends Model
{
    use HasFactory;

    // Availability Statuses
    public const AVAILABILITY_AVAILABLE = 'AVAILABLE';
    public const AVAILABILITY_OFFERED = 'OFFERED';
    public const AVAILABILITY_BUSY = 'BUSY';
    public const AVAILABILITY_OFFLINE = 'OFFLINE';
    public const AVAILABILITY_SUSPENDED = 'SUSPENDED';

    // Approval Statuses
    public const APPROVAL_PENDING = 'pending';
    public const APPROVAL_APPROVED = 'approved';
    public const APPROVAL_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'vehicle_type',
        'vehicle_number',
        'approval_status',
        'availability_status',
        'current_latitude',
        'current_longitude',
        'location_updated_at',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'current_latitude' => 'float',
        'current_longitude' => 'float',
        'location_updated_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function deliveryAssignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class, 'rider_id', 'user_id');
    }

    public function isAvailable(): bool
    {
        return $this->approval_status === self::APPROVAL_APPROVED &&
               $this->availability_status === self::AVAILABILITY_AVAILABLE &&
               $this->current_latitude !== null &&
               $this->current_longitude !== null;
    }
}
