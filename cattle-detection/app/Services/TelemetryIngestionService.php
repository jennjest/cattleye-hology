<?php

namespace App\Services;

use App\Enums\RiskStatus;
use App\Enums\VisionLabel;
use App\Events\RiskAssessed;
use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\SensorReading;
use App\Models\VisionPrediction;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

/**
 * Write side of the pipeline: turns validated device payloads into rows.
 *
 * Device data is never trusted as-is, so every value here has already passed
 * through a Form Request before it reaches this class.
 */
class TelemetryIngestionService
{
    /**
     * Persist a combined flat wearable + vision + risk payload in one transaction.
     * The vision and risk blocks are optional and simply skipped when absent.
     *
     * @param  array<string, mixed>  $data
     * @return array{cow: Cow, sensor_reading: ?SensorReading, vision_prediction: ?VisionPrediction, risk_assessment: ?RiskAssessment}
     */
    public function ingestTelemetry(array $data): array
    {
        $stored = $this->store(
            $data['cow_id'],
            [
                'temperature' => $data['temperature'] ?? null,
                'ax' => $data['ax'] ?? null,
                'ay' => $data['ay'] ?? null,
                'az' => $data['az'] ?? null,
                'gx' => $data['gx'] ?? null,
                'gy' => $data['gy'] ?? null,
                'gz' => $data['gz'] ?? null,
                'recorded_at' => $data['recorded_at'] ?? null,
            ],
            $this->activityPayload($data['activity'] ?? null),
            isset($data['vision_label'], $data['vision_confidence'])
                ? [
                    'label' => $data['vision_label'],
                    'confidence' => $data['vision_confidence'],
                    'p_pmk' => $data['vision_p_pmk'] ?? null,
                    'timestamp' => $data['vision_recorded_at'] ?? null,
                ]
                : null,
            isset($data['risk_score'], $data['risk_status'])
                ? [
                    'score' => $data['risk_score'],
                    'status' => $data['risk_status'],
                    'reasons' => $data['risk_reasons'] ?? [],
                    'missing' => $data['risk_missing'] ?? [],
                    'inputs' => $data['risk_inputs'] ?? null,
                    'timestamp' => $data['risk_recorded_at'] ?? null,
                ]
                : null,
        );

        $this->announce($stored);

        return $stored;
    }

    /**
     * Persist the full edge snapshot published by the Raspberry Pi, which uses
     * the nested `latest_state` shape of `GET /api/data` in `cattleye/main.py`.
     *
     * Blocks without a timestamp are treated as "the Pi has not produced this
     * block yet" and skipped, so a poll from the bridge never writes placeholder
     * rows for the camera or the fusion loop while they are still warming up.
     *
     * @param  array<string, mixed>  $data
     * @return array{cow: Cow, sensor_reading: ?SensorReading, vision_prediction: ?VisionPrediction, risk_assessment: ?RiskAssessment}
     */
    public function ingestEdgeState(array $data): array
    {
        $wearable = $data['wearable'] ?? [];
        $vision = $data['vision'] ?? null;
        $risk = $data['risk'] ?? null;

        $stored = $this->store(
            $data['cow_id'],
            [
                'temperature' => $wearable['temperature'] ?? null,
                'ax' => $wearable['ax'] ?? null,
                'ay' => $wearable['ay'] ?? null,
                'az' => $wearable['az'] ?? null,
                'gx' => $wearable['gx'] ?? null,
                'gy' => $wearable['gy'] ?? null,
                'gz' => $wearable['gz'] ?? null,
                'recorded_at' => $wearable['timestamp'] ?? null,
            ],
            $this->activityPayload($data['activity'] ?? null),
            $this->isFresh($vision) && $this->hasVision($vision) ? $vision : null,
            $this->isFresh($risk) && $this->hasRisk($risk) ? $risk : null,
        );

        $this->announce($stored);

        return $stored;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function ingestVision(array $data): VisionPrediction
    {
        $cow = $this->resolveCow($data['cow_id']);

        return $cow->visionPredictions()->create([
            'label' => VisionLabel::from($data['label']),
            'confidence' => (float) $data['confidence'],
            'recorded_at' => $this->resolveTimestamp($data['recorded_at'] ?? null),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function ingestRiskAssessment(array $data): RiskAssessment
    {
        $cow = $this->resolveCow($data['cow_id']);

        $assessment = $cow->riskAssessments()->create([
            'score' => (float) $data['score'],
            'status' => RiskStatus::from($data['status']),
            'reasons' => $data['reasons'] ?? [],
            'recorded_at' => $this->resolveTimestamp($data['recorded_at'] ?? null),
        ]);

        $this->announce(['cow' => $cow, 'risk_assessment' => $assessment]);

        return $assessment;
    }

    /**
     * Single write path shared by the flat and the nested ingest contracts.
     *
     * Wraps only the writes. The alert is raised by the callers after this
     * transaction has committed, never from inside it.
     *
     * @param  array<string, float|null>  $wearable
     * @param  array<string, mixed>|null  $activity
     * @param  array<string, mixed>|null  $vision
     * @param  array<string, mixed>|null  $risk
     * @return array{cow: Cow, sensor_reading: ?SensorReading, vision_prediction: ?VisionPrediction, risk_assessment: ?RiskAssessment}
     */
    private function store(string $cowCode, array $wearable, ?array $activity, ?array $vision, ?array $risk): array
    {
        return DB::transaction(function () use ($cowCode, $wearable, $activity, $vision, $risk): array {
            $cow = $this->resolveCow($cowCode);

            $reading = $this->hasWearable($wearable)
                ? $cow->sensorReadings()->create([
                    ...$wearable,
                    'activity' => $activity,
                    'recorded_at' => $this->resolveTimestamp($wearable['recorded_at'] ?? null),
                ])
                : null;

            $prediction = $vision === null ? null : $cow->visionPredictions()->create([
                'label' => VisionLabel::from($vision['label']),
                'confidence' => (float) $vision['confidence'],
                'p_pmk' => isset($vision['p_pmk']) ? (float) $vision['p_pmk'] : null,
                'recorded_at' => $this->resolveTimestamp($vision['timestamp'] ?? null),
            ]);

            $assessment = $risk === null ? null : $cow->riskAssessments()->create([
                'score' => (float) $risk['score'],
                'status' => RiskStatus::from($risk['status']),
                'reasons' => $risk['reasons'] ?? [],
                'missing' => $risk['missing'] ?? [],
                'inputs' => $risk['inputs'] ?? null,
                'recorded_at' => $this->resolveTimestamp($risk['timestamp'] ?? null),
            ]);

            return [
                'cow' => $cow,
                'sensor_reading' => $reading,
                'vision_prediction' => $prediction,
                'risk_assessment' => $assessment,
            ];
        });
    }

    /**
     * Raises a risk alert once the rows are committed, so a listener can never
     * describe a transaction that was rolled back.
     *
     * @param  array{cow: Cow, risk_assessment: ?RiskAssessment}  $stored
     */
    private function announce(array $stored): void
    {
        if ($stored['risk_assessment'] === null) {
            return;
        }

        Event::dispatch(new RiskAssessed($stored['cow'], $stored['risk_assessment']));
    }

    /**
     * Devices identify cows by code, so that is what `cowCode` carries.
     */
    private function resolveCow(string $code): Cow
    {
        return Cow::where('code', $code)->firstOrFail();
    }

    /**
     * The Pi sends unix seconds as a float; flat payloads may send an ISO string.
     */
    private function resolveTimestamp(mixed $value): CarbonInterface
    {
        if ($value === null || $value === '') {
            return now();
        }

        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
            return Carbon::createFromTimestamp((float) $value);
        }

        return Carbon::parse($value);
    }

    /**
     * @param  array<string, mixed>|null  $activity
     * @return array<string, mixed>|null
     */
    private function activityPayload(?array $activity): ?array
    {
        if ($activity === null) {
            return null;
        }

        $filled = array_filter($activity, static fn (mixed $value): bool => $value !== null);

        return $filled === [] ? null : $filled;
    }

    /**
     * @param  array<string, mixed>  $wearable
     */
    private function hasWearable(array $wearable): bool
    {
        foreach (['temperature', 'ax', 'ay', 'az', 'gx', 'gy', 'gz'] as $key) {
            if (isset($wearable[$key])) {
                return true;
            }
        }

        return false;
    }

    /**
     * The Pi only stamps a timestamp once it has actually computed a block. The
     * initial `latest_state` placeholders ("Unknown" vision, "Tidak Ada Data"
     * risk) carry no timestamp, so they are ignored instead of being stored over
     * and over on every poll.
     *
     * @param  array<string, mixed>|null  $data
     */
    private function isFresh(?array $data): bool
    {
        return is_array($data) && isset($data['timestamp']);
    }

    /**
     * @param  array<string, mixed>|null  $data
     */
    private function hasVision(?array $data): bool
    {
        return is_array($data) && isset($data['label'], $data['confidence']);
    }

    /**
     * @param  array<string, mixed>|null  $data
     */
    private function hasRisk(?array $data): bool
    {
        return is_array($data) && isset($data['score'], $data['status']);
    }
}
