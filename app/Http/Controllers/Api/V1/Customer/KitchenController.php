<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Kitchen;
use App\Services\DistanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KitchenController extends Controller
{
    /**
     * Public search and discovery of approved active kitchens.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Kitchen::query()->approved()->open();

        if ($request->filled('q')) {
            $term = '%' . $request->q . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('cuisine_type', 'like', $term)
                  ->orWhere('area_locality', 'like', $term);
            });
        }

        if ($request->filled('cuisine')) {
            $query->where('cuisine_type', $request->cuisine);
        }

        if ($request->filled('area')) {
            $query->where('area_locality', $request->area);
        }

        $kitchens = $query->latest()->get();

        $userLat = $request->filled('lat') ? (float) $request->lat : null;
        $userLng = $request->filled('lng') ? (float) $request->lng : null;

        $results = $kitchens->map(function ($kitchen) use ($userLat, $userLng) {
            $distanceKm = null;
            if ($userLat !== null && $userLng !== null && $kitchen->latitude && $kitchen->longitude) {
                $distanceKm = DistanceService::calculateDistance(
                    $userLat,
                    $userLng,
                    (float) $kitchen->latitude,
                    (float) $kitchen->longitude
                );
            }

            return [
                'id' => $kitchen->id,
                'name' => $kitchen->name,
                'slug' => $kitchen->slug,
                'description' => $kitchen->description,
                'cuisine_type' => $kitchen->cuisine_type,
                'area_locality' => $kitchen->area_locality,
                'landmark' => $kitchen->landmark,
                'is_open' => $kitchen->is_open,
                'minimum_order_amount' => (float) $kitchen->minimum_order_amount,
                'delivery_radius_km' => (float) $kitchen->delivery_radius_km,
                'delivery_mode' => $kitchen->delivery_mode,
                'delivery_available' => true,
                'approx_distance_km' => $distanceKm,
            ];
        });

        // If coordinates provided, filter by kitchen's delivery radius or sort by distance
        if ($userLat !== null && $userLng !== null) {
            $results = $results->filter(function ($item) {
                return $item['approx_distance_km'] === null || $item['approx_distance_km'] <= $item['delivery_radius_km'];
            })->sortBy('approx_distance_km')->values();
        }

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    /**
     * Public kitchen menu view by slug.
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $kitchen = Kitchen::where('slug', $slug)->approved()->firstOrFail();

        $categories = $kitchen->categories()
            ->with(['items' => function ($q) {
                $q->available();
            }])
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'kitchen' => [
                    'id' => $kitchen->id,
                    'name' => $kitchen->name,
                    'slug' => $kitchen->slug,
                    'description' => $kitchen->description,
                    'cuisine_type' => $kitchen->cuisine_type,
                    'area_locality' => $kitchen->area_locality,
                    'is_open' => $kitchen->is_open,
                    'minimum_order_amount' => (float) $kitchen->minimum_order_amount,
                    'delivery_radius_km' => (float) $kitchen->delivery_radius_km,
                    'delivery_mode' => $kitchen->delivery_mode,
                    'opening_time' => $kitchen->opening_time,
                    'closing_time' => $kitchen->closing_time,
                    'operating_days' => $kitchen->operating_days,
                ],
                'categories' => $categories,
            ],
        ]);
    }
}
