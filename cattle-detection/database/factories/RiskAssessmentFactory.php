<?php

namespace Database\Factories;

use App\Enums\RiskStatus;
use App\Models\Cow;
use App\Models\RiskAssessment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RiskAssessment>
 */
class RiskAssessmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'cow_id' => Cow::factory(),
            'score' => $this->faker->randomFloat(1, 0, 32),
            'status' => RiskStatus::Normal,
            'reasons' => [],
            'recorded_at' => now(),
        ];
    }

    /**
     * @param  array<int, string>  $reasons
     */
    public function withRisk(float $score, RiskStatus $status, array $reasons = []): static
    {
        return $this->state(fn (array $attributes): array => [
            'score' => $score,
            'status' => $status,
            'reasons' => $reasons,
        ]);
    }
}
