<?php

use App\Http\Controllers\Api\CowController;
use App\Http\Controllers\Api\CowHistoryExportController;
use App\Http\Controllers\Api\EdgeCameraController;
use App\Http\Controllers\CowPageController;
use App\Http\Controllers\CowsController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

/*
|--------------------------------------------------------------------------
| Dashboard pages
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('cows', [CowsController::class, 'index'])->name('cows.index');

    // Write side of cow CRUD. The list is read through the API so it can poll,
    // but writes go through Inertia so validation errors render in place.
    Route::post('cows', [CowsController::class, 'store'])->name('cows.store');
    Route::match(['put', 'patch'], 'cows/{cow}', [CowsController::class, 'update'])->name('cows.update');
    Route::delete('cows/{cow}', [CowsController::class, 'destroy'])->name('cows.destroy');

    Route::get('cows/{cow}', [CowPageController::class, 'show'])->name('cows.show');

    Route::inertia('monitoring', 'monitoring')->name('monitoring.index');
    Route::inertia('history', 'history')->name('history.index');
});

/*
|--------------------------------------------------------------------------
| Read API for the dashboard
|--------------------------------------------------------------------------
|
| Served from the web middleware group so the browser can call it with its
| existing session cookie. Device ingestion stays in routes/api.php.
|
*/

Route::middleware(['auth', 'verified'])->prefix('api')->group(function () {
    Route::get('/cows', [CowController::class, 'index'])->name('api.cows.index');
    Route::get('/cows/{cow}/latest', [CowController::class, 'latest'])->name('api.cows.latest');
    Route::get('/cows/{cow}/history', [CowController::class, 'history'])->name('api.cows.history');
    Route::get('/cows/{cow}', [CowController::class, 'show'])->name('api.cows.show');

    // Live view of the Raspberry Pi: MJPEG URL plus its current fusion state.
    Route::get('/edge/camera', [EdgeCameraController::class, 'show'])->name('api.edge.camera');
});

/*
|--------------------------------------------------------------------------
| CSV download
|--------------------------------------------------------------------------
|
| Lives outside the API prefix because the browser follows the link directly
| and receives a file instead of JSON.
|
*/

Route::middleware(['auth', 'verified'])
    ->get('/cows/{cow}/export', CowHistoryExportController::class)
    ->name('cows.export');

require __DIR__.'/settings.php';
