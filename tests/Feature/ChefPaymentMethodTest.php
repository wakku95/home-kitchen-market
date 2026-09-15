<?php

namespace Tests\Feature;

use App\Models\ChefPaymentMethod;
use App\Models\ChefProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChefPaymentMethodTest extends TestCase
{
    use RefreshDatabase;

    protected User $chef1;
    protected string $token1;
    protected ChefProfile $profile1;

    protected User $chef2;
    protected string $token2;
    protected ChefProfile $profile2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->chef1 = User::factory()->create(['role' => User::ROLE_CHEF, 'status' => User::STATUS_ACTIVE]);
        $this->token1 = $this->chef1->createToken('token1')->plainTextToken;
        $this->profile1 = ChefProfile::create(['user_id' => $this->chef1->id]);

        $this->chef2 = User::factory()->create(['role' => User::ROLE_CHEF, 'status' => User::STATUS_ACTIVE]);
        $this->token2 = $this->chef2->createToken('token2')->plainTextToken;
        $this->profile2 = ChefProfile::create(['user_id' => $this->chef2->id]);
    }

    public function test_chef_can_add_valid_payment_methods(): void
    {
        $allowed = [
            ['type' => 'jazzcash', 'title' => 'Ali Khan', 'number' => '03001234567'],
            ['type' => 'easypaisa', 'title' => 'Ali Khan', 'number' => '03001234567'],
            ['type' => 'bank_transfer', 'title' => 'Ali Khan', 'number' => 'PK12MEZN0001234567890123', 'bank' => 'Meezan Bank'],
            ['type' => 'raast', 'title' => 'Ali Khan', 'number' => '03001234567'],
        ];

        foreach ($allowed as $m) {
            $response = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
                ->postJson('/api/v1/chef/payment-methods', [
                    'method_type' => $m['type'],
                    'account_title' => $m['title'],
                    'account_number' => $m['number'],
                    'bank_name' => $m['bank'] ?? null,
                ]);

            $response->assertStatus(201)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'method_type' => $m['type'],
                        'account_title' => $m['title'],
                        'verification_status' => 'pending',
                    ],
                ]);
        }
    }

    public function test_cash_payment_method_is_strictly_rejected(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson('/api/v1/chef/payment-methods', [
                'method_type' => 'cash', // COD rejected in MVP
                'account_title' => 'Cash in Hand',
                'account_number' => 'N/A',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['method_type']);
    }

    public function test_chef_cannot_delete_other_chefs_payment_method(): void
    {
        $method = ChefPaymentMethod::create([
            'chef_profile_id' => $this->profile2->id,
            'method_type' => 'jazzcash',
            'account_title' => 'Chef 2 Account',
            'account_number' => '03112233445',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->deleteJson("/api/v1/chef/payment-methods/{$method->id}");

        $response->assertStatus(404);
        $this->assertDatabaseHas('chef_payment_methods', ['id' => $method->id]);
    }
}
