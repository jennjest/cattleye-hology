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
        Schema::create('sensor_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cow_id')->constrained()->cascadeOnDelete();

            // Physiological data (MLX90614).
            $table->decimal('temperature', 5, 2)->nullable();

            // Behavioural data (MPU6050). Accelerometer and gyroscope axes.
            $table->decimal('ax', 8, 4)->nullable();
            $table->decimal('ay', 8, 4)->nullable();
            $table->decimal('az', 8, 4)->nullable();
            $table->decimal('gx', 8, 4)->nullable();
            $table->decimal('gy', 8, 4)->nullable();
            $table->decimal('gz', 8, 4)->nullable();

            // Readings are immutable facts captured by the edge computer, so the
            // table intentionally has no created_at/updated_at columns.
            $table->timestamp('recorded_at');

            $table->index(['cow_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sensor_readings');
    }
};
