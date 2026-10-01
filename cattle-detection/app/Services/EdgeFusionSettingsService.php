<?php

namespace App\Services;

use App\Models\FusionSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Reads the fusion settings the Raspberry Pi is actually running.
 *
 * The page needs this because a saved setting is not a live setting: the Pi
 * fetches the row on its own schedule, and if it is offline or still on the old
 * code, the dashboard would otherwise claim the threshold that no longer runs.
 * A missing device is reported as "unknown", never as a match.
 */
class EdgeFusionSettingsService
{
    /**
     * @return array{reachable: bool, applied: ?array<string, float|int|string|null>, message: ?string}
     */
    public function appliedOnDevice(): array
    {
        $base = (string) config('cattleye.edge.base_url');

        if ($base === '') {
            return $this->unknown('CATTLEYE_EDGE_URL belum diisi.');
        }

        try {
            $response = Http::acceptJson()
                ->timeout((int) config('cattleye.edge.timeout'))
                ->get($base.config('cattleye.edge.settings_path'));
        } catch (Throwable $e) {
            Log::debug('Fusion settings: Raspberry Pi unreachable.', ['message' => $e->getMessage()]);

            return $this->unknown('Raspberry Pi tidak dapat dihubungi.');
        }

        if (! $response->successful()) {
            return $this->unknown('Raspberry Pi menjawab HTTP '.$response->status().'.');
        }

        $applied = $response->json('settings');

        if (! is_array($applied)) {
            return $this->unknown('Format balasan Raspberry Pi tidak dikenali.');
        }

        return [
            'reachable' => true,
            'applied' => $applied,
            'message' => null,
        ];
    }

    /**
     * The values stored on the server, in the shape the Pi expects.
     *
     * @return array<string, float|int|string|null>
     */
    public function desired(): array
    {
        return FusionSetting::current()->toDevicePayload();
    }

    /**
     * @return array{reachable: bool, applied: null, message: string}
     */
    private function unknown(string $message): array
    {
        return ['reachable' => false, 'applied' => null, 'message' => $message];
    }
}
