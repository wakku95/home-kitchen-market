<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        SettingsService::seedDefaults();
    }

    public function test_public_settings_are_accessible_without_auth(): void
    {
        $response = $this->getJson('/api/v1/settings/public');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'delivery_radius_preferred_km' => 3.0,
                    'delivery_radius_max_km' => 5.0,
                    'delivery_fee_0_3_km' => 150.0,
                    'delivery_fee_3_5_km' => 200.0,
                    'currency' => 'PKR',
                ],
            ]);
    }

    public function test_admin_can_view_and_update_settings(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);
        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'chef_monthly_subscription_price',
                    'delivery_fee_0_3_km',
                ],
            ]);

        $updateResp = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/admin/settings', [
                'settings' => [
                    ['key' => 'chef_monthly_subscription_price', 'value' => '2500'],
                    ['key' => 'delivery_fee_0_3_km', 'value' => '180'],
                ],
            ]);

        $updateResp->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertEquals(2500, SettingsService::get('chef_monthly_subscription_price'));
        $this->assertEquals(180, SettingsService::get('delivery_fee_0_3_km'));
    }

    public function test_customer_cannot_access_admin_settings(): void
    {
        $customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $token = $customer->createToken('customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/settings');

        $response->assertStatus(403);
    }
}
