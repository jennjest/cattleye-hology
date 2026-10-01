<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreVisionDataRequest;
use App\Http\Resources\VisionPredictionResource;
use App\Services\TelemetryIngestionService;
use Illuminate\Http\JsonResponse;

class VisionDataController extends Controller
{
    public function __construct(private readonly TelemetryIngestionService $ingestion) {}

    /**
     * Store a standalone computer vision result from the Raspberry Pi.
     */
    public function store(StoreVisionDataRequest $request): JsonResponse
    {
        $prediction = $this->ingestion->ingestVision($request->validated());

        return response()->json([
            'data' => (new VisionPredictionResource($prediction))->resolve(),
            'message' => 'Vision data stored.',
        ], 201);
    }
}
