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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 50)->unique();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('kitchen_id')->constrained('kitchens')->cascadeOnDelete();
            $table->unsignedBigInteger('assigned_rider_id')->nullable()->index();
            $table->string('delivery_mode', 20)->default('platform_rider')->index();
            $table->string('status', 35)->default('PENDING')->index();
            $table->decimal('subtotal', 10, 2);
            $table->decimal('delivery_fee', 10, 2)->default(0.00);
            $table->decimal('total', 10, 2);
            $table->string('delivery_fee_status', 25)->default('PENDING')->index();
            $table->text('delivery_address_text');
            $table->string('delivery_area', 150);
            $table->string('delivery_landmark', 150)->nullable();
            $table->decimal('delivery_latitude', 10, 7);
            $table->decimal('delivery_longitude', 10, 7);
            $table->string('customer_phone', 20);
            $table->integer('preparation_minutes')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->foreignId('chef_payment_method_id')->nullable()->constrained('chef_payment_methods')->nullOnDelete();
            $table->string('payment_submitted_reference')->nullable();
            $table->timestamp('payment_deadline_at')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
            $table->index(['kitchen_id', 'status']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
