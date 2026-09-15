<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\Chef\KitchenController as ChefKitchenController;
use App\Http\Controllers\Api\V1\Chef\MenuController as ChefMenuController;
use App\Http\Controllers\Api\V1\Chef\PaymentMethodController as ChefPaymentMethodController;
use App\Http\Controllers\Api\V1\Customer\KitchenController as CustomerKitchenController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public routes
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    Route::get('/settings/public', [SettingsController::class, 'publicSettings']);

    // Customer public discovery
    Route::prefix('customer')->group(function () {
        Route::get('/kitchens', [CustomerKitchenController::class, 'index']);
        Route::get('/kitchens/{slug}', [CustomerKitchenController::class, 'show']);
    });

    // Authenticated routes
    Route::middleware(['auth:sanctum', 'account.active'])->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });

        // Chef routes
        Route::middleware(['role:chef'])->prefix('chef')->group(function () {
            // Kitchen profile
            Route::get('/kitchen', [ChefKitchenController::class, 'show']);
            Route::post('/kitchen', [ChefKitchenController::class, 'store']);
            Route::put('/kitchen', [ChefKitchenController::class, 'update']);

            // Menu categories
            Route::get('/menu/categories', [ChefMenuController::class, 'indexCategories']);
            Route::post('/menu/categories', [ChefMenuController::class, 'storeCategory']);
            Route::put('/menu/categories/{id}', [ChefMenuController::class, 'updateCategory']);
            Route::delete('/menu/categories/{id}', [ChefMenuController::class, 'destroyCategory']);

            // Menu items
            Route::get('/menu/items', [ChefMenuController::class, 'indexItems']);
            Route::post('/menu/items', [ChefMenuController::class, 'storeItem']);
            Route::put('/menu/items/{id}', [ChefMenuController::class, 'updateItem']);
            Route::delete('/menu/items/{id}', [ChefMenuController::class, 'destroyItem']);
            Route::patch('/menu/items/{id}/availability', [ChefMenuController::class, 'toggleItemAvailability']);

            // Payment methods
            Route::get('/payment-methods', [ChefPaymentMethodController::class, 'index']);
            Route::post('/payment-methods', [ChefPaymentMethodController::class, 'store']);
            Route::delete('/payment-methods/{id}', [ChefPaymentMethodController::class, 'destroy']);
            Route::patch('/payment-methods/{id}/toggle-active', [ChefPaymentMethodController::class, 'toggleActive']);
        });

        // Customer routes
        Route::middleware(['role:customer'])->prefix('customer')->group(function () {
            // Addresses
            Route::get('/addresses', [\App\Http\Controllers\Api\V1\Customer\AddressController::class, 'index']);
            Route::post('/addresses', [\App\Http\Controllers\Api\V1\Customer\AddressController::class, 'store']);
            Route::delete('/addresses/{id}', [\App\Http\Controllers\Api\V1\Customer\AddressController::class, 'destroy']);

            // Orders
            Route::post('/orders/estimate', [\App\Http\Controllers\Api\V1\Customer\OrderController::class, 'estimate']);
            Route::post('/orders', [\App\Http\Controllers\Api\V1\Customer\OrderController::class, 'store']);
            Route::get('/orders', [\App\Http\Controllers\Api\V1\Customer\OrderController::class, 'index']);
            Route::get('/orders/{order_number}', [\App\Http\Controllers\Api\V1\Customer\OrderController::class, 'show']);
            Route::post('/orders/{order_number}/cancel', [\App\Http\Controllers\Api\V1\Customer\OrderController::class, 'cancel']);
        });

        // Rider routes
        Route::middleware(['role:rider'])->prefix('rider')->group(function () {
            Route::get('/profile', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'profile']);
            Route::post('/status', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'updateStatus']);
            Route::post('/location', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'updateLocation']);
            Route::post('/assignments/{id}/accept', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'acceptAssignment']);
            Route::post('/assignments/{id}/reject', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'rejectAssignment']);
            Route::post('/orders/{order_number}/unable-to-deliver', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'reportUnableToDeliver']);
            Route::post('/orders/{order_number}/picked-up', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'markPickedUp']);
            Route::post('/orders/{order_number}/delivered', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'markDelivered']);
            Route::get('/history', [\App\Http\Controllers\Api\V1\Rider\RiderController::class, 'deliveryHistory']);
        });

        // Admin routes
        Route::middleware(['role:admin'])->prefix('admin')->group(function () {
            Route::get('/settings', [SettingsController::class, 'index']);
            Route::put('/settings', [SettingsController::class, 'update']);
            Route::get('/audit-logs', function (Request $request) {
                return response()->json([
                    'success' => true,
                    'data' => AuditLog::with('user:id,name,email,role')
                        ->latest()
                        ->paginate(20),
                ]);
            });
        });
    });
});
