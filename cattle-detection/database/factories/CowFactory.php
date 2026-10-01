<?php

namespace Database\Factories;

use App\Models\Cow;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Cow>
 */
class CowFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = $this->faker->unique()->numberBetween(1, 9999);

        return [
            'code' => 'cow'.$number,
            'name' => 'Sapi '.$number,
        ];
    }

    public function withCode(string $code): static
    {
        return $this->state(fn (array $attributes): array => [
            'code' => $code,
            'name' => 'Sapi '.Str::after($code, 'cow'),
        ]);
    }
}
