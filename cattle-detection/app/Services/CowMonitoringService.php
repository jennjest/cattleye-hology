<?php

namespace App\Services;

use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\SensorReading;
use App\Models\VisionPrediction;
use Carbon\CarbonInterface;

/**
 * Read side of the monitoring pipeline: composes the raw readings, vision
 * predictions and fusion results of a cow into the shapes the dashboard needs.
 */
class CowMonitoringService
{
    /**
     * Latest known state of a cow. Every part may be null when the edge
     * computer has not reported it yet, and the caller is expected to render
     * those cases as "N/A" rather than as zero.
     *
     * @return array{sensor_reading: ?SensorReading, vision_prediction: ?VisionPrediction, risk_assessment: ?RiskAssessment, is_stale: bool}
     */
    public function latest(Cow $cow): array
    {
        $cow->loadMissing(['latestSensorReading', 'latestVisionPrediction', 'latestRiskAssessment']);

        $newest = collect([
            $cow->latestSensorReading?->recorded_at,
            $cow->latestVisionPrediction?->recorded_at,
            $cow->latestRiskAssessment?->recorded_at,
        ])->filter()->max();

        return [
            'sensor_reading' => $cow->latestSensorReading,
            'vision_prediction' => $cow->latestVisionPrediction,
            'risk_assessment' => $cow->latestRiskAssessment,
            'is_stale' => $newest === null
                || $newest->lt(now()->subSeconds((int) config('cattleye.stale_after_seconds'))),
        ];
    }

    /**
     * Chart-ready history for one cow. Series are projected here instead of in
     * React so every client sees the same shape.
     *
     * @return array<string, mixed>
     */
    public function history(Cow $cow, int $hours, int $limit): array
    {
        $since = now()->subHours($hours);

        $readings = $cow->sensorReadings()
            ->where('recorded_at', '>=', $since)
            ->orderBy('recorded_at')
            ->limit($limit)
            ->get(['recorded_at', 'temperature']);

        $assessments = $cow->riskAssessments()
            ->where('recorded_at', '>=', $since)
            ->orderBy('recorded_at')
            ->limit($limit)
            ->get(['recorded_at', 'score', 'status']);

        $predictions = $cow->visionPredictions()
            ->where('recorded_at', '>=', $since)
            ->orderBy('recorded_at')
            ->limit($limit)
            ->get(['recorded_at', 'label', 'confidence']);

        return [
            'cow' => $cow,
            'window' => [
                'hours' => $hours,
                'from' => $since->toIso8601String(),
                'to' => now()->toIso8601String(),
            ],
            'temperature' => $readings->map(fn (SensorReading $reading): array => [
                'recorded_at' => $reading->recorded_at->toIso8601String(),
                'value' => $reading->temperature,
            ])->all(),
            'risk_score' => $assessments->map(fn (RiskAssessment $assessment): array => [
                'recorded_at' => $assessment->recorded_at->toIso8601String(),
                'value' => $assessment->score,
                'status' => $assessment->status->value,
            ])->all(),
            'vision' => $predictions->map(fn (VisionPrediction $prediction): array => [
                'recorded_at' => $prediction->recorded_at->toIso8601String(),
                'label' => $prediction->label->value,
                'confidence' => $prediction->confidence,
            ])->all(),
        ];
    }

    /**
     * Number of seconds since the newest telemetry row of a cow, or null when
     * the cow has never reported.
     */
    public function secondsSinceLastUpdate(Cow $cow): ?int
    {
        $cow->loadMissing('latestSensorReading');

        $recordedAt = $cow->latestSensorReading?->recorded_at;

        return $recordedAt instanceof CarbonInterface
            ? (int) $recordedAt->diffInSeconds(now())
            : null;
    }
}
