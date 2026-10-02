<?php

namespace App\Http\Controllers;

use App\Http\Support\CowSnapshot;
use App\Models\Cow;
use App\Services\CowMonitoringService;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Inertia entry point for the sidebar's "Detail Ternak" item.
 *
 * That item has no cow in its URL, so this controller resolves one from the
 * `cow` query parameter and falls back to the first cow in herd order. With no
 * cows registered there is nothing to show, hence the dedicated empty page
 * instead of a 404.
 */
class CattleDetailPageController extends Controller
{
    public function __construct(private readonly CowMonitoringService $monitoring) {}

    public function show(): Response
    {
        $cow = Cow::query()
            ->when(
                request()->filled('cow'),
                fn ($query) => $query->whereKey(request()->integer('cow')),
            )
            ->orderBy('code')
            ->first();

        return Inertia::render('cattle-detail', [
            'snapshot' => $cow === null
                ? null
                : CowSnapshot::forCow($cow, $this->monitoring),
            'ordinal' => $cow === null ? 0 : $this->ordinalOf($cow),
        ]);
    }

    /**
     * Zero-based position in the code-ordered herd, i.e. the pen index.
     *
     * Mirrors the ordering used by `GET /api/cows` so the pen shown in the
     * header is the same one the map and table derive.
     */
    private function ordinalOf(Cow $cow): int
    {
        return Cow::query()->where('code', '<=', $cow->code)->count() - 1;
    }
}
