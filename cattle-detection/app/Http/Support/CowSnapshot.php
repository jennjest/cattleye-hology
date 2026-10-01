<?php

namespace App\Http\Support;

use App\Http\Resources\RiskAssessmentResource;
use App\Http\Resources\SensorReadingResource;
use App\Http\Resources\VisionPredictionResource;
use App\Models\Cow;
use App\Services\CowMonitoringService;

/**
 * Builds the "newest telemetry of a cow" payload that both the JSON API and the
 * Inertia cow page need, so the two can never drift apart.
 */
final class CowSnapshot
{
    /**
     * @return array<string, mixed>
     */
    public static function forCow(Cow $cow, CowMonitoringService $monitoring): array
    {
        $cow->loadMissing(['latestSensorReading', 'latestVisionPrediction', 'latestRiskAssessment']);

        $latest = $monitoring->latest($cow);

        return [
            'cow' => $cow->only(['id', 'code', 'name']),
            'sensor_reading' => $latest['sensor_reading'] === null
                ? null
                : (new SensorReadingResource($latest['sensor_reading']))->resolve(),
            'vision_prediction' => $latest['vision_prediction'] === null
                ? null
                : (new VisionPredictionResource($latest['vision_prediction']))->resolve(),
            'risk_assessment' => $latest['risk_assessment'] === null
                ? null
                : (new RiskAssessmentResource($latest['risk_assessment']))->resolve(),
            'is_stale' => $latest['is_stale'],
        ];
    }
}
