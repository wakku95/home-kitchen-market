<?php

namespace App\Http\Controllers\Api\V1\Chef;

use App\Http\Controllers\Controller;
use App\Models\ChefProfile;
use App\Models\Kitchen;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class KitchenController extends Controller
{
    /**
     * Get or create the chef profile for the authenticated user.
     */
    protected function getChefProfile(Request $request): ChefProfile
    {
        return ChefProfile::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['verification_status' => ChefProfile::STATUS_PENDING]
        );
    }

    public function show(Request $request): JsonResponse
    {
        $chefProfile = $this->getChefProfile($request);
        $kitchen = $chefProfile->kitchen()->with(['categories.items'])->first();

        return response()->json([
            'success' => true,
            'data' => [
                'chef_profile' => [
                    'id' => $chefProfile->id,
                    'verification_status' => $chefProfile->verification_status,
                    'verified_at' => $chefProfile->verified_at,
                ],
                'kitchen' => $kitchen,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $chefProfile = $this->getChefProfile($request);

        if ($chefProfile->kitchen()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a registered kitchen. MVP supports one kitchen per chef.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'cuisine_type' => ['required', 'string', 'max:100'],
            'phone_contact' => ['required', 'string', 'max:20'],
            'operating_days' => ['nullable', 'array'],
            'opening_time' => ['nullable', 'string', 'max:10'],
            'closing_time' => ['nullable', 'string', 'max:10'],
            'is_open' => ['boolean'],
            'minimum_order_amount' => ['numeric', 'min:0'],
            'delivery_radius_km' => ['numeric', 'min:0.5', 'max:10'],
            'delivery_mode' => ['required', 'string', Rule::in([Kitchen::DELIVERY_MODE_PLATFORM, Kitchen::DELIVERY_MODE_OWN])],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'address_text' => ['required', 'string', 'max:500'],
            'area_locality' => ['required', 'string', 'max:150'],
            'landmark' => ['nullable', 'string', 'max:150'],
        ]);

        $kitchen = $chefProfile->kitchen()->create(array_merge($validated, [
            'approval_status' => Kitchen::STATUS_APPROVED, // Auto-approved for MVP demo or pending
        ]));

        AuditService::log('chef.kitchen_created', $kitchen, [
            'kitchen_id' => $kitchen->id,
            'delivery_mode' => $kitchen->delivery_mode,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kitchen created successfully.',
            'data' => $kitchen,
        ], 201);
    }

    public function update(Request $request): JsonResponse
    {
        $chefProfile = $this->getChefProfile($request);
        $kitchen = $chefProfile->kitchen;

        if (! $kitchen) {
            return response()->json([
                'success' => false,
                'message' => 'Kitchen not found. Please create your kitchen first.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'cuisine_type' => ['sometimes', 'required', 'string', 'max:100'],
            'phone_contact' => ['sometimes', 'required', 'string', 'max:20'],
            'operating_days' => ['nullable', 'array'],
            'opening_time' => ['nullable', 'string', 'max:10'],
            'closing_time' => ['nullable', 'string', 'max:10'],
            'is_open' => ['boolean'],
            'minimum_order_amount' => ['numeric', 'min:0'],
            'delivery_radius_km' => ['numeric', 'min:0.5', 'max:10'],
            'delivery_mode' => ['sometimes', 'required', 'string', Rule::in([Kitchen::DELIVERY_MODE_PLATFORM, Kitchen::DELIVERY_MODE_OWN])],
            'latitude' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'address_text' => ['sometimes', 'required', 'string', 'max:500'],
            'area_locality' => ['sometimes', 'required', 'string', 'max:150'],
            'landmark' => ['nullable', 'string', 'max:150'],
        ]);

        $kitchen->update($validated);

        AuditService::log('chef.kitchen_updated', $kitchen, [
            'delivery_mode' => $kitchen->delivery_mode,
            'is_open' => $kitchen->is_open,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kitchen updated successfully.',
            'data' => $kitchen,
        ]);
    }
}
