<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreRiskAssessmentRequest;
use App\Http\Resources\RiskAssessmentResource;
use App\Services\TelemetryIngestionService;
use Illuminate\Http\JsonResponse;

class RiskAssessmentController extends Controller
{
    public function __construct(private readonly TelemetryIngestionService $ingestion) {}

    /**
     * Store a standalone sensor fusion result from the Raspberry Pi.
     */
    public function store(StoreRiskAssessmentRequest $request): JsonResponse
    {
        $assessment = $this->ingestion->ingestRiskAssessment($request->validated());

        return response()->json([
            'data' => (new RiskAssessmentResource($assessment))->resolve(),
            'message' => 'Risk assessment stored.',
        ], 201);
    }
}
