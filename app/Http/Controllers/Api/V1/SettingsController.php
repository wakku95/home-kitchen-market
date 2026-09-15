<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Publicly accessible general settings (e.g. delivery fee bands and radii)
     */
    public function publicSettings(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'delivery_radius_preferred_km' => (float) SettingsService::get('delivery_radius_preferred_km', 3.0),
                'delivery_radius_max_km' => (float) SettingsService::get('delivery_radius_max_km', 5.0),
                'delivery_fee_0_3_km' => (float) SettingsService::get('delivery_fee_0_3_km', 150),
                'delivery_fee_3_5_km' => (float) SettingsService::get('delivery_fee_3_5_km', 200),
                'currency' => 'PKR',
            ],
        ]);
    }

    /**
     * Admin view of all system settings
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => SettingsService::all(),
        ]);
    }

    /**
     * Admin update of system settings
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string'],
            'settings.*.value' => ['required'],
        ]);

        foreach ($validated['settings'] as $item) {
            SettingsService::set($item['key'], $item['value']);
        }

        AuditService::log('settings.updated', null, [
            'updated_keys' => array_column($validated['settings'], 'key'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully.',
            'data' => SettingsService::all(),
        ]);
    }
}
