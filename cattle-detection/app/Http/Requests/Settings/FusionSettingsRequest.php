<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the fusion settings form.
 *
 * The cross-field rule matters: Waspada must sit below Tinggi, otherwise the
 * score would never reach any band and the Pi would report "Normal" forever.
 */
class FusionSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasVerifiedEmail() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'waspada_threshold' => ['required', 'numeric', 'min:0', 'max:100'],
            'tinggi_threshold' => ['required', 'numeric', 'min:0', 'max:100', 'gt:waspada_threshold'],

            'temp_offset' => ['required', 'numeric', 'min:-5', 'max:5'],
            'activity_window_sec' => ['required', 'integer', 'min:5', 'max:300'],
            'activity_min_samples' => ['required', 'integer', 'min:1', 'max:300'],
            'activity_score_normal' => ['required', 'numeric', 'min:0', 'max:100'],
            'baseline_default' => ['required', 'numeric', 'min:0.000001', 'max:10'],
            'baseline_warmup_windows' => ['required', 'integer', 'min:1', 'max:200'],
            'baseline_alpha' => ['required', 'numeric', 'min:0.000001', 'max:1'],
            'baseline_update_min_ratio' => ['required', 'numeric', 'min:0', 'max:1'],
            'wearable_stale_sec' => ['required', 'integer', 'min:1', 'max:3600'],
            'vision_stale_sec' => ['required', 'integer', 'min:1', 'max:3600'],
            'fusion_interval_sec' => ['required', 'numeric', 'min:0.1', 'max:60'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tinggi_threshold.gt' => 'Ambang "Berisiko Tinggi" harus lebih besar dari ambang "Waspada".',
            'waspada_threshold.max' => 'Ambang Waspada maksimal 100.',
            'baseline_default.min' => 'Baseline harus lebih besar dari 0, jika tidak aktivitas tidak pernah terbaca.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'waspada_threshold' => 'ambang Waspada',
            'tinggi_threshold' => 'ambang Berisiko Tinggi',
            'temp_offset' => 'koreksi suhu',
            'activity_window_sec' => 'jendela aktivitas',
            'activity_min_samples' => 'minimum sampel aktivitas',
            'activity_score_normal' => 'skor aktivitas normal',
            'baseline_default' => 'baseline default',
            'baseline_warmup_windows' => 'jendela pemanasan baseline',
            'baseline_alpha' => 'laju baseline',
            'baseline_update_min_ratio' => 'rasio minimum pembaruan baseline',
            'wearable_stale_sec' => 'batas kedaluwarsa wearable',
            'vision_stale_sec' => 'batas kedaluwarsa visual',
            'fusion_interval_sec' => 'interval fusion',
        ];
    }
}
