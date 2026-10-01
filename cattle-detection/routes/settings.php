<?php

use App\Http\Controllers\Settings\FusionSettingsController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\UsersController;
/* @chisel-password-confirmation */
use Illuminate\Auth\Middleware\RequirePassword;
/* @end-chisel-password-confirmation */
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        /* @chisel-password-confirmation */
        ->middleware(RequirePassword::class)
        /* @end-chisel-password-confirmation */
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    // Farm accounts. Only verified users can manage them, and the list drives
    // who receives risk alerts.
    Route::get('settings/users', [UsersController::class, 'index'])->name('users.index');
    Route::post('settings/users', [UsersController::class, 'store'])->name('users.store');
    Route::match(['put', 'patch'], 'settings/users/{user}', [UsersController::class, 'update'])
        ->name('users.update');
    Route::delete('settings/users/{user}', [UsersController::class, 'destroy'])
        ->name('users.destroy');

    // Sensor fusion thresholds. Verified email required: these values decide
    // when a cow raises an alert, so an unverified account must not set them.
    Route::get('settings/fusion', [FusionSettingsController::class, 'edit'])
        ->name('fusion-settings.edit');
    Route::put('settings/fusion', [FusionSettingsController::class, 'update'])
        ->name('fusion-settings.update');
});

/* @chisel-passkeys */
Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
/* @end-chisel-passkeys */
