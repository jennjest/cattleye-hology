<?php

use App\Http\Controllers\Api\EdgeStateController;
use App\Http\Controllers\Api\FusionSettingsController;
use App\Http\Controllers\Api\RiskAssessmentController;
use App\Http\Controllers\Api\SensorDataController;
use App\Http\Controllers\Api\VisionDataController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CATTLEYE API Routes — device ingestion
|--------------------------------------------------------------------------
|
| These routes run in the stateless "api" middleware group and are guarded by
| the "device" middleware, which checks the shared secret sent by the edge
| computer. They are deliberately session-less so the Raspberry Pi never needs
| a cookie or a CSRF token.
|
| Read endpoints consumed by the dashboard live in routes/web.php, because the
| browser is authenticated with a session cookie.
|
*/

Route::get('/ping', function (Request $request) {
    return response()->json([
        'data' => [
            'app' => config('app.name'),
            'time' => now()->toIso8601String(),
        ],
        'message' => 'CATTLEYE API is reachable.',
    ]);
})->name('api.ping');

Route::middleware('device')->group(function () {
    // Combined wearable payload, optionally carrying vision and risk blocks.
    Route::post('/sensor-data', [SensorDataController::class, 'store'])
        ->name('api.sensor-data.store');

    // Full edge snapshot, shaped exactly like the Pi's GET /api/data response.
    // This is what cattleye/bridge_to_laravel.py posts.
    Route::post('/edge-state', [EdgeStateController::class, 'store'])
        ->name('api.edge-state.store');

    // Fusion tunables the Pi applies to its own algorithm. Read-only: the
    // operator edits them in the settings page, never from the device.
    Route::get('/fusion-settings', [FusionSettingsController::class, 'show'])
        ->name('api.fusion-settings.show');

    // Granular endpoints, used when the Pi posts each thread separately.
    Route::post('/vision-data', [VisionDataController::class, 'store'])
        ->name('api.vision-data.store');

    Route::post('/risk-assessments', [RiskAssessmentController::class, 'store'])
        ->name('api.risk-assessments.store');
});
