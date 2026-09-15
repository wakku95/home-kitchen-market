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
        Schema::create('delivery_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('rider_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('offered')->index(); // offered, accepted, rejected, expired, cancelled
            $table->decimal('distance_to_kitchen_km', 8, 2)->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('responded_at')->nullable();
            $table->string('rejection_reason', 150)->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['rider_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_assignments');
    }
};
