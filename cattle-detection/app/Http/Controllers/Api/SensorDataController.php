<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreTelemetryRequest;
use App\Http\Resources\RiskAssessmentResource;
use App\Http\Resources\SensorReadingResource;
use App\Http\Resources\VisionPredictionResource;
use App\Services\TelemetryIngestionService;
use Illuminate\Http\JsonResponse;

class SensorDataController extends Controller
{
    public function __construct(private readonly TelemetryIngestionService $ingestion) {}

    /**
     * Store a wearable reading from the Raspberry Pi, plus the vision and risk
     * blocks when the device posts them together.
     */
    public function store(StoreTelemetryRequest $request): JsonResponse
    {
        $stored = $this->ingestion->ingestTelemetry($request->validated());

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
            'message' => 'Sensor data stored.',
        ], 201);
    }
}
