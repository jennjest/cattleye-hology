<?php

namespace App\Http\Resources;

use App\Enums\RiskStatus;
use App\Enums\VisionLabel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use JsonSerializable;
use Throwable;

/**
 * Normalises the raw `latest_state` dictionary published by the Pi.
 *
 * Two things happen here: untrusted JSON from another machine is coerced to
 * known types, and the Pi's unix-second timestamps become ISO 8601 strings so
 * the dashboard never has to deal with float epochs.
 */
class EdgeStateResource implements JsonSerializable
{
    /**
     * @param  array<string, mixed>|null  $state
     */
    public function __construct(private readonly ?array $state) {}

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        if ($this->state === null) {
            return ['wearable' => null, 'activity' => null, 'vision' => null, 'risk' => null];
        }

        return [
            'wearable' => $this->wearable(),
            'activity' => $this->activity(),
            'vision' => $this->vision(),
            'risk' => $this->risk(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function wearable(): ?array
    {
        $wearable = $this->block('wearable');
        if ($wearable === null) {
            return null;
        }

        return [
            'temperature' => $this->number($wearable['temperature'] ?? null),
            'ax' => $this->number($wearable['ax'] ?? null),
            'ay' => $this->number($wearable['ay'] ?? null),
            'az' => $this->number($wearable['az'] ?? null),
            'gx' => $this->number($wearable['gx'] ?? null),
            'gy' => $this->number($wearable['gy'] ?? null),
            'gz' => $this->number($wearable['gz'] ?? null),
            'recorded_at' => $this->isoTime($wearable['timestamp'] ?? null),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function activity(): ?array
    {
        $activity = $this->block('activity');
        if ($activity === null) {
            return null;
        }

        return [
            'std_g' => $this->number($activity['std_g'] ?? null),
            'ratio' => $this->number($activity['ratio'] ?? null),
            'score' => $this->number($activity['score'] ?? null),
            'baseline' => $this->number($activity['baseline'] ?? null),
            'baseline_ready' => ($activity['baseline_ready'] ?? null) === true,
            'samples' => $this->number($activity['samples'] ?? null),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function vision(): ?array
    {
        $vision = $this->block('vision');
        if ($vision === null) {
            return null;
        }

        return [
            'label' => $this->enumValue(VisionLabel::class, $vision['label'] ?? null) ?? VisionLabel::Unknown->value,
            'confidence' => $this->probability($vision['confidence'] ?? null),
            'p_pmk' => $this->probability($vision['p_pmk'] ?? null),
            'recorded_at' => $this->isoTime($vision['timestamp'] ?? null),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function risk(): ?array
    {
        $risk = $this->block('risk');
        if ($risk === null) {
            return null;
        }

        return [
            'score' => $this->number($risk['score'] ?? null),
            'status' => $this->enumValue(RiskStatus::class, $risk['status'] ?? null) ?? RiskStatus::TidakAdaData->value,
            'reasons' => $this->stringList($risk['reasons'] ?? null),
            'missing' => $this->stringList($risk['missing'] ?? null),
            'inputs' => $this->numberMap($risk['inputs'] ?? null),
            'recorded_at' => $this->isoTime($risk['timestamp'] ?? null),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function block(string $key): ?array
    {
        $block = $this->state[$key] ?? null;

        return is_array($block) ? $block : null;
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    /**
     * A probability outside 0..1 means the edge payload is not what we expect,
     * so it is dropped rather than passed on as an impossible confidence.
     */
    private function probability(mixed $value): ?float
    {
        $number = $this->number($value);

        return $number !== null && $number >= 0 && $number <= 1 ? $number : null;
    }

    /**
     * Resolves a label sent by the Pi, or null when this build does not know it.
     *
     * The union is spelled out instead of templated because both enums are
     * string-backed, which is what lets the return type be a plain string.
     *
     * @param  class-string<RiskStatus|VisionLabel>  $enum
     */
    private function enumValue(string $enum, mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        return $enum::tryFrom($value)?->value;
    }

    /**
     * @return array<int, string>
     */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter($value, is_string(...)));
    }

    /**
     * @return array<string, float|null>
     */
    private function numberMap(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $result = [];
        foreach ($value as $key => $item) {
            if (is_string($key)) {
                $result[$key] = $this->number($item);
            }
        }

        return $result;
    }

    /**
     * The Pi publishes `time.time()`, i.e. unix seconds as a float. Values that
     * cannot be understood are logged and reported as "no timestamp" rather than
     * failing the whole dashboard.
     */
    private function isoTime(mixed $value): ?string
    {
        if (! is_numeric($value)) {
            return null;
        }

        try {
            return Carbon::createFromTimestamp((float) $value)->toIso8601String();
        } catch (Throwable $exception) {
            Log::warning('Unreadable edge timestamp from Raspberry Pi.', ['value' => $value, 'exception' => $exception]);

            return null;
        }
    }
}
