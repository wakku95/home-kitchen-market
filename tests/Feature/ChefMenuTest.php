<?php

namespace Tests\Feature;

use App\Models\ChefProfile;
use App\Models\Kitchen;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChefMenuTest extends TestCase
{
    use RefreshDatabase;

    protected User $chef1;
    protected string $token1;
    protected Kitchen $kitchen1;

    protected User $chef2;
    protected string $token2;
    protected Kitchen $kitchen2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->chef1 = User::factory()->create(['role' => User::ROLE_CHEF, 'status' => User::STATUS_ACTIVE]);
        $this->token1 = $this->chef1->createToken('token1')->plainTextToken;
        $profile1 = ChefProfile::create(['user_id' => $this->chef1->id]);
        $this->kitchen1 = Kitchen::create([
            'chef_profile_id' => $profile1->id,
            'name' => 'Chef 1 Kitchen',
            'slug' => 'chef-1-kitchen',
            'cuisine_type' => 'Pakistani',
            'phone_contact' => '03001111111',
            'latitude' => 24.86,
            'longitude' => 67.01,
            'address_text' => 'Street 1',
            'area_locality' => 'Karachi',
        ]);

        $this->chef2 = User::factory()->create(['role' => User::ROLE_CHEF, 'status' => User::STATUS_ACTIVE]);
        $this->token2 = $this->chef2->createToken('token2')->plainTextToken;
        $profile2 = ChefProfile::create(['user_id' => $this->chef2->id]);
        $this->kitchen2 = Kitchen::create([
            'chef_profile_id' => $profile2->id,
            'name' => 'Chef 2 Kitchen',
            'slug' => 'chef-2-kitchen',
            'cuisine_type' => 'Chinese',
            'phone_contact' => '03002222222',
            'latitude' => 24.88,
            'longitude' => 67.05,
            'address_text' => 'Street 2',
            'area_locality' => 'Karachi',
        ]);
    }

    public function test_chef_can_create_category_and_item(): void
    {
        $catResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson('/api/v1/chef/menu/categories', [
                'name' => 'Biryani & Rice',
                'sort_order' => 1,
            ]);

        $catResp->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Biryani & Rice',
                ],
            ]);

        $categoryId = $catResp->json('data.id');

        $itemResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson('/api/v1/chef/menu/items', [
                'menu_category_id' => $categoryId,
                'name' => 'Special Chicken Biryani',
                'description' => 'Served with raita and salad.',
                'price' => 450.00,
                'preparation_time_minutes' => 25,
                'is_available' => true,
            ]);

        $itemResp->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Special Chicken Biryani',
                    'price' => '450.00',
                    'is_available' => true,
                ],
            ]);
    }

    public function test_chef_can_toggle_item_availability(): void
    {
        $item = MenuItem::create([
            'kitchen_id' => $this->kitchen1->id,
            'name' => 'Beef Nihari',
            'price' => 600.00,
            'is_available' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->patchJson("/api/v1/chef/menu/items/{$item->id}/availability");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_available' => false,
                ],
            ]);

        $this->assertFalse($item->fresh()->is_available);
    }

    public function test_chef_cannot_modify_other_chefs_menu_item(): void
    {
        $item = MenuItem::create([
            'kitchen_id' => $this->kitchen2->id,
            'name' => 'Chef 2 Special Chowmein',
            'price' => 500.00,
            'is_available' => true,
        ]);

        // Chef 1 attempts to update Chef 2's item
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->putJson("/api/v1/chef/menu/items/{$item->id}", [
                'name' => 'Hacked Item',
                'price' => 10.00,
            ]);

        $response->assertStatus(404);
        $this->assertEquals('Chef 2 Special Chowmein', $item->fresh()->name);
    }
}
