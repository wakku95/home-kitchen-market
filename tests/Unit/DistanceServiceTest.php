<?php

namespace Tests\Unit;

use App\Services\DistanceService;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DistanceServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        SettingsService::seedDefaults();
    }

    public function test_haversine_distance_calculation(): void
    {
        // Coordinates in Karachi: Saddar (24.8565, 67.0175) to Clifton (24.8138, 67.0305) ~ 4.9 km
        $distance = DistanceService::calculateDistance(24.8565, 67.0175, 24.8138, 67.0305);

        $this->assertGreaterThan(4.0, $distance);
        $this->assertLessThan(6.0, $distance);

        // Same point should be 0 km
        $this->assertEquals(0.0, DistanceService::calculateDistance(24.8565, 67.0175, 24.8565, 67.0175));
    }

    public function test_delivery_fee_bands(): void
    {
        // 0 to 3 km band -> Rs. 150
        $fee1 = DistanceService::getDeliveryFeeBand(2.1);
        $this->assertEquals(150.0, $fee1);

        // 3 to 5 km band -> Rs. 200
        $fee2 = DistanceService::getDeliveryFeeBand(4.2);
        $this->assertEquals(200.0, $fee2);

        // Above 5 km -> unavailable (null)
        $fee3 = DistanceService::getDeliveryFeeBand(5.5);
        $this->assertNull($fee3);
    }
}
