<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEdgeStateRequest;
use App\Http\Resources\RiskAssessmentResource;
use App\Http\Resources\SensorReadingResource;
use App\Http\Resources\VisionPredictionResource;
use App\Services\TelemetryIngestionService;
use Illuminate\Http\JsonResponse;

/**
 * Accepts the complete edge snapshot published by the Raspberry Pi.
 *
 * Unlike `POST /api/sensor-data`, this endpoint mirrors the nested `latest_state`
 * dictionary returned by the Pi's own `GET /api/data`, so `cattleye/bridge_to_laravel.py`
 * can forward a state snapshot without reshaping it first.
 */
class EdgeStateController extends Controller
{
    public function __construct(private readonly TelemetryIngestionService $ingestion) {}

    public function store(StoreEdgeStateRequest $request): JsonResponse
    {
        $stored = $this->ingestion->ingestEdgeState($request->validated());

        return response()->json([
            'data' => [
                'sensor_reading' => $stored['sensor_reading'] === null
                    ? null
                    : (new SensorReadingResource($stored['sensor_reading']))->resolve(),
                'vision_prediction' => $stored['vision_prediction'] === null
                    ? null
                    : (new VisionPredictionResource($stored['vision_prediction']))->resolve(),
                'risk_assessment' => $stored['risk_assessment'] === null
                    ? null
                    : (new RiskAssessmentResource($stored['risk_assessment']))->resolve(),
            ],
            'message' => 'Edge state stored.',
        ], 201);
    }
}
