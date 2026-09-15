<?php

namespace Tests\Feature;

use App\Models\DeliveryAssignment;
use App\Models\Kitchen;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\RiderProfile;
use App\Models\User;
use App\Services\OrderService;
use App\Services\OrderStateService;
use App\Services\RiderMatchingService;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RiderDispatchAndConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    protected User $chef;
    protected Kitchen $kitchen;
    protected MenuItem $menuItem;
    protected User $customer;
    protected User $riderA;
    protected User $riderB;
    protected RiderProfile $profileA;
    protected RiderProfile $profileB;

    protected function setUp(): void
    {
        parent::setUp();
        SettingsService::seedDefaults();

        // 1. Chef with platform_rider kitchen at Karachi center (24.8607, 67.0011)
        $this->chef = User::factory()->create([
            'role' => User::ROLE_CHEF,
            'status' => User::STATUS_ACTIVE,
        ]);
        $chefProfile = $this->chef->chefProfile()->create(['verification_status' => 'verified']);
        $this->kitchen = $chefProfile->kitchen()->create([
            'name' => 'Biryani Central',
            'slug' => 'biryani-central',
            'cuisine_type' => 'Pakistani',
            'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
            'is_open' => true,
            'address_text' => 'Street 10, Saddar, Karachi',
            'phone_contact' => '03009999999',
            'area_locality' => 'Saddar, Karachi',
            'latitude' => 24.8607,
            'longitude' => 67.0011,
            'delivery_radius_km' => 5.0,
            'min_order_amount' => 200,
        ]);

        $this->menuItem = MenuItem::create([
            'kitchen_id' => $this->kitchen->id,
            'name' => 'Chicken Biryani',
            'price' => 350.00,
            'preparation_time_minutes' => 30,
            'is_available' => true,
        ]);

        // 2. Customer
        $this->customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'status' => User::STATUS_ACTIVE,
            'phone' => '03001111111',
        ]);

        // 3. Rider A: 1.5 km away from kitchen (closer)
        $this->riderA = User::factory()->create([
            'role' => User::ROLE_RIDER,
            'name' => 'Rider Ali',
            'status' => User::STATUS_ACTIVE,
        ]);
        $this->profileA = RiderProfile::create([
            'user_id' => $this->riderA->id,
            'approval_status' => RiderProfile::APPROVAL_APPROVED,
            'availability_status' => RiderProfile::AVAILABILITY_AVAILABLE,
            'current_latitude' => 24.8700,
            'current_longitude' => 67.0100, // ~1.4 km
        ]);

        // 4. Rider B: 3.5 km away from kitchen (further)
        $this->riderB = User::factory()->create([
            'role' => User::ROLE_RIDER,
            'name' => 'Rider Bilal',
            'status' => User::STATUS_ACTIVE,
        ]);
        $this->profileB = RiderProfile::create([
            'user_id' => $this->riderB->id,
            'approval_status' => RiderProfile::APPROVAL_APPROVED,
            'availability_status' => RiderProfile::AVAILABILITY_AVAILABLE,
            'current_latitude' => 24.8900,
            'current_longitude' => 67.0200, // ~3.8 km
        ]);
    }

    public function test_sequential_dispatch_offers_to_closest_rider_first(): void
    {
        // Place an order for platform rider
        $order = OrderService::createOrder($this->customer, [
            'kitchen_id' => $this->kitchen->id,
            'items' => [['item_id' => $this->menuItem->id, 'quantity' => 1]],
            'delivery_address_text' => 'Garden East, Karachi',
            'delivery_area' => 'Garden East',
            'delivery_latitude' => 24.8720,
            'delivery_longitude' => 67.0220,
        ]);

        // Chef accepts order -> transitions to FINDING_RIDER
        OrderStateService::transition($order, Order::STATUS_CHEF_ACCEPTED, $this->chef);
        OrderStateService::transition($order, Order::STATUS_FINDING_RIDER, $this->chef);

        // Dispatch
        $assignment = RiderMatchingService::dispatchOrder($order);

        $this->assertNotNull($assignment);
        $this->assertEquals($this->riderA->id, $assignment->rider_id); // Rider A is closer than B
        $this->assertEquals(DeliveryAssignment::STATUS_OFFERED, $assignment->status);

        // Check that Rider A profile is set to OFFERED
        $this->profileA->refresh();
        $this->assertEquals(RiderProfile::AVAILABILITY_OFFERED, $this->profileA->availability_status);

        // Check that Rider B remains AVAILABLE
        $this->profileB->refresh();
        $this->assertEquals(RiderProfile::AVAILABILITY_AVAILABLE, $this->profileB->availability_status);
    }

    public function test_rejection_falls_back_sequentially_to_next_nearest_rider(): void
    {
        $order = OrderService::createOrder($this->customer, [
            'kitchen_id' => $this->kitchen->id,
            'items' => [['item_id' => $this->menuItem->id, 'quantity' => 1]],
            'delivery_address_text' => 'Garden East, Karachi',
            'delivery_area' => 'Garden East',
            'delivery_latitude' => 24.8720,
            'delivery_longitude' => 67.0220,
        ]);

        OrderStateService::transition($order, Order::STATUS_CHEF_ACCEPTED, $this->chef);
        OrderStateService::transition($order, Order::STATUS_FINDING_RIDER, $this->chef);

        $firstAssignment = RiderMatchingService::dispatchOrder($order);
        $this->assertEquals($this->riderA->id, $firstAssignment->rider_id);

        // Rider A rejects offer
        $nextAssignment = RiderMatchingService::rejectOffer($firstAssignment->id, $this->riderA, 'Flat tire');

        // Rider A is now freed back to AVAILABLE
        $this->profileA->refresh();
        $this->assertEquals(RiderProfile::AVAILABILITY_AVAILABLE, $this->profileA->availability_status);

        // Next assignment is dispatched to Rider B
        $this->assertNotNull($nextAssignment);
        $this->assertEquals($this->riderB->id, $nextAssignment->rider_id);
        $this->assertEquals(DeliveryAssignment::STATUS_OFFERED, $nextAssignment->status);

        $this->profileB->refresh();
        $this->assertEquals(RiderProfile::AVAILABILITY_OFFERED, $this->profileB->availability_status);
    }

    public function test_when_all_riders_reject_order_transitions_to_no_rider_found(): void
    {
        $order = OrderService::createOrder($this->customer, [
            'kitchen_id' => $this->kitchen->id,
            'items' => [['item_id' => $this->menuItem->id, 'quantity' => 1]],
            'delivery_address_text' => 'Garden East, Karachi',
            'delivery_area' => 'Garden East',
            'delivery_latitude' => 24.8720,
            'delivery_longitude' => 67.0220,
        ]);

        OrderStateService::transition($order, Order::STATUS_CHEF_ACCEPTED, $this->chef);
        OrderStateService::transition($order, Order::STATUS_FINDING_RIDER, $this->chef);

        $firstAssignment = RiderMatchingService::dispatchOrder($order);
        $secondAssignment = RiderMatchingService::rejectOffer($firstAssignment->id, $this->riderA);

        // Rider B rejects offer
        $thirdAssignment = RiderMatchingService::rejectOffer($secondAssignment->id, $this->riderB);

        $this->assertNull($thirdAssignment);

        // Order has no more candidate riders, transitions to NO_RIDER_FOUND
        $order->refresh();
        $this->assertEquals(Order::STATUS_NO_RIDER_FOUND, $order->status);
    }

    public function test_rider_can_accept_offer_atomically_locking_order_and_rider(): void
    {
        $order = OrderService::createOrder($this->customer, [
            'kitchen_id' => $this->kitchen->id,
            'items' => [['item_id' => $this->menuItem->id, 'quantity' => 1]],
            'delivery_address_text' => 'Garden East, Karachi',
            'delivery_area' => 'Garden East',
            'delivery_latitude' => 24.8720,
            'delivery_longitude' => 67.0220,
        ]);

        OrderStateService::transition($order, Order::STATUS_CHEF_ACCEPTED, $this->chef);
        OrderStateService::transition($order, Order::STATUS_FINDING_RIDER, $this->chef);

        $assignment = RiderMatchingService::dispatchOrder($order);

        // Rider A accepts
        $updatedOrder = RiderMatchingService::acceptOffer($assignment->id, $this->riderA);

        // Verify assignment status
        $assignment->refresh();
        $this->assertEquals(DeliveryAssignment::STATUS_ACCEPTED, $assignment->status);

        // Verify rider status is BUSY
        $this->profileA->refresh();
        $this->assertEquals(RiderProfile::AVAILABILITY_BUSY, $this->profileA->availability_status);

        // Verify order is assigned to rider and moved to AWAITING_CUSTOMER_PAYMENT
        $updatedOrder->refresh();
        $this->assertEquals($this->riderA->id, $updatedOrder->assigned_rider_id);
        $this->assertEquals(Order::STATUS_AWAITING_CUSTOMER_PAYMENT, $updatedOrder->status);
    }

    public function test_expired_offer_is_rejected_and_rider_cannot_accept_it(): void
    {
        $order = OrderService::createOrder($this->customer, [
            'kitchen_id' => $this->kitchen->id,
            'items' => [['item_id' => $this->menuItem->id, 'quantity' => 1]],
            'delivery_address_text' => 'Garden East, Karachi',
            'delivery_area' => 'Garden East',
            'delivery_latitude' => 24.8720,
            'delivery_longitude' => 67.0220,
        ]);

        OrderStateService::transition($order, Order::STATUS_CHEF_ACCEPTED, $this->chef);
        OrderStateService::transition($order, Order::STATUS_FINDING_RIDER, $this->chef);

        $assignment = RiderMatchingService::dispatchOrder($order);

        // Expire the offer artificially
        $assignment->update(['expires_at' => now()->subMinute()]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('This delivery offer has expired.');

        RiderMatchingService::acceptOffer($assignment->id, $this->riderA);
    }

    public function test_own_rider_order_is_never_dispatched_to_platform_riders(): void
    {
        // Update kitchen to own rider
        $this->kitchen->update(['delivery_mode' => Kitchen::DELIVERY_MODE_OWN]);

        $order = OrderService::createOrder($this->customer, [
            'kitchen_id' => $this->kitchen->id,
            'items' => [['item_id' => $this->menuItem->id, 'quantity' => 1]],
            'delivery_address_text' => 'Garden East, Karachi',
            'delivery_area' => 'Garden East',
            'delivery_latitude' => 24.8720,
            'delivery_longitude' => 67.0220,
        ]);

        $this->assertTrue($order->isOwnRider());

        // Dispatch should return null immediately
        $assignment = RiderMatchingService::dispatchOrder($order);
        $this->assertNull($assignment);
    }

    public function test_rider_unable_to_deliver_reassigns_order(): void
    {
        $order = OrderService::createOrder($this->customer, [
            'kitchen_id' => $this->kitchen->id,
            'items' => [['item_id' => $this->menuItem->id, 'quantity' => 1]],
            'delivery_address_text' => 'Garden East, Karachi',
            'delivery_area' => 'Garden East',
            'delivery_latitude' => 24.8720,
            'delivery_longitude' => 67.0220,
        ]);

        OrderStateService::transition($order, Order::STATUS_CHEF_ACCEPTED, $this->chef);
        OrderStateService::transition($order, Order::STATUS_FINDING_RIDER, $this->chef);

        $assignment = RiderMatchingService::dispatchOrder($order);
        RiderMatchingService::acceptOffer($assignment->id, $this->riderA);

        // Rider A reports unable to deliver before pickup
        $reassigned = RiderMatchingService::unableToDeliver($order, $this->riderA, 'Bike broke down');

        // Rider A is freed
        $this->profileA->refresh();
        $this->assertEquals(RiderProfile::AVAILABILITY_AVAILABLE, $this->profileA->availability_status);

        // Order was dispatched to Rider B
        $secondAssignment = DeliveryAssignment::where('order_id', $order->id)
            ->where('rider_id', $this->riderB->id)
            ->first();

        $this->assertNotNull($secondAssignment);
        $this->assertEquals(DeliveryAssignment::STATUS_OFFERED, $secondAssignment->status);
    }
}
