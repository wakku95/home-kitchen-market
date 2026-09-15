<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed default system settings
        SettingsService::seedDefaults();

        // Seed default platform Admin
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
    }
}
