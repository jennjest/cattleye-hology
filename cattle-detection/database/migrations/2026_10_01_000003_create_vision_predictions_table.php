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
        Schema::create('vision_predictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cow_id')->constrained()->cascadeOnDelete();

            $table->string('label', 32);
            $table->decimal('confidence', 5, 4);

            // Immutable facts, see sensor_readings.
            $table->timestamp('recorded_at');

            $table->index(['cow_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vision_predictions');
    }
};
