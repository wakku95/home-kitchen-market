<?php

namespace Tests\Feature;

use App\Models\ChefProfile;
use App\Models\Kitchen;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerKitchenDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_browse_kitchens_and_sensitive_data_is_redacted(): void
    {
        $chef = User::factory()->create(['role' => User::ROLE_CHEF]);
        $profile = ChefProfile::create(['user_id' => $chef->id]);
        $kitchen = Kitchen::create([
            'chef_profile_id' => $profile->id,
            'name' => 'Aunty Kitchen',
            'slug' => 'aunty-kitchen',
            'description' => 'Homely daal chawal and chicken salan.',
            'cuisine_type' => 'Pakistani',
            'phone_contact' => '03009876543', // Private!
            'latitude' => 24.8607,           // Private!
            'longitude' => 67.0011,          // Private!
            'address_text' => 'House 99, Street 1, Karachi', // Private!
            'area_locality' => 'Gulshan-e-Iqbal, Karachi',   // Public
            'approval_status' => Kitchen::STATUS_APPROVED,
            'is_open' => true,
        ]);

        $response = $this->getJson('/api/v1/customer/kitchens');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    [
                        'name' => 'Aunty Kitchen',
                        'slug' => 'aunty-kitchen',
                        'area_locality' => 'Gulshan-e-Iqbal, Karachi',
                    ],
                ],
            ]);

        // Verify privacy protection
        $item = $response->json('data.0');
        $this->assertArrayNotHasKey('phone_contact', $item);
        $this->assertArrayNotHasKey('address_text', $item);
        $this->assertArrayNotHasKey('latitude', $item);
        $this->assertArrayNotHasKey('longitude', $item);
    }

    public function test_customer_can_view_kitchen_menu_and_only_available_items_appear(): void
    {
        $chef = User::factory()->create(['role' => User::ROLE_CHEF]);
        $profile = ChefProfile::create(['user_id' => $chef->id]);
        $kitchen = Kitchen::create([
            'chef_profile_id' => $profile->id,
            'name' => 'Zaiqa Kitchen',
            'slug' => 'zaiqa-kitchen',
            'cuisine_type' => 'Pakistani',
            'phone_contact' => '03001234567',
            'latitude' => 24.86,
            'longitude' => 67.01,
            'address_text' => 'Private Address',
            'area_locality' => 'Karachi',
            'approval_status' => Kitchen::STATUS_APPROVED,
            'is_open' => true,
        ]);

        $cat = MenuCategory::create([
            'kitchen_id' => $kitchen->id,
            'name' => 'Mains',
        ]);

        MenuItem::create([
            'kitchen_id' => $kitchen->id,
            'menu_category_id' => $cat->id,
            'name' => 'Available Haleem',
            'price' => 350.00,
            'is_available' => true,
        ]);

        MenuItem::create([
            'kitchen_id' => $kitchen->id,
            'menu_category_id' => $cat->id,
            'name' => 'Sold Out Korma',
            'price' => 500.00,
            'is_available' => false,
        ]);

        $response = $this->getJson("/api/v1/customer/kitchens/{$kitchen->slug}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'kitchen' => [
                        'slug' => 'zaiqa-kitchen',
                    ],
                ],
            ]);

        $items = $response->json('data.categories.0.items');
        $this->assertCount(1, $items);
        $this->assertEquals('Available Haleem', $items[0]['name']);
    }
}
