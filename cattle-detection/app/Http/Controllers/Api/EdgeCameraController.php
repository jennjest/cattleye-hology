<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EdgeStateResource;
use App\Services\EdgeCameraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Live view of the edge computer for the monitoring page.
 *
 * Reachable from the browser session, so it lives with the other dashboard read
 * endpoints in routes/web.php. An unreachable Pi is a normal state, not an error:
 * the response reports `reachable: false` so the UI can say so instead of failing.
 */
class EdgeCameraController extends Controller
{
    public function __construct(private readonly EdgeCameraService $edge) {}

    public function show(Request $request): JsonResponse
    {
        $status = $this->edge->status();

        return response()->json([
            'data' => [
                'stream_url' => $this->edge->streamUrl(),
                'reachable' => $status['reachable'],
                'state' => (new EdgeStateResource($status['state']))->jsonSerialize(),
            ],
        ]);
    }
}
