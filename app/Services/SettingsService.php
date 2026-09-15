<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    protected const DEFAULTS = [
        'chef_monthly_subscription_price' => ['value' => '2000', 'type' => 'decimal', 'description' => 'Monthly subscription fee for approved kitchens after trial period (PKR)'],
        'trial_period_days' => ['value' => '30', 'type' => 'integer', 'description' => 'Number of days for free chef trial starting from first completed order'],
        'delivery_radius_preferred_km' => ['value' => '3.0', 'type' => 'decimal', 'description' => 'Preferred delivery radius in kilometers for rider search'],
        'delivery_radius_max_km' => ['value' => '5.0', 'type' => 'decimal', 'description' => 'Maximum allowed delivery radius in kilometers for rider search and orders'],
        'delivery_fee_0_3_km' => ['value' => '150', 'type' => 'decimal', 'description' => 'Flat delivery fee in PKR for straight-line distance 0 to 3 km'],
        'delivery_fee_3_5_km' => ['value' => '200', 'type' => 'decimal', 'description' => 'Flat delivery fee in PKR for straight-line distance 3 to 5 km'],
        'rider_offer_timeout_seconds' => ['value' => '60', 'type' => 'integer', 'description' => 'Time in seconds a rider has to accept or reject an offered delivery before expiring'],
        'customer_payment_timeout_minutes' => ['value' => '15', 'type' => 'integer', 'description' => 'Time in minutes allowed for customer to submit payment to chef before order times out'],
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("system_setting_{$key}", 3600, function () use ($key, $default) {
            $setting = SystemSetting::where('key', $key)->first();
            if ($setting) {
                return $setting->cast_value;
            }

            if (isset(self::DEFAULTS[$key])) {
                $item = self::DEFAULTS[$key];
                return match ($item['type']) {
                    'integer', 'int' => (int) $item['value'],
                    'float', 'decimal' => (float) $item['value'],
                    'boolean', 'bool' => filter_var($item['value'], FILTER_VALIDATE_BOOLEAN),
                    default => $item['value'],
                };
            }

            return $default;
        });
    }

    public static function set(string $key, mixed $value, ?string $type = null, ?string $description = null): SystemSetting
    {
        $type = $type ?? (self::DEFAULTS[$key]['type'] ?? 'string');
        $description = $description ?? (self::DEFAULTS[$key]['description'] ?? null);

        $storedValue = is_array($value) ? json_encode($value) : (string) $value;

        $setting = SystemSetting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $storedValue,
                'type' => $type,
                'description' => $description,
            ]
        );

        Cache::forget("system_setting_{$key}");

        return $setting;
    }

    public static function seedDefaults(): void
    {
        foreach (self::DEFAULTS as $key => $data) {
            SystemSetting::firstOrCreate(
                ['key' => $key],
                [
                    'value' => $data['value'],
                    'type' => $data['type'],
                    'description' => $data['description'],
                ]
            );
        }
    }

    public static function all(): array
    {
        self::seedDefaults();
        $records = SystemSetting::all();
        $result = [];
        foreach ($records as $record) {
            $result[$record->key] = [
                'value' => $record->cast_value,
                'raw_value' => $record->value,
                'type' => $record->type,
                'description' => $record->description,
            ];
        }
        return $result;
    }
}
