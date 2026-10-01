<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\FusionSettingsRequest;
use App\Models\FusionSetting;
use App\Services\EdgeFusionSettingsService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class FusionSettingsController extends Controller
{
    /**
     * Show the fusion settings page.
     *
     * The page also reports what the Pi is actually running, because a setting
     * that has not reached the device is a support call waiting to happen.
     */
    public function edit(EdgeFusionSettingsService $edge): Response
    {
        $settings = FusionSetting::current();

        return Inertia::render('settings/fusion', [
            'settings' => [
                'waspada_threshold' => (float) $settings->waspada_threshold,
                'tinggi_threshold' => (float) $settings->tinggi_threshold,
                'temp_offset' => (float) $settings->temp_offset,
                'activity_window_sec' => (int) $settings->activity_window_sec,
                'activity_min_samples' => (int) $settings->activity_min_samples,
                'activity_score_normal' => (float) $settings->activity_score_normal,
                'baseline_default' => (float) $settings->baseline_default,
                'baseline_warmup_windows' => (int) $settings->baseline_warmup_windows,
                'baseline_alpha' => (float) $settings->baseline_alpha,
                'baseline_update_min_ratio' => (float) $settings->baseline_update_min_ratio,
                'wearable_stale_sec' => (int) $settings->wearable_stale_sec,
                'vision_stale_sec' => (int) $settings->vision_stale_sec,
                'fusion_interval_sec' => (float) $settings->fusion_interval_sec,
            ],
            'updatedAt' => $settings->updated_at?->toIso8601String(),
            'defaults' => FusionSetting::defaults(),
            'device' => $edge->appliedOnDevice(),
        ]);
    }

    /**
     * Persist the fusion settings.
     */
    public function update(FusionSettingsRequest $request): RedirectResponse
    {
        $settings = FusionSetting::current();
        $settings->fill($request->validated())->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Threshold fusion disimpan. Pi menerimanya pada polling berikutnya.',
        ]);

        return to_route('fusion-settings.edit');
    }
}
