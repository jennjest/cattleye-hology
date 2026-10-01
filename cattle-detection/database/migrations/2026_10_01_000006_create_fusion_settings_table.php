<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tunables for the sensor fusion that currently lives as module constants in
 * cattleye/main.py.
 *
 * The values are seeded with the constants that shipped on the Pi so behaviour
 * does not change on upgrade: until an operator edits the page, the numbers the
 * Pi uses are exactly the numbers it used before.
 *
 * This is a single-row table rather than a key/value store because every field
 * is a number with its own range, and the settings page needs to validate and
 * explain each one individually.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fusion_settings', function (Blueprint $table) {
            $table->id();

            // Risk score boundaries, 0-100. Waspada must stay below Tinggi.
            $table->decimal('waspada_threshold', 5, 2);
            $table->decimal('tinggi_threshold', 5, 2);

            // MLX90614 reads skin temperature, not core temperature.
            $table->decimal('temp_offset', 5, 2)->default(0);

            // Activity scoring window, in seconds.
            $table->unsignedInteger('activity_window_sec');
            $table->unsignedInteger('activity_min_samples');
            $table->decimal('activity_score_normal', 6, 2);

            // Adaptive baseline of the accelerometer magnitude.
            $table->decimal('baseline_default', 8, 6);
            $table->unsignedInteger('baseline_warmup_windows');
            $table->decimal('baseline_alpha', 8, 6);
            $table->decimal('baseline_update_min_ratio', 6, 3);

            // How old an input may be before it counts as missing.
            $table->unsignedInteger('wearable_stale_sec');
            $table->unsignedInteger('vision_stale_sec');
            $table->decimal('fusion_interval_sec', 4, 2);

            $table->timestamps();

            // One row only: a second settings row would be a bug, not a version.
            $table->unique('id');
        });

        DB::table('fusion_settings')->insert([
            'waspada_threshold' => 33,
            'tinggi_threshold' => 60,
            'temp_offset' => 0,
            'activity_window_sec' => 30,
            'activity_min_samples' => 10,
            'activity_score_normal' => 70,
            'baseline_default' => 0.05,
            'baseline_warmup_windows' => 10,
            'baseline_alpha' => 0.002,
            'baseline_update_min_ratio' => 0.6,
            'wearable_stale_sec' => 30,
            'vision_stale_sec' => 30,
            'fusion_interval_sec' => 1.0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('fusion_settings');
    }
};
