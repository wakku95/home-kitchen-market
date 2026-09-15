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
        Schema::create('rider_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('vehicle_type', 50)->default('motorcycle'); // motorcycle, bicycle, etc.
            $table->string('vehicle_number', 50)->nullable();
            $table->string('approval_status', 20)->default('pending')->index(); // pending, approved, rejected
            $table->string('availability_status', 20)->default('OFFLINE')->index(); // AVAILABLE, OFFERED, BUSY, OFFLINE, SUSPENDED
            $table->decimal('current_latitude', 10, 7)->nullable()->index();
            $table->decimal('current_longitude', 10, 7)->nullable()->index();
            $table->timestamp('location_updated_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['approval_status', 'availability_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_profiles');
    }
};
