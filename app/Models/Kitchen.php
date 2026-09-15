<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Kitchen extends Model
{
    use HasFactory;

    public const DELIVERY_MODE_PLATFORM = 'platform_rider';
    public const DELIVERY_MODE_OWN = 'own_rider';

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'chef_profile_id',
        'name',
        'slug',
        'description',
        'cuisine_type',
        'phone_contact',
        'operating_days',
        'opening_time',
        'closing_time',
        'is_open',
        'minimum_order_amount',
        'delivery_radius_km',
        'approval_status',
        'delivery_mode',
        'latitude',
        'longitude',
        'address_text',
        'area_locality',
        'landmark',
    ];

    protected function casts(): array
    {
        return [
            'operating_days' => 'array',
            'is_open' => 'boolean',
            'minimum_order_amount' => 'decimal:2',
            'delivery_radius_km' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($kitchen) {
            if (empty($kitchen->slug)) {
                $baseSlug = Str::slug($kitchen->name);
                $slug = $baseSlug;
                $counter = 1;
                while (static::where('slug', $slug)->exists()) {
                    $slug = "{$baseSlug}-{$counter}";
                    $counter++;
                }
                $kitchen->slug = $slug;
            }
        });
    }

    public function chefProfile(): BelongsTo
    {
        return $this->belongsTo(ChefProfile::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(MenuCategory::class)->orderBy('sort_order');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class)->orderBy('sort_order');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('approval_status', self::STATUS_APPROVED);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('is_open', true);
    }

    public function isPlatformRiderMode(): bool
    {
        return $this->delivery_mode === self::DELIVERY_MODE_PLATFORM;
    }

    public function isOwnRiderMode(): bool
    {
        return $this->delivery_mode === self::DELIVERY_MODE_OWN;
    }
}
