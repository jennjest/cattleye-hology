<?php

namespace App\Http\Resources;

use App\Models\RiskAssessment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RiskAssessment
 */
class RiskAssessmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'score' => $this->score,
            'status' => $this->status->value,
            'reasons' => $this->reasons ?? [],
            'missing' => $this->missing ?? [],
            'inputs' => $this->inputs,
            'recorded_at' => $this->recorded_at->toIso8601String(),
        ];
    }
}
