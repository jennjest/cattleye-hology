<?php

namespace App\Http\Resources;

use App\Models\Cow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cow
 */
class CowResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            // Only present when the caller eager loaded the latest relations,
            // which keeps this endpoint useful for plain listings too.
            'latest' => $this->when(
                $this->relationLoaded('latestSensorReading'),
                fn (): array => [
                    'sensor_reading' => $this->latestSensorReading === null
                        ? null
                        : new SensorReadingResource($this->latestSensorReading),
                    'vision_prediction' => $this->latestVisionPrediction === null
                        ? null
                        : new VisionPredictionResource($this->latestVisionPrediction),
                    'risk_assessment' => $this->latestRiskAssessment === null
                        ? null
                        : new RiskAssessmentResource($this->latestRiskAssessment),
                ],
            ),
        ];
    }
}
