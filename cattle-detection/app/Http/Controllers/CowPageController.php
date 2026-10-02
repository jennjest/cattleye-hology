<?php

namespace App\Http\Controllers;

use App\Http\Support\CowSnapshot;
use App\Models\Cow;
use App\Services\CowMonitoringService;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Inertia page controller for the cow detail view.
 *
 * It seeds the page with a server-rendered snapshot so the first paint already
 * shows real telemetry; the page then keeps it fresh through the read API.
 */
class CowPageController extends Controller
{
    public function __construct(private readonly CowMonitoringService $monitoring) {}

    public function show(Cow $cow): Response
    {
        return Inertia::render('cows/show', [
            'snapshot' => CowSnapshot::forCow($cow, $this->monitoring),
            // Zero-based position in the code-ordered herd, so the client can
            // derive the same pen the map shows without a second request.
            'ordinal' => $cow->newQuery()
                ->where('code', '<=', $cow->code)
                ->count() - 1,
        ]);
    }
}
