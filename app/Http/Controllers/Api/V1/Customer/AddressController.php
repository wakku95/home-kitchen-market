<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()->customerAddresses()->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'address_text' => ['required', 'string', 'max:500'],
            'area_locality' => ['required', 'string', 'max:150'],
            'landmark' => ['nullable', 'string', 'max:150'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'is_default' => ['boolean'],
        ]);

        $user = $request->user();

        if (! empty($validated['is_default'])) {
            $user->customerAddresses()->update(['is_default' => false]);
        }

        $address = $user->customerAddresses()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Address saved successfully.',
            'data' => $address,
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $address = $request->user()->customerAddresses()->findOrFail($id);
        $address->delete();

        return response()->json([
            'success' => true,
            'message' => 'Address deleted successfully.',
        ]);
    }
}
