<?php

namespace Database\Factories;

use App\Enums\VisionLabel;
use App\Models\Cow;
use App\Models\VisionPrediction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VisionPrediction>
 */
class VisionPredictionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'cow_id' => Cow::factory(),
            'label' => VisionLabel::Normal,
            'confidence' => $this->faker->randomFloat(4, 0.7, 0.99),
            'recorded_at' => now(),
        ];
    }

    public function pmk(float $confidence = 0.91): static
    {
        return $this->state(fn (array $attributes): array => [
            'label' => VisionLabel::Pmk,
            'confidence' => $confidence,
        ]);
    }
}
