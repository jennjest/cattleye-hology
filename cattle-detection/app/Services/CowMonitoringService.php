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

    /**
     * Herd-wide aggregates for the analytics dashboard.
     *
     * Grouping happens in SQL so a 90 day window does not pull every reading
     * into PHP, but the activity heatmap needs the JSON `activity` column
     * decoded, which SQLite and MySQL spell differently; that one is bucketed
     * in PHP over a capped, short window instead.
     *
     * Days without telemetry are simply absent from `daily`: a gap is missing
     * data, not a zero the chart should draw.
     *
     * @return array<string, mixed>
     */
    public function populationSummary(int $days, int $heatmapLimit = 5000): array
    {
        $since = now()->subDays($days);

        $temperatures = SensorReading::query()
            ->where('recorded_at', '>=', $since)
            ->whereNotNull('temperature')
            ->selectRaw('DATE(recorded_at) as bucket, AVG(temperature) as value, COUNT(*) as samples')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->pluck('value', 'bucket');

        $riskScores = RiskAssessment::query()
            ->where('recorded_at', '>=', $since)
            ->selectRaw('DATE(recorded_at) as bucket, AVG(score) as value')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->pluck('value', 'bucket');

        $daily = [];

        foreach ($temperatures as $date => $average) {
            $daily[] = [
                'date' => (string) $date,
                'avg_temperature' => round((float) $average, 2),
                'avg_risk_score' => $riskScores->has($date)
                    ? round((float) $riskScores->get($date), 2)
                    : null,
            ];
        }

        return [
            'window' => [
                'days' => $days,
                'from' => $since->toIso8601String(),
                'to' => now()->toIso8601String(),
            ],
            'daily' => $daily,
            'hourly_activity' => $this->activityBuckets($heatmapLimit),
        ];
    }

    /**
     * Average IMU activity score per two-hour bucket of the last day, used for
     * the "Heatmap Jam Aktivitas Ternak" panel.
     *
     * @return array<int, array{hour: int, score: float|null}>
     */
    private function activityBuckets(int $limit): array
    {
        $buckets = [];

        foreach (range(0, 11) as $index) {
            $buckets[$index] = ['hour' => $index * 2, 'sum' => 0.0, 'samples' => 0];
        }

        SensorReading::query()
            ->where('recorded_at', '>=', now()->subDay())
            ->whereNotNull('activity')
            ->orderByDesc('recorded_at')
            ->limit($limit)
            ->get(['recorded_at', 'activity'])
            ->each(function (SensorReading $reading) use (&$buckets): void {
                $score = $reading->activity['score'] ?? null;

                if (! is_numeric($score)) {
                    return;
                }

                // `recorded_at` is stored in the app timezone, so its hour is
                // the operator's hour and can be bucketed directly.
                $hour = (int) $reading->recorded_at->format('G');

                if ($hour > 23) {
                    return;
                }

                $index = intdiv($hour, 2);
                $buckets[$index]['sum'] += (float) $score;
                $buckets[$index]['samples'] += 1;
            });

        return array_map(static fn (array $bucket): array => [
            'hour' => $bucket['hour'],
            'score' => $bucket['samples'] === 0
                ? null
                : round($bucket['sum'] / $bucket['samples'], 2),
        ], array_values($buckets));
    }
}
