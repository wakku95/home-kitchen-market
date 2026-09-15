<?php

namespace Tests\Feature;

use App\Models\ChefProfile;
use App\Models\Kitchen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChefKitchenTest extends TestCase
{
    use RefreshDatabase;

    protected User $chefUser;
    protected string $chefToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->chefUser = User::factory()->create([
            'role' => User::ROLE_CHEF,
            'status' => User::STATUS_ACTIVE,
        ]);
        $this->chefToken = $this->chefUser->createToken('chef_token')->plainTextToken;
    }

    public function test_chef_can_create_kitchen_with_platform_rider_delivery_mode(): void
    {
        $payload = [
            'name' => 'Fatima Kitchen Treats',
            'description' => 'Authentic home cooked biryani & karahi.',
            'cuisine_type' => 'Pakistani',
            'phone_contact' => '03001234567',
            'opening_time' => '11:00',
            'closing_time' => '22:00',
            'is_open' => true,
            'minimum_order_amount' => 500.00,
            'delivery_radius_km' => 5.0,
            'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
            'latitude' => 24.8607,
            'longitude' => 67.0011,
            'address_text' => 'House 123, Street 4, Gulshan-e-Iqbal',
            'area_locality' => 'Gulshan-e-Iqbal, Karachi',
            'landmark' => 'Near Disco Bakery',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->chefToken)
            ->postJson('/api/v1/chef/kitchen', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Fatima Kitchen Treats',
                    'slug' => 'fatima-kitchen-treats',
                    'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
                    'area_locality' => 'Gulshan-e-Iqbal, Karachi',
                ],
            ]);

        $this->assertDatabaseHas('kitchens', [
            'slug' => 'fatima-kitchen-treats',
            'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
        ]);
    }

    public function test_chef_can_update_kitchen_to_own_rider_delivery_mode(): void
    {
        $chefProfile = ChefProfile::create(['user_id' => $this->chefUser->id]);
        $kitchen = Kitchen::create([
            'chef_profile_id' => $chefProfile->id,
            'name' => 'Home Bites',
            'slug' => 'home-bites',
            'cuisine_type' => 'Continental',
            'phone_contact' => '03009998877',
            'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
            'latitude' => 24.9000,
            'longitude' => 67.1000,
            'address_text' => 'Flat 20, Phase 2',
            'area_locality' => 'DHA Phase 2, Karachi',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->chefToken)
            ->putJson('/api/v1/chef/kitchen', [
                'delivery_mode' => Kitchen::DELIVERY_MODE_OWN,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'delivery_mode' => Kitchen::DELIVERY_MODE_OWN,
                ],
            ]);

        $this->assertDatabaseHas('kitchens', [
            'id' => $kitchen->id,
            'delivery_mode' => Kitchen::DELIVERY_MODE_OWN,
        ]);
    }

    public function test_invalid_delivery_mode_is_rejected(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->chefToken)
            ->postJson('/api/v1/chef/kitchen', [
                'name' => 'Test Kitchen',
                'cuisine_type' => 'Fast Food',
                'phone_contact' => '03001234567',
                'delivery_mode' => 'drone_delivery', // Invalid
                'latitude' => 24.86,
                'longitude' => 67.01,
                'address_text' => 'Sample Address',
                'area_locality' => 'Karachi',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['delivery_mode']);
    }

    public function test_chef_cannot_create_second_kitchen(): void
    {
        $chefProfile = ChefProfile::create(['user_id' => $this->chefUser->id]);
        Kitchen::create([
            'chef_profile_id' => $chefProfile->id,
            'name' => 'First Kitchen',
            'slug' => 'first-kitchen',
            'cuisine_type' => 'Pakistani',
            'phone_contact' => '03001234567',
            'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
            'latitude' => 24.86,
            'longitude' => 67.01,
            'address_text' => 'Sample Address',
            'area_locality' => 'Karachi',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->chefToken)
            ->postJson('/api/v1/chef/kitchen', [
                'name' => 'Second Kitchen',
                'cuisine_type' => 'BBQ',
                'phone_contact' => '03001234567',
                'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
                'latitude' => 24.86,
                'longitude' => 67.01,
                'address_text' => 'Sample Address',
                'area_locality' => 'Karachi',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'You already have a registered kitchen. MVP supports one kitchen per chef.',
            ]);
    }

    public function test_customer_cannot_manage_kitchen(): void
    {
        $customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $token = $customer->createToken('customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/chef/kitchen');

        $response->assertStatus(403);
    }
}
