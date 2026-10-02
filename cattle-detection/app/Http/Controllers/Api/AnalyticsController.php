<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CowMonitoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    /** Guard rail matching the widest window the UI offers (90 days). */
    private const MAX_DAYS = 90;

    /** Window used when the client does not ask for one. */
    private const DEFAULT_DAYS = 30;

    public function __construct(private readonly CowMonitoringService $monitoring) {}

    /**
     * Herd-wide trend series for the analytics dashboard.
     *
     * Everything is derived from stored telemetry, so the endpoint stays a pure
     * read: no aggregation is cached, because the underlying rows change every
     * second anyway.
     */
    public function summary(Request $request): JsonResponse
    {
        $days = (int) $request->integer('days', self::DEFAULT_DAYS);
        $days = max(1, min($days, self::MAX_DAYS));

        return response()->json([
            'data' => $this->monitoring->populationSummary($days),
            'message' => 'Population summary retrieved.',
        ]);
    }
}
