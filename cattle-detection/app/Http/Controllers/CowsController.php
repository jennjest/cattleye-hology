<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCowRequest;
use App\Http\Requests\UpdateCowRequest;
use App\Models\Cow;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Inertia page controller for the cow list, and the write side of cow CRUD.
 *
 * The list itself is read through `GET /api/cows` so it can poll for fresh
 * telemetry; this controller only serves the first paint and handles writes.
 */
class CowsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('cows/index');
    }

    public function store(StoreCowRequest $request): RedirectResponse
    {
        $cow = Cow::create($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Sapi {$cow->code} ditambahkan.",
        ]);

        return to_route('cows.show', $cow);
    }

    public function update(UpdateCowRequest $request, Cow $cow): RedirectResponse
    {
        $cow->update($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Sapi {$cow->code} diperbarui.",
        ]);

        return to_route('cows.show', $cow);
    }

    /**
     * Delete a cow and, through the foreign keys, all of its telemetry.
     *
     * There is no undo for this, so the confirmation dialog has to say plainly
     * how many readings go with it. Soft deletes are not used on purpose: a
     * retired cow should stop consuming disk, not linger in every query.
     */
    public function destroy(Cow $cow): RedirectResponse
    {
        $code = $cow->code;
        $count = $cow->sensorReadings()->count()
            + $cow->visionPredictions()->count()
            + $cow->riskAssessments()->count();

        $cow->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Sapi {$code} dihapus"
                .($count > 0 ? " beserta {$count} catatan telemetry." : '.'),
        ]);

        return to_route('cows.index');
    }
}
