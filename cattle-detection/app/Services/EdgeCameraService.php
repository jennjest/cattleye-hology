<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Talks to the Raspberry Pi's FastAPI server (see cattleye/main.py).
 *
 * The Pi owns all video processing: the dashboard only renders what the Pi
 * already produces, so there is no inference or frame buffering here.
 */
class EdgeCameraService
{
    /**
     * Absolute URL of the MJPEG feed, loaded straight into an <img> element.
     *
     * The feed is deliberately not proxied. Piping a continuous multipart
     * stream through PHP would buffer frames and break the live feel, and the
     * operator's browser already sits on the same LAN as the Pi.
     */
    public function streamUrl(): string
    {
        return $this->baseUrl().config('cattleye.edge.stream_path');
    }

    /**
     * Latest fusion state reported by the Pi, used by the live panel to show
     * inputs the database only sees once they have been ingested.
     *
     * @return array{reachable: bool, state: ?array<string, mixed>}
     */
    public function status(): array
    {
        $cacheKey = 'cattleye:edge:state';
        $seconds = (int) config('cattleye.edge.cache_seconds');

        $resolved = Cache::remember($cacheKey, $seconds, function (): array {
            try {
                $response = Http::timeout((int) config('cattleye.edge.timeout'))
                    ->acceptJson()
                    ->get($this->baseUrl().config('cattleye.edge.state_path'));

                if (! $response->successful()) {
                    return ['reachable' => false, 'state' => null];
                }

                return ['reachable' => true, 'state' => $response->json()];
            } catch (Throwable) {
                // Pi offline, wrong address or timeout: the dashboard shows it.
                return ['reachable' => false, 'state' => null];
            }
        });

        /** @var array{reachable: bool, state: ?array<string, mixed>} $resolved */
        return $resolved;
    }

    private function baseUrl(): string
    {
        return (string) config('cattleye.edge.base_url');
    }
}
