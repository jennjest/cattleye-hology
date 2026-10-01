<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CowHistoryRequest;
use App\Http\Resources\CowResource;
use App\Http\Support\CowSnapshot;
use App\Models\Cow;
use App\Services\CowMonitoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CowController extends Controller
{
    public function __construct(private readonly CowMonitoringService $monitoring) {}

    /**
     * List every cow. When the latest relations are eager loaded the response
     * also carries each cow's newest telemetry, so the dashboard table needs a
     * single request instead of one per cow.
     */
    public function index(): AnonymousResourceCollection
    {
        $cows = Cow::query()
            ->with(['latestSensorReading', 'latestVisionPrediction', 'latestRiskAssessment'])
            ->orderBy('code')
            ->get();

        return CowResource::collection($cows)
            ->additional(['message' => 'Cow list retrieved.']);
    }

    public function show(Cow $cow): CowResource
    {
        return (new CowResource($cow))->additional(['message' => 'Cow retrieved.']);
    }

    /**
     * Newest reading, prediction and risk assessment of a cow. Any part may be
     * null when the edge computer has not reported it yet.
     */
    public function latest(Cow $cow): JsonResponse
    {
        return response()->json([
            'data' => CowSnapshot::forCow($cow, $this->monitoring),
            'message' => 'Latest cow data retrieved.',
        ]);
    }

    /**
     * Chart-ready history for temperature, risk score and vision predictions.
     */
    public function history(CowHistoryRequest $request, Cow $cow): JsonResponse
    {
        $history = $this->monitoring->history(
            $cow,
            (int) $request->integer('hours', (int) config('cattleye.history_default_hours')),
            (int) $request->integer('limit', 500),
        );

        return response()->json([
            'data' => [
                'cow' => (new CowResource($cow))->resolve(),
                'window' => $history['window'],
                'temperature' => $history['temperature'],
                'risk_score' => $history['risk_score'],
                'vision' => $history['vision'],
            ],
            'message' => 'Cow history retrieved.',
        ]);
    }
}
