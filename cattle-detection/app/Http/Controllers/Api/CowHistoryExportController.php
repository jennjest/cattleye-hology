<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CowHistoryRequest;
use App\Models\Cow;
use App\Services\CowHistoryExportService;
use Illuminate\Support\Carbon;

/**
 * CSV download of a cow's telemetry history.
 *
 * Separate from CowController because this action returns a file instead of JSON
 * and deliberately lives outside the read API prefix, so the browser can follow
 * the link directly.
 */
class CowHistoryExportController extends Controller
{
    public function __construct(private readonly CowHistoryExportService $exports) {}

    public function __invoke(CowHistoryRequest $request, Cow $cow): mixed
    {
        $hours = (int) $request->integer('hours', (int) config('cattleye.history_default_hours'));

        $until = Carbon::now();

        return $this->exports->toCsv($cow, $until->copy()->subHours($hours), $until);
    }
}
