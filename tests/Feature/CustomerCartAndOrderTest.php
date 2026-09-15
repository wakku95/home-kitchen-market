<?php

namespace Tests\Feature;

use App\Models\ChefProfile;
use App\Models\CustomerAddress;
use App\Models\Kitchen;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerCartAndOrderTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected string $customerToken;

    protected User $otherCustomer;
    protected string $otherCustomerToken;

    protected Kitchen $platformKitchen;
    protected MenuItem $item1;
    protected MenuItem $item2;

    protected Kitchen $ownRiderKitchen;
    protected MenuItem $ownItem;

    protected function setUp(): void
    {
        parent::setUp();
        SettingsService::seedDefaults();

        $this->customer = User::factory()->create(['role' => User::ROLE_CUSTOMER, 'phone' => '03001112233', 'status' => User::STATUS_ACTIVE]);
        $this->customerToken = $this->customer->createToken('cust_token')->plainTextToken;

        $this->otherCustomer = User::factory()->create(['role' => User::ROLE_CUSTOMER, 'phone' => '03004445566', 'status' => User::STATUS_ACTIVE]);
        $this->otherCustomerToken = $this->otherCustomer->createToken('other_token')->plainTextToken;

        // 1. Platform Kitchen at Saddar, Karachi (24.8565, 67.0175)
        $chef1 = User::factory()->create(['role' => User::ROLE_CHEF]);
        $profile1 = ChefProfile::create(['user_id' => $chef1->id]);
        $this->platformKitchen = Kitchen::create([
            'chef_profile_id' => $profile1->id,
            'name' => 'Biryani Central',
            'slug' => 'biryani-central',
            'cuisine_type' => 'Pakistani',
            'phone_contact' => '03001234567',
            'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
            'latitude' => 24.8565,
            'longitude' => 67.0175,
            'address_text' => 'Saddar Street',
            'area_locality' => 'Saddar, Karachi',
            'delivery_radius_km' => 5.0,
            'minimum_order_amount' => 300.00,
            'is_open' => true,
            'approval_status' => Kitchen::STATUS_APPROVED,
        ]);

        $this->item1 = MenuItem::create([
            'kitchen_id' => $this->platformKitchen->id,
            'name' => 'Chicken Biryani',
            'price' => 400.00,
            'is_available' => true,
        ]);

        $this->item2 = MenuItem::create([
            'kitchen_id' => $this->platformKitchen->id,
            'name' => 'Shami Kabab',
            'price' => 100.00,
            'is_available' => true,
        ]);

        // 2. Own Rider Kitchen at Gulshan (24.9100, 67.0800)
        $chef2 = User::factory()->create(['role' => User::ROLE_CHEF]);
        $profile2 = ChefProfile::create(['user_id' => $chef2->id]);
        $this->ownRiderKitchen = Kitchen::create([
            'chef_profile_id' => $profile2->id,
            'name' => 'Aunty Home Bakes',
            'slug' => 'aunty-home-bakes',
            'cuisine_type' => 'Baking',
            'phone_contact' => '03009998877',
            'delivery_mode' => Kitchen::DELIVERY_MODE_OWN,
            'latitude' => 24.9100,
            'longitude' => 67.0800,
            'address_text' => 'Gulshan Block 3',
            'area_locality' => 'Gulshan, Karachi',
            'delivery_radius_km' => 5.0,
            'minimum_order_amount' => 200.00,
            'is_open' => true,
            'approval_status' => Kitchen::STATUS_APPROVED,
        ]);

        $this->ownItem = MenuItem::create([
            'kitchen_id' => $this->ownRiderKitchen->id,
            'name' => 'Chocolate Fudge Cake',
            'price' => 800.00,
            'is_available' => true,
        ]);
    }

    public function test_order_estimation_calculates_server_pricing_and_delivery_fee(): void
    {
        // Address ~2 km from Saddar (24.8450, 67.0250)
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders/estimate', [
                'kitchen_id' => $this->platformKitchen->id,
                'items' => [
                    ['item_id' => $this->item1->id, 'quantity' => 2], // 2 x 400 = 800
                    ['item_id' => $this->item2->id, 'quantity' => 1], // 1 x 100 = 100
                ],
                'delivery_latitude' => 24.8450,
                'delivery_longitude' => 67.0250,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'subtotal' => 900.00,
                    'delivery_fee' => 150.00, // 0-3 km band
                    'total' => 1050.00,
                    'delivery_fee_status' => 'PENDING',
                ],
            ]);
    }

    public function test_estimation_rejects_items_from_different_kitchens(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders/estimate', [
                'kitchen_id' => $this->platformKitchen->id,
                'items' => [
                    ['item_id' => $this->item1->id, 'quantity' => 1],
                    ['item_id' => $this->ownItem->id, 'quantity' => 1], // Belongs to different kitchen!
                ],
                'delivery_latitude' => 24.8450,
                'delivery_longitude' => 67.0250,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => "All items in an order must be from the same kitchen (Biryani Central).",
            ]);
    }

    public function test_estimation_rejects_delivery_outside_radius(): void
    {
        // Far point ~15 km away in Malir (24.8900, 67.2000)
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders/estimate', [
                'kitchen_id' => $this->platformKitchen->id,
                'items' => [
                    ['item_id' => $this->item1->id, 'quantity' => 1],
                ],
                'delivery_latitude' => 24.8900,
                'delivery_longitude' => 67.2000,
            ]);

        $response->assertStatus(422);
    }

    public function test_customer_can_create_order_for_platform_rider_kitchen(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders', [
                'kitchen_id' => $this->platformKitchen->id,
                'items' => [
                    ['item_id' => $this->item1->id, 'quantity' => 1],
                ],
                'delivery_address_text' => 'Flat 4B, Clifton Block 2',
                'delivery_area' => 'Clifton, Karachi',
                'delivery_latitude' => 24.8450,
                'delivery_longitude' => 67.0250,
                'customer_phone' => '03001112233',
                'customer_notes' => 'Ring bell twice',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'PENDING',
                    'delivery_mode' => 'platform_rider',
                    'subtotal' => '400.00',
                    'delivery_fee' => '150.00',
                    'total' => '550.00',
                    'delivery_fee_status' => 'PENDING',
                ],
            ]);

        $orderNumber = $response->json('data.order_number');
        $this->assertDatabaseHas('orders', [
            'order_number' => $orderNumber,
            'delivery_mode' => 'platform_rider',
            'status' => 'PENDING',
        ]);
        $this->assertDatabaseHas('order_status_histories', [
            'to_status' => 'PENDING',
        ]);
    }

    public function test_customer_can_create_order_for_own_rider_kitchen_with_zero_platform_fee(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders', [
                'kitchen_id' => $this->ownRiderKitchen->id,
                'items' => [
                    ['item_id' => $this->ownItem->id, 'quantity' => 1],
                ],
                'delivery_address_text' => 'House 55, Gulshan Block 2',
                'delivery_area' => 'Gulshan, Karachi',
                'delivery_latitude' => 24.9120,
                'delivery_longitude' => 67.0820,
                'customer_phone' => '03001112233',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'PENDING',
                    'delivery_mode' => 'own_rider',
                    'subtotal' => '800.00',
                    'delivery_fee' => '0.00',
                    'total' => '800.00',
                    'delivery_fee_status' => 'NOT_APPLICABLE',
                ],
            ]);
    }

    public function test_snapshot_protection_order_mode_remains_unchanged_if_kitchen_mode_changes_later(): void
    {
        // 1. Order placed when kitchen was platform_rider
        $resp = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders', [
                'kitchen_id' => $this->platformKitchen->id,
                'items' => [['item_id' => $this->item1->id, 'quantity' => 1]],
                'delivery_address_text' => 'Address 1',
                'delivery_area' => 'Saddar',
                'delivery_latitude' => 24.8500,
                'delivery_longitude' => 67.0200,
            ]);

        $orderId = $resp->json('data.id');
        $this->assertEquals('platform_rider', $resp->json('data.delivery_mode'));

        // 2. Chef changes kitchen setting tomorrow to own_rider
        $this->platformKitchen->update(['delivery_mode' => Kitchen::DELIVERY_MODE_OWN]);
        $this->assertEquals(Kitchen::DELIVERY_MODE_OWN, $this->platformKitchen->fresh()->delivery_mode);

        // 3. Existing order MUST still be platform_rider
        $existingOrder = Order::find($orderId);
        $this->assertEquals(Order::DELIVERY_MODE_PLATFORM, $existingOrder->delivery_mode);
    }

    public function test_customer_cannot_view_another_customers_order(): void
    {
        $resp = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders', [
                'kitchen_id' => $this->platformKitchen->id,
                'items' => [['item_id' => $this->item1->id, 'quantity' => 1]],
                'delivery_address_text' => 'Address 1',
                'delivery_area' => 'Saddar',
                'delivery_latitude' => 24.8500,
                'delivery_longitude' => 67.0200,
            ]);

        $resp->assertStatus(201);
        $orderNumber = $resp->json('data.order_number');

        // Other customer attempts to view
        \Illuminate\Support\Facades\Auth::forgetGuards();
        $forbiddenResp = $this->withHeader('Authorization', 'Bearer ' . $this->otherCustomerToken)
            ->getJson("/api/v1/customer/orders/{$orderNumber}");

        $forbiddenResp->assertStatus(404);
    }

    public function test_customer_can_cancel_pending_order(): void
    {
        $resp = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson('/api/v1/customer/orders', [
                'kitchen_id' => $this->platformKitchen->id,
                'items' => [['item_id' => $this->item1->id, 'quantity' => 1]],
                'delivery_address_text' => 'Address 1',
                'delivery_area' => 'Saddar',
                'delivery_latitude' => 24.8500,
                'delivery_longitude' => 67.0200,
            ]);

        $orderNumber = $resp->json('data.order_number');

        $cancelResp = $this->withHeader('Authorization', 'Bearer ' . $this->customerToken)
            ->postJson("/api/v1/customer/orders/{$orderNumber}/cancel", [
                'reason' => 'Changed my mind',
            ]);

        $cancelResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'CUSTOMER_CANCELLED',
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'order_number' => $orderNumber,
            'status' => 'CUSTOMER_CANCELLED',
        ]);
    }
}
