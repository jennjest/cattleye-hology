<?php

namespace Tests\Feature\Api;

use App\Models\Cow;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_read_the_population_summary(): void
    {
        $this->getJson(route('api.analytics.summary'))->assertUnauthorized();
    }

    public function test_it_averages_temperature_per_day_and_activity_per_bucket(): void
    {
        $cow = Cow::factory()->withCode('cow01')->create();

        $cow->sensorReadings()->createMany([
            [
                'temperature' => 38.0,
                'activity' => ['score' => 30.0],
                'recorded_at' => now()->setTime(1, 0),
            ],
            [
                'temperature' => 40.0,
                'activity' => ['score' => 70.0],
                'recorded_at' => now()->setTime(3, 0),
            ],
        ]);

        $response = $this->actingAs(User::factory()->create())
            ->getJson(route('api.analytics.summary', ['days' => 1]))
            ->assertOk()
            ->assertJsonPath('data.window.days', 1)
            ->assertJsonCount(1, 'data.daily')
            ->assertJsonCount(12, 'data.hourly_activity');

        $daily = $response->json('data.daily.0');

        $this->assertSame(39.0, (float) $daily['avg_temperature']);
        $this->assertNull($daily['avg_risk_score']);

        $activity = collect($response->json('data.hourly_activity'))
            ->keyBy('hour');

        $this->assertSame(30.0, (float) $activity[0]['score']);
        $this->assertSame(70.0, (float) $activity[2]['score']);
        $this->assertNull($activity[4]['score']);
    }

    public function test_it_clamps_the_requested_window(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson(route('api.analytics.summary', ['days' => 9999]))
            ->assertOk()
            ->assertJsonPath('data.window.days', 90);

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.analytics.summary', ['days' => 0]))
            ->assertOk()
            ->assertJsonPath('data.window.days', 1);
    }
}
