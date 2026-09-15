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
        Schema::create('chef_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chef_profile_id')->constrained('chef_profiles')->cascadeOnDelete();
            $table->string('method_type', 30)->index(); // jazzcash, easypaisa, bank_transfer, raast
            $table->string('account_title');
            $table->string('account_number');
            $table->string('bank_name')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->string('verification_status', 20)->default('pending')->index();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['chef_profile_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chef_payment_methods');
    }
};
