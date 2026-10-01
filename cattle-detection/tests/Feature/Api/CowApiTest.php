<?php

namespace Tests\Feature\Api;

use App\Models\Cow;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CowApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_read_cows(): void
    {
        $this->getJson(route('api.cows.index'))->assertUnauthorized();
    }

    public function test_it_lists_cows_with_their_latest_telemetry(): void
    {
        $cow = Cow::factory()->withCode('cow01')->create();
        $cow->sensorReadings()->create([
            'temperature' => 39.8,
            'ax' => 0.12,
            'ay' => -0.05,
            'az' => 9.81,
            'gx' => 0.01,
            'gy' => 0.02,
            'gz' => 0.0,
            'recorded_at' => now(),
        ]);

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.cows.index'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'cow01')
            ->assertJsonPath('data.0.latest.sensor_reading.temperature', 39.8)
            ->assertJsonPath('data.0.latest.vision_prediction', null)
            ->assertJsonPath('data.0.latest.risk_assessment', null);
    }

    public function test_it_returns_a_single_cow(): void
    {
        $cow = Cow::factory()->withCode('cow02')->create();

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.cows.show', $cow))
            ->assertOk()
            ->assertJsonPath('data.code', 'cow02');
    }

    public function test_it_returns_404_for_an_unknown_cow(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson(route('api.cows.show', 999))
            ->assertNotFound();
    }

    public function test_it_returns_the_latest_state_of_a_cow(): void
    {
        $cow = Cow::factory()->withCode('cow03')->create();

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.cows.latest', $cow))
            ->assertOk()
            ->assertJsonPath('data.cow.code', 'cow03')
            ->assertJsonPath('data.sensor_reading', null)
            ->assertJsonPath('data.vision_prediction', null)
            ->assertJsonPath('data.risk_assessment', null)
            ->assertJsonPath('data.is_stale', true);
    }

    public function test_it_marks_fresh_data_as_not_stale(): void
    {
        $cow = Cow::factory()->withCode('cow04')->create();
        $cow->sensorReadings()->create([
            'temperature' => 38.4,
            'recorded_at' => now(),
        ]);

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.cows.latest', $cow))
            ->assertOk()
            ->assertJsonPath('data.is_stale', false)
            ->assertJsonPath('data.sensor_reading.temperature', 38.4);
    }

    public function test_it_returns_history_series(): void
    {
        $cow = Cow::factory()->withCode('cow05')->create();

        $cow->sensorReadings()->create(['temperature' => 38.2, 'recorded_at' => now()->subHours(2)]);
        $cow->sensorReadings()->create(['temperature' => 39.4, 'recorded_at' => now()->subHour()]);
        $cow->sensorReadings()->create(['temperature' => 40.1, 'recorded_at' => now()->subDays(3)]);

        $cow->riskAssessments()->create([
            'score' => 78.4,
            'status' => 'Berisiko Tinggi',
            'reasons' => ['Suhu tinggi (derajat 0.83)'],
            'recorded_at' => now()->subHour(),
        ]);

        $response = $this->actingAs(User::factory()->create())
            ->getJson(route('api.cows.history', ['cow' => $cow, 'hours' => 24]));

        $response->assertOk()
            ->assertJsonPath('data.window.hours', 24)
            // The reading from three days ago falls outside the window.
            ->assertJsonCount(2, 'data.temperature')
            ->assertJsonPath('data.temperature.1.value', 39.4)
            ->assertJsonPath('data.risk_score.0.value', 78.4)
            ->assertJsonPath('data.risk_score.0.status', 'Berisiko Tinggi')
            ->assertJsonCount(0, 'data.vision');
    }

    public function test_it_validates_the_history_window(): void
    {
        $cow = Cow::factory()->create();

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.cows.history', ['cow' => $cow, 'hours' => 9999]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('hours');
    }
}
