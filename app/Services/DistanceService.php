<?php

namespace App\Services;

class DistanceService
{
    public const EARTH_RADIUS_KM = 6371.0;

    /**
     * Calculate straight-line distance in kilometers using the Haversine formula.
     */
    public static function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round(self::EARTH_RADIUS_KM * $c, 2);
    }

    /**
     * Determine delivery fee for a platform rider based on configured distance bands.
     * Returns null if beyond maximum allowed delivery radius.
     */
    public static function getDeliveryFeeBand(float $distanceKm): ?float
    {
        $preferredRadius = (float) SettingsService::get('delivery_radius_preferred_km', 3.0);
        $maxRadius = (float) SettingsService::get('delivery_radius_max_km', 5.0);

        if ($distanceKm <= $preferredRadius) {
            return (float) SettingsService::get('delivery_fee_0_3_km', 150.0);
        }

        if ($distanceKm <= $maxRadius) {
            return (float) SettingsService::get('delivery_fee_3_5_km', 200.0);
        }

        return null; // Beyond max radius
    }
}
