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
        Schema::create('risk_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cow_id')->constrained()->cascadeOnDelete();

            $table->decimal('score', 5, 2);
            $table->string('status', 32);

            // The fusion runs on the Raspberry Pi and returns a short list of
            // human readable reasons, so an array column is the correct shape
            // here. The score itself stays a relational column for filtering.
            $table->json('reasons')->nullable();

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
        Schema::dropIfExists('risk_assessments');
    }
};
