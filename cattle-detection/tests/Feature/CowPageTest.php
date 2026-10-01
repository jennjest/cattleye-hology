<?php

namespace Tests\Feature;

use App\Enums\RiskStatus;
use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\SensorReading;
use App\Models\User;
use App\Models\VisionPrediction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CowPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $cow = Cow::factory()->create();

        $this->get(route('cows.show', $cow))->assertRedirect(route('login'));
    }

    public function test_it_renders_the_page_with_the_latest_snapshot(): void
    {
        $cow = Cow::factory()->create(['code' => 'cow01', 'name' => 'Sapi 01']);

        SensorReading::factory()->for($cow)->create([
            'temperature' => 38.5,
            'recorded_at' => now(),
        ]);

        VisionPrediction::factory()->for($cow)->create([
            'label' => 'Normal',
            'confidence' => 0.91,
            'recorded_at' => now(),
        ]);

        RiskAssessment::factory()->for($cow)->create([
            'score' => 42.5,
            'status' => RiskStatus::Waspada,
            'reasons' => ['Suhu di atas batas aman'],
            'recorded_at' => now(),
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('cows.show', $cow))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('cows/show')
                ->where('snapshot.cow.code', 'cow01')
                ->where('snapshot.cow.name', 'Sapi 01')
                ->where('snapshot.sensor_reading.temperature', 38.5)
                ->where('snapshot.vision_prediction.label', 'Normal')
                ->where('snapshot.vision_prediction.confidence', 0.91)
                ->where('snapshot.risk_assessment.score', 42.5)
                ->where('snapshot.risk_assessment.status', RiskStatus::Waspada->value)
                ->where('snapshot.risk_assessment.reasons.0', 'Suhu di atas batas aman')
                ->where('snapshot.is_stale', false)
            );
    }

    public function test_it_renders_a_cow_that_has_never_reported_as_missing_data(): void
    {
        $cow = Cow::factory()->create();

        $this->actingAs(User::factory()->create())
            ->get(route('cows.show', $cow))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('cows/show')
                ->where('snapshot.sensor_reading', null)
                ->where('snapshot.vision_prediction', null)
                ->where('snapshot.risk_assessment', null)
                ->where('snapshot.is_stale', true)
            );
    }

    public function test_it_marks_a_cow_as_stale_when_the_last_reading_is_old(): void
    {
        config(['cattleye.stale_after_seconds' => 30]);

        $cow = Cow::factory()->create();

        SensorReading::factory()->for($cow)->create([
            'recorded_at' => now()->subMinutes(5),
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('cows.show', $cow))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('snapshot.is_stale', true)
            );
    }

    public function test_it_returns_not_found_for_an_unknown_cow(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('cows.show', 9999))
            ->assertNotFound();
    }
}
