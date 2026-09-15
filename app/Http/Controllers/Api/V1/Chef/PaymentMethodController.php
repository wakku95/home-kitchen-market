<?php

namespace App\Http\Controllers\Api\V1\Chef;

use App\Http\Controllers\Controller;
use App\Models\ChefPaymentMethod;
use App\Models\ChefProfile;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentMethodController extends Controller
{
    protected function getChefProfile(Request $request): ChefProfile
    {
        return ChefProfile::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['verification_status' => ChefProfile::STATUS_PENDING]
        );
    }

    public function index(Request $request): JsonResponse
    {
        $chefProfile = $this->getChefProfile($request);
        $methods = $chefProfile->paymentMethods()->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $methods,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $chefProfile = $this->getChefProfile($request);

        $validated = $request->validate([
            'method_type' => ['required', 'string', Rule::in(ChefPaymentMethod::ALLOWED_METHODS)],
            'account_title' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:100'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'instructions' => ['nullable', 'string', 'max:500'],
        ]);

        $paymentMethod = $chefProfile->paymentMethods()->create(array_merge($validated, [
            'is_active' => true,
            'verification_status' => ChefPaymentMethod::STATUS_PENDING,
        ]));

        AuditService::log('chef.payment_method_added', $paymentMethod, [
            'method_type' => $paymentMethod->method_type,
            'account_title' => $paymentMethod->account_title,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment method added successfully. It will be verified by admin.',
            'data' => $paymentMethod,
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $chefProfile = $this->getChefProfile($request);
        $method = $chefProfile->paymentMethods()->findOrFail($id);

        $method->delete();

        AuditService::log('chef.payment_method_deleted', null, [
            'method_id' => $id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment method removed successfully.',
        ]);
    }

    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $chefProfile = $this->getChefProfile($request);
        $method = $chefProfile->paymentMethods()->findOrFail($id);

        $method->is_active = ! $method->is_active;
        $method->save();

        return response()->json([
            'success' => true,
            'message' => 'Payment method status updated.',
            'data' => $method,
        ]);
    }
}
