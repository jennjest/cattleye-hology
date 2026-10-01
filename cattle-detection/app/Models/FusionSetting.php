<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * The single row holding the fusion tunables the Raspberry Pi reads.
 *
 * The fusion algorithm itself stays on the edge computer; this row is only how
 * an operator reaches its knobs from a browser.
 *
 * @property int $id
 * @property float $waspada_threshold
 * @property float $tinggi_threshold
 * @property float $temp_offset
 * @property int $activity_window_sec
 * @property int $activity_min_samples
 * @property float $activity_score_normal
 * @property float $baseline_default
 * @property int $baseline_warmup_windows
 * @property float $baseline_alpha
 * @property float $baseline_update_min_ratio
 * @property int $wearable_stale_sec
 * @property int $vision_stale_sec
 * @property float $fusion_interval_sec
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'waspada_threshold',
    'tinggi_threshold',
    'temp_offset',
    'activity_window_sec',
    'activity_min_samples',
    'activity_score_normal',
    'baseline_default',
    'baseline_warmup_windows',
    'baseline_alpha',
    'baseline_update_min_ratio',
    'wearable_stale_sec',
    'vision_stale_sec',
    'fusion_interval_sec',
])]
class FusionSetting extends Model
{
    /**
     * The seeded row, created on first access so a fresh install and a restored
     * database both behave the same way.
     */
    public static function current(): self
    {
        return static::query()->firstOrCreate([], self::defaults());
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
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
        ];
    }

    /**
     * Shape sent to the Pi, which only cares about the numbers it can apply.
     *
     * `updated_at` rides along as metadata so the Pi can tell a fresh payload
     * from a cached one; the Pi ignores it when applying.
     *
     * @return array<string, float|int|string|null>
     */
    public function toDevicePayload(): array
    {
        return [
            'waspada_threshold' => $this->waspada_threshold,
            'tinggi_threshold' => $this->tinggi_threshold,
            'temp_offset' => $this->temp_offset,
            'activity_window_sec' => $this->activity_window_sec,
            'activity_min_samples' => $this->activity_min_samples,
            'activity_score_normal' => $this->activity_score_normal,
            'baseline_default' => $this->baseline_default,
            'baseline_warmup_windows' => $this->baseline_warmup_windows,
            'baseline_alpha' => $this->baseline_alpha,
            'baseline_update_min_ratio' => $this->baseline_update_min_ratio,
            'wearable_stale_sec' => $this->wearable_stale_sec,
            'vision_stale_sec' => $this->vision_stale_sec,
            'fusion_interval_sec' => $this->fusion_interval_sec,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
