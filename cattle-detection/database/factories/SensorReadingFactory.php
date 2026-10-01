<?php

namespace Database\Factories;

use App\Models\Cow;
use App\Models\SensorReading;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SensorReading>
 */
class SensorReadingFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'cow_id' => Cow::factory(),
            // Body temperature of a healthy cow sits around 38.5 °C.
            'temperature' => $this->faker->randomFloat(2, 37.5, 39.5),
            'ax' => $this->faker->randomFloat(4, -2, 2),
            'ay' => $this->faker->randomFloat(4, -2, 2),
            'az' => $this->faker->randomFloat(4, 8, 10),
            'gx' => $this->faker->randomFloat(4, -5, 5),
            'gy' => $this->faker->randomFloat(4, -5, 5),
            'gz' => $this->faker->randomFloat(4, -5, 5),
            'recorded_at' => now(),
        ];
    }
}
