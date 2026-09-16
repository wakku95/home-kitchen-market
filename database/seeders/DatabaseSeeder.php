<?php

namespace Database\Seeders;

use App\Models\ChefPaymentMethod;
use App\Models\ChefProfile;
use App\Models\Kitchen;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\RiderProfile;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with rich sample data for manual testing.
     */
    public function run(): void
    {
        // 1. Seed system settings
        SettingsService::seedDefaults();

        // 2. Platform Admin
        User::firstOrCreate(
            ['email' => 'admin@homekitchen.test'],
            [
                'name' => 'Platform Admin',
                'phone' => '03001234567',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_ADMIN,
                'status' => User::STATUS_ACTIVE,
            ]
        );

        // 3. Chef 1 — Platform Rider Kitchen (Saddar, Karachi)
        $chef1 = User::firstOrCreate(
            ['email' => 'chef@homekitchen.test'],
            [
                'name' => 'Fatima Kitchen',
                'phone' => '03002222222',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_CHEF,
                'status' => User::STATUS_ACTIVE,
            ]
        );

        $chef1Profile = ChefProfile::firstOrCreate(
            ['user_id' => $chef1->id],
            [
                'verification_status' => 'verified',
                'verified_at' => now(),
            ]
        );

        $kitchen1 = Kitchen::firstOrCreate(
            ['chef_profile_id' => $chef1Profile->id],
            [
                'name' => 'Fatima Home Delights',
                'slug' => 'fatima-home-delights',
                'description' => 'Authentic Karachi home-cooked biryani, curries, and traditional specialties prepared with organic spices.',
                'cuisine_type' => 'Pakistani & Mughlai',
                'delivery_mode' => Kitchen::DELIVERY_MODE_PLATFORM,
                'is_open' => true,
                'address_text' => 'Flat 402, Al-Noor Heights, Saddar, Karachi',
                'area_locality' => 'Saddar, Karachi',
                'phone_contact' => '03002222222',
                'latitude' => 24.8607,
                'longitude' => 67.0011,
                'delivery_radius_km' => 5.0,
                'minimum_order_amount' => 300,
                'approval_status' => 'approved',
            ]
        );

        // Payment Methods for Chef 1
        ChefPaymentMethod::firstOrCreate(
            ['chef_profile_id' => $chef1Profile->id, 'method_type' => 'easypaisa'],
            [
                'account_title' => 'Fatima Zahra',
                'account_number' => '03002222222',
                'is_active' => true,
            ]
        );

        ChefPaymentMethod::firstOrCreate(
            ['chef_profile_id' => $chef1Profile->id, 'method_type' => 'bank_transfer'],
            [
                'account_title' => 'Fatima Zahra',
                'account_number' => '01234567890123',
                'bank_name' => 'Meezan Bank (Saddar Branch)',
                'is_active' => true,
            ]
        );

        // Menu for Kitchen 1
        $catRice = MenuCategory::firstOrCreate(
            ['kitchen_id' => $kitchen1->id, 'name' => 'Biryani & Rice'],
            ['sort_order' => 1]
        );

        $catCurry = MenuCategory::firstOrCreate(
            ['kitchen_id' => $kitchen1->id, 'name' => 'Traditional Curries'],
            ['sort_order' => 2]
        );

        MenuItem::firstOrCreate(
            ['kitchen_id' => $kitchen1->id, 'name' => 'Special Sindhi Chicken Biryani (Single)'],
            [
                'menu_category_id' => $catRice->id,
                'description' => 'Aromatic basmati rice cooked with tender chicken, potatoes, prunes, and homemade Karachi biryani masala.',
                'price' => 380.00,
                'preparation_time_minutes' => 25,
                'is_available' => true,
                'sort_order' => 1,
            ]
        );

        MenuItem::firstOrCreate(
            ['kitchen_id' => $kitchen1->id, 'name' => 'Mutton Qorma (Degi Style)'],
            [
                'menu_category_id' => $catCurry->id,
                'description' => 'Rich slow-cooked mutton in fragrant yogurt and fried onion gravy with aromatic kewra.',
                'price' => 650.00,
                'preparation_time_minutes' => 30,
                'is_available' => true,
                'sort_order' => 2,
            ]
        );

        // 4. Chef 2 — Own Rider Kitchen (Gulshan-e-Iqbal, Karachi)
        $chef2 = User::firstOrCreate(
            ['email' => 'amna@homekitchen.test'],
            [
                'name' => 'Amna Bakes & Meals',
                'phone' => '03003333333',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_CHEF,
                'status' => User::STATUS_ACTIVE,
            ]
        );

        $chef2Profile = ChefProfile::firstOrCreate(
            ['user_id' => $chef2->id],
            [
                'verification_status' => 'verified',
                'verified_at' => now(),
            ]
        );

        $kitchen2 = Kitchen::firstOrCreate(
            ['chef_profile_id' => $chef2Profile->id],
            [
                'name' => 'Amna Quick Bites & Rolls',
                'slug' => 'amna-quick-bites',
                'description' => 'Fresh handmade paratha rolls and snacks delivered directly by our personal delivery staff.',
                'cuisine_type' => 'Fast Food & Rolls',
                'delivery_mode' => Kitchen::DELIVERY_MODE_OWN,
                'is_open' => true,
                'address_text' => 'House 12, Block 5, Gulshan-e-Iqbal, Karachi',
                'area_locality' => 'Gulshan-e-Iqbal, Karachi',
                'phone_contact' => '03003333333',
                'latitude' => 24.9200,
                'longitude' => 67.0900,
                'delivery_radius_km' => 4.0,
                'minimum_order_amount' => 250,
                'approval_status' => 'approved',
            ]
        );

        ChefPaymentMethod::firstOrCreate(
            ['chef_profile_id' => $chef2Profile->id, 'method_type' => 'jazzcash'],
            [
                'account_title' => 'Amna Tariq',
                'account_number' => '03003333333',
                'is_active' => true,
            ]
        );

        $catRolls = MenuCategory::firstOrCreate(
            ['kitchen_id' => $kitchen2->id, 'name' => 'Paratha Rolls'],
            ['sort_order' => 1]
        );

        MenuItem::firstOrCreate(
            ['kitchen_id' => $kitchen2->id, 'name' => 'Chicken Chatpata Roll'],
            [
                'menu_category_id' => $catRolls->id,
                'description' => 'Crispy flaky paratha loaded with spicy BBQ chicken cubes, onions, and mint chutney.',
                'price' => 260.00,
                'preparation_time_minutes' => 15,
                'is_available' => true,
                'sort_order' => 1,
            ]
        );

        // 5. Rider 1 (Close to Saddar — ~1.4 km)
        $rider1 = User::firstOrCreate(
            ['email' => 'rider@homekitchen.test'],
            [
                'name' => 'Rider Ali',
                'phone' => '03004444444',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_RIDER,
                'status' => User::STATUS_ACTIVE,
            ]
        );

        RiderProfile::firstOrCreate(
            ['user_id' => $rider1->id],
            [
                'vehicle_type' => 'motorcycle',
                'vehicle_number' => 'KHI-7890',
                'approval_status' => RiderProfile::APPROVAL_APPROVED,
                'availability_status' => RiderProfile::AVAILABILITY_AVAILABLE,
                'current_latitude' => 24.8700,
                'current_longitude' => 67.0100,
                'location_updated_at' => now(),
            ]
        );

        // 6. Rider 2 (Further away — ~3.8 km)
        $rider2 = User::firstOrCreate(
            ['email' => 'rider2@homekitchen.test'],
            [
                'name' => 'Rider Bilal',
                'phone' => '03005555555',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_RIDER,
                'status' => User::STATUS_ACTIVE,
            ]
        );

        RiderProfile::firstOrCreate(
            ['user_id' => $rider2->id],
            [
                'vehicle_type' => 'motorcycle',
                'vehicle_number' => 'KHI-3456',
                'approval_status' => RiderProfile::APPROVAL_APPROVED,
                'availability_status' => RiderProfile::AVAILABILITY_AVAILABLE,
                'current_latitude' => 24.8900,
                'current_longitude' => 67.0200,
                'location_updated_at' => now(),
            ]
        );

        // 7. Customer
        User::firstOrCreate(
            ['email' => 'customer@homekitchen.test'],
            [
                'name' => 'Hassan Customer',
                'phone' => '03006666666',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_CUSTOMER,
                'status' => User::STATUS_ACTIVE,
            ]
        );
    }
}
