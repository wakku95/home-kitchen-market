<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register_successfully(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Customer',
            'email' => 'customer@example.com',
            'phone' => '03001112233',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => User::ROLE_CUSTOMER,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'customer@example.com',
                        'role' => User::ROLE_CUSTOMER,
                        'status' => User::STATUS_ACTIVE,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.com',
            'role' => User::ROLE_CUSTOMER,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.registered',
        ]);
    }

    public function test_chef_and_rider_can_register(): void
    {
        $chefResp = $this->postJson('/api/v1/auth/register', [
            'name' => 'Chef Fatima',
            'email' => 'fatima@kitchen.test',
            'phone' => '03004445566',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => User::ROLE_CHEF,
        ]);
        $chefResp->assertStatus(201);

        $riderResp = $this->postJson('/api/v1/auth/register', [
            'name' => 'Rider Tariq',
            'email' => 'tariq@rider.test',
            'phone' => '03007778899',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => User::ROLE_RIDER,
        ]);
        $riderResp->assertStatus(201);
    }

    public function test_registration_rejects_admin_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Fake Admin',
            'email' => 'fakeadmin@test.com',
            'phone' => '03000000000',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => User::ROLE_ADMIN,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_user_can_login_with_email(): void
    {
        $user = User::factory()->create([
            'email' => 'ali@example.com',
            'phone' => '03112233445',
            'password' => bcrypt('secret123'),
            'role' => User::ROLE_CUSTOMER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'ali@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'ali@example.com',
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_user_can_login_with_phone(): void
    {
        User::factory()->create([
            'email' => 'phoneuser@example.com',
            'phone' => '03221234567',
            'password' => bcrypt('secret123'),
            'role' => User::ROLE_CUSTOMER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => '03221234567',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'phoneuser@example.com',
                    ],
                ],
            ]);
    }

    public function test_suspended_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'suspended@example.com',
            'phone' => '03339998877',
            'password' => bcrypt('secret123'),
            'status' => User::STATUS_SUSPENDED,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Your account has been suspended. Please contact platform support.',
            ]);
    }

    public function test_authenticated_user_can_access_me_and_logout(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $meResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                    ],
                ],
            ]);

        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }
}
