<?php

namespace App\Http\Controllers\Api\V1\Chef;

use App\Http\Controllers\Controller;
use App\Models\ChefProfile;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    protected function getKitchen(Request $request)
    {
        $chefProfile = ChefProfile::where('user_id', $request->user()->id)->first();
        if (! $chefProfile || ! $chefProfile->kitchen) {
            abort(response()->json([
                'success' => false,
                'message' => 'You must set up your kitchen before managing menus.',
            ], 422));
        }
        return $chefProfile->kitchen;
    }

    // --- Category Methods ---

    public function indexCategories(Request $request): JsonResponse
    {
        $kitchen = $this->getKitchen($request);
        $categories = $kitchen->categories()->withCount('items')->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $kitchen = $this->getKitchen($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category = $kitchen->categories()->create([
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully.',
            'data' => $category,
        ], 201);
    }

    public function updateCategory(Request $request, int $id): JsonResponse
    {
        $kitchen = $this->getKitchen($request);
        $category = $kitchen->categories()->findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully.',
            'data' => $category,
        ]);
    }

    public function destroyCategory(Request $request, int $id): JsonResponse
    {
        $kitchen = $this->getKitchen($request);
        $category = $kitchen->categories()->findOrFail($id);

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
        ]);
    }

    // --- Item Methods ---

    public function indexItems(Request $request): JsonResponse
    {
        $kitchen = $this->getKitchen($request);
        $items = $kitchen->items()->with('category')->get();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function storeItem(Request $request): JsonResponse
    {
        $kitchen = $this->getKitchen($request);

        $validated = $request->validate([
            'menu_category_id' => ['nullable', 'exists:menu_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['required', 'numeric', 'min:1'],
            'is_available' => ['boolean'],
            'preparation_time_minutes' => ['integer', 'min:1', 'max:180'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (! empty($validated['menu_category_id'])) {
            $cat = MenuCategory::where('id', $validated['menu_category_id'])
                ->where('kitchen_id', $kitchen->id)
                ->first();
            if (! $cat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid category selected.',
                ], 422);
            }
        }

        $item = $kitchen->items()->create($validated);

        AuditService::log('chef.menu_item_created', $item, [
            'item_id' => $item->id,
            'price' => $item->price,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Menu item created successfully.',
            'data' => $item->load('category'),
        ], 201);
    }

    public function updateItem(Request $request, int $id): JsonResponse
    {
        $kitchen = $this->getKitchen($request);
        $item = $kitchen->items()->findOrFail($id);

        $validated = $request->validate([
            'menu_category_id' => ['nullable', 'exists:menu_categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['sometimes', 'required', 'numeric', 'min:1'],
            'is_available' => ['boolean'],
            'preparation_time_minutes' => ['integer', 'min:1', 'max:180'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (isset($validated['menu_category_id'])) {
            $cat = MenuCategory::where('id', $validated['menu_category_id'])
                ->where('kitchen_id', $kitchen->id)
                ->first();
            if (! $cat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid category selected.',
                ], 422);
            }
        }

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Menu item updated successfully.',
            'data' => $item->load('category'),
        ]);
    }

    public function destroyItem(Request $request, int $id): JsonResponse
    {
        $kitchen = $this->getKitchen($request);
        $item = $kitchen->items()->findOrFail($id);

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Menu item deleted successfully.',
        ]);
    }

    public function toggleItemAvailability(Request $request, int $id): JsonResponse
    {
        $kitchen = $this->getKitchen($request);
        $item = $kitchen->items()->findOrFail($id);

        $item->is_available = ! $item->is_available;
        $item->save();

        return response()->json([
            'success' => true,
            'message' => "Item marked as " . ($item->is_available ? 'available' : 'unavailable') . ".",
            'data' => $item,
        ]);
    }
}
