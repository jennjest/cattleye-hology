<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Edge metrics that the Raspberry Pi fusion loop already produces but that were
 * not stored yet: the IMU activity window, the raw PMK probability, and the
 * inputs/missing bookkeeping returned by sensor_fusion() in cattleye/main.py.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sensor_readings', function (Blueprint $table) {
            $table->json('activity')->nullable()->after('gz');
        });

        Schema::table('vision_predictions', function (Blueprint $table) {
            $table->decimal('p_pmk', 6, 5)->nullable()->after('confidence');
        });

        Schema::table('risk_assessments', function (Blueprint $table) {
            $table->json('missing')->nullable()->after('reasons');
            $table->json('inputs')->nullable()->after('missing');
        });
    }

    public function down(): void
    {
        Schema::table('risk_assessments', function (Blueprint $table) {
            $table->dropColumn(['missing', 'inputs']);
        });

        Schema::table('vision_predictions', function (Blueprint $table) {
            $table->dropColumn('p_pmk');
        });

        Schema::table('sensor_readings', function (Blueprint $table) {
            $table->dropColumn('activity');
        });
    }
};
