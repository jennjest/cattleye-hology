<?php

namespace App\Http\Resources;

use App\Models\SensorReading;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SensorReading
 */
class SensorReadingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'temperature' => $this->temperature,
            'ax' => $this->ax,
            'ay' => $this->ay,
            'az' => $this->az,
            'gx' => $this->gx,
            'gy' => $this->gy,
            'gz' => $this->gz,
            'activity' => $this->activity,
            'recorded_at' => $this->recorded_at->toIso8601String(),
        ];
    }
}
