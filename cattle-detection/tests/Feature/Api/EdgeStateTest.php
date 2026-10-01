<?php

namespace Tests\Feature\Api;

use App\Models\Cow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class EdgeStateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('cattleye.device_token', 'test-device-token');
        Cow::factory()->withCode('cow01')->create();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function postEdgeState(array $payload): TestResponse
    {
        return $this->postJson(route('api.edge-state.store'), $payload, [
            'Authorization' => 'Bearer test-device-token',
        ]);
    }

    public function test_it_requires_a_device_token(): void
    {
        $this->postJson(route('api.edge-state.store'), [])->assertUnauthorized();
    }

    public function test_it_rejects_an_unknown_cow_code(): void
    {
        $this->postEdgeState([
            'cow_id' => 'cow99',
            'wearable' => ['temperature' => 38.4],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('cow_id');
    }

    public function test_it_requires_the_wearable_block(): void
    {
        $this->postEdgeState(['cow_id' => 'cow01'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('wearable');
    }

    public function test_it_rejects_a_vision_confidence_without_a_label(): void
    {
        $this->postEdgeState([
            'cow_id' => 'cow01',
            'wearable' => ['temperature' => 38.4],
            'vision' => ['confidence' => 0.9, 'timestamp' => Carbon::now()->getTimestamp()],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('vision.label');
    }

    /**
     * The bridge forwards `latest_state` verbatim, including the activity window
     * and the fusion bookkeeping, so all of it must survive the round trip.
     */
    public function test_it_stores_a_full_edge_snapshot_from_the_pi(): void
    {
        $now = 1759286400;

        $this->postEdgeState([
            'cow_id' => 'cow01',
            'wearable' => [
                'temperature' => 39.8,
                'ax' => 0.12, 'ay' => -0.05, 'az' => 9.81,
                'gx' => 0.01, 'gy' => 0.02, 'gz' => 0.0,
                'timestamp' => (float) $now,
            ],
            'activity' => [
                'std_g' => 0.042, 'ratio' => 1.4, 'score' => 12.5,
                'baseline' => 0.05, 'baseline_ready' => true, 'samples' => 30,
            ],
            'vision' => [
                'label' => 'PMK', 'confidence' => 0.91, 'p_pmk' => 0.9132,
                'timestamp' => (float) ($now + 2),
            ],
            'risk' => [
                'score' => 78.4, 'status' => 'Berisiko Tinggi',
                'reasons' => ['Suhu tinggi (derajat 0.83)', 'Visual PMK (derajat 0.91)'],
                'missing' => ['aktivitas'],
                'inputs' => ['suhu' => 39.8, 'aktivitas' => null, 'visual' => 0.913],
                'timestamp' => (float) ($now + 3),
            ],
        ])->assertCreated()
            ->assertJsonPath('data.sensor_reading.temperature', 39.8)
            ->assertJsonPath('data.sensor_reading.activity.score', 12.5)
            ->assertJsonPath('data.vision_prediction.label', 'PMK')
            ->assertJsonPath('data.vision_prediction.p_pmk', 0.9132)
            ->assertJsonPath('data.risk_assessment.status', 'Berisiko Tinggi')
            ->assertJsonPath('data.risk_assessment.missing.0', 'aktivitas')
            ->assertJsonPath('data.risk_assessment.inputs.visual', 0.913);

        $this->assertDatabaseCount('sensor_readings', 1);
        $this->assertDatabaseCount('vision_predictions', 1);
        $this->assertDatabaseCount('risk_assessments', 1);

        $this->assertDatabaseHas('sensor_readings', [
            'recorded_at' => Carbon::createFromTimestamp($now)->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * `latest_state` starts life with untimestamped placeholders. Polling the Pi
     * before the camera or fusion loop has produced anything must not fill the
     * database with empty rows.
     */
    public function test_it_ignores_untimestamped_placeholder_blocks(): void
    {
        $this->postEdgeState([
            'cow_id' => 'cow01',
            'wearable' => [
                'temperature' => null, 'ax' => null, 'ay' => null, 'az' => null,
                'gx' => null, 'gy' => null, 'gz' => null, 'timestamp' => null,
            ],
            'vision' => ['label' => 'Unknown', 'confidence' => 0.0, 'p_pmk' => null],
            'risk' => ['score' => 0, 'status' => 'Tidak Ada Data', 'reasons' => []],
        ])->assertCreated()
            ->assertJsonPath('data.sensor_reading', null)
            ->assertJsonPath('data.vision_prediction', null)
            ->assertJsonPath('data.risk_assessment', null);

        $this->assertDatabaseCount('sensor_readings', 0);
        $this->assertDatabaseCount('vision_predictions', 0);
        $this->assertDatabaseCount('risk_assessments', 0);
    }

    public function test_it_stores_a_wearable_only_snapshot(): void
    {
        $this->postEdgeState([
            'cow_id' => 'cow01',
            'wearable' => ['temperature' => 38.4, 'az' => 9.8],
        ])->assertCreated()
            ->assertJsonPath('data.sensor_reading.temperature', 38.4)
            ->assertJsonPath('data.sensor_reading.activity', null)
            ->assertJsonPath('data.vision_prediction', null);

        $this->assertDatabaseCount('sensor_readings', 1);
    }

    public function test_it_rejects_out_of_range_fusion_values(): void
    {
        $this->postEdgeState([
            'cow_id' => 'cow01',
            'wearable' => ['temperature' => 38.4],
            'risk' => ['score' => 140, 'status' => 'Normal', 'timestamp' => 1759286400],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('risk.score');
    }
}
