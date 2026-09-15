<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChefPaymentMethod extends Model
{
    use HasFactory;

    public const METHOD_JAZZCASH = 'jazzcash';
    public const METHOD_EASYPAISA = 'easypaisa';
    public const METHOD_BANK_TRANSFER = 'bank_transfer';
    public const METHOD_RAAST = 'raast';

    public const STATUS_PENDING = 'pending';
    public const STATUS_VERIFIED = 'verified';
    public const STATUS_REJECTED = 'rejected';

    public const ALLOWED_METHODS = [
        self::METHOD_JAZZCASH,
        self::METHOD_EASYPAISA,
        self::METHOD_BANK_TRANSFER,
        self::METHOD_RAAST,
    ];

    protected $fillable = [
        'chef_profile_id',
        'method_type',
        'account_title',
        'account_number',
        'bank_name',
        'instructions',
        'is_active',
        'verification_status',
        'verified_at',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    public function chefProfile(): BelongsTo
    {
        return $this->belongsTo(ChefProfile::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('verification_status', self::STATUS_VERIFIED);
    }
}
