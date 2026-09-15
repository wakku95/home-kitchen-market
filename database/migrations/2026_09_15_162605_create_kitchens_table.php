<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('kitchens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chef_profile_id')->unique()->constrained('chef_profiles')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('cuisine_type', 100);
            $table->string('phone_contact');
            $table->json('operating_days')->nullable();
            $table->string('opening_time', 10)->nullable();
            $table->string('closing_time', 10)->nullable();
            $table->boolean('is_open')->default(true)->index();
            $table->decimal('minimum_order_amount', 10, 2)->default(0.00);
            $table->decimal('delivery_radius_km', 5, 2)->default(5.00);
            $table->string('approval_status', 20)->default('pending')->index();
            $table->string('delivery_mode', 20)->default('platform_rider')->index();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->text('address_text');
            $table->string('area_locality', 150)->index();
            $table->string('landmark')->nullable();
            $table->timestamps();

            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kitchens');
    }
};
