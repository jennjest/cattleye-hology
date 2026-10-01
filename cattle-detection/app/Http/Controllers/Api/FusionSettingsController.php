<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EdgeFusionSettingsService;
use Illuminate\Http\JsonResponse;

/**
 * Fusion settings for the edge computer.
 *
 * Lives with the other device endpoints so the Pi can poll it with the same
 * bearer token it already uses for ingestion, and no second secret has to be
 * configured on the farm network.
 */
class FusionSettingsController extends Controller
{
    public function __construct(private readonly EdgeFusionSettingsService $edge) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->edge->desired(),
        ]);
    }
}
