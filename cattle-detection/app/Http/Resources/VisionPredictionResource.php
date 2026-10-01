<?php

namespace App\Http\Resources;

use App\Models\VisionPrediction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VisionPrediction
 */
class VisionPredictionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label->value,
            'confidence' => $this->confidence,
            'p_pmk' => $this->p_pmk,
            'recorded_at' => $this->recorded_at->toIso8601String(),
        ];
    }
}
