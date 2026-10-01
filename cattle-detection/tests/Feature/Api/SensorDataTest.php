<?php

namespace Tests\Feature\Api;

use App\Models\Cow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SensorDataTest extends TestCase
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
    private function postPayload(array $payload): TestResponse
    {
        return $this->postJson(route('api.sensor-data.store'), $payload, [
            'Authorization' => 'Bearer test-device-token',
        ]);
    }

    public function test_it_requires_a_device_token(): void
    {
        $this->postJson(route('api.sensor-data.store'), [])->assertUnauthorized();
    }

    public function test_it_rejects_a_wrong_device_token(): void
    {
        $this->postJson(route('api.sensor-data.store'), [], [
            'Authorization' => 'Bearer wrong-token',
        ])->assertUnauthorized();
    }

    public function test_it_fails_closed_when_no_token_is_configured(): void
    {
        config()->set('cattleye.device_token', null);

        $this->postJson(route('api.sensor-data.store'), [])->assertStatus(503);
    }

    public function test_it_stores_a_full_payload_from_the_pi(): void
    {
        $response = $this->postPayload([
            'cow_id' => 'cow01',
            'temperature' => 39.8,
            'ax' => 0.12,
            'ay' => -0.05,
            'az' => 9.81,
            'gx' => 0.01,
            'gy' => 0.02,
            'gz' => 0.0,
            'vision_label' => 'PMK',
            'vision_confidence' => 0.91,
            'risk_score' => 78.4,
            'risk_status' => 'Berisiko Tinggi',
            'risk_reasons' => ['Suhu tinggi (derajat 0.83)', 'Visual PMK (derajat 0.91)'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.sensor_reading.temperature', 39.8)
            ->assertJsonPath('data.sensor_reading.az', 9.81)
            ->assertJsonPath('data.vision_prediction.label', 'PMK')
            ->assertJsonPath('data.vision_prediction.confidence', 0.91)
            ->assertJsonPath('data.risk_assessment.score', 78.4)
            ->assertJsonPath('data.risk_assessment.status', 'Berisiko Tinggi')
            ->assertJsonCount(2, 'data.risk_assessment.reasons');

        $this->assertDatabaseCount('sensor_readings', 1);
        $this->assertDatabaseCount('vision_predictions', 1);
        $this->assertDatabaseCount('risk_assessments', 1);
    }

    public function test_it_stores_a_wearable_only_payload(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'temperature' => 38.4,
            'ax' => 0.1,
            'ay' => 0.0,
            'az' => 9.8,
            'gx' => 0.0,
            'gy' => 0.0,
            'gz' => 0.0,
        ])->assertCreated()
            ->assertJsonPath('data.sensor_reading.temperature', 38.4)
            ->assertJsonPath('data.vision_prediction', null)
            ->assertJsonPath('data.risk_assessment', null);

        $this->assertDatabaseCount('sensor_readings', 1);
        $this->assertDatabaseCount('vision_predictions', 0);
        $this->assertDatabaseCount('risk_assessments', 0);
    }

    public function test_it_uses_recorded_at_when_supplied(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'temperature' => 38.4,
            'recorded_at' => '2026-10-01T08:00:00+00:00',
        ])->assertCreated();

        $this->assertDatabaseHas('sensor_readings', [
            'cow_id' => 1,
            'recorded_at' => '2026-10-01 08:00:00',
        ]);
    }

    public function test_it_rejects_an_unknown_cow(): void
    {
        $this->postPayload(['cow_id' => 'cow99', 'temperature' => 38.4])
            ->assertStatus(422)
            ->assertJsonValidationErrors('cow_id');
    }

    public function test_it_rejects_a_non_numeric_temperature(): void
    {
        $this->postPayload(['cow_id' => 'cow01', 'temperature' => 'warm'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('temperature');
    }

    public function test_it_rejects_an_out_of_range_temperature(): void
    {
        $this->postPayload(['cow_id' => 'cow01', 'temperature' => 900])
            ->assertStatus(422)
            ->assertJsonValidationErrors('temperature');
    }

    public function test_it_rejects_an_unknown_vision_label(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'temperature' => 38.4,
            'vision_label' => 'Brucellosis',
            'vision_confidence' => 0.8,
        ])->assertStatus(422)->assertJsonValidationErrors('vision_label');
    }

    public function test_it_rejects_an_unknown_risk_status(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'temperature' => 38.4,
            'risk_score' => 50,
            'risk_status' => 'Kritis',
        ])->assertStatus(422)->assertJsonValidationErrors('risk_status');
    }

    public function test_it_requires_a_status_when_a_score_is_sent(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'temperature' => 38.4,
            'risk_score' => 50,
        ])->assertStatus(422)->assertJsonValidationErrors('risk_status');
    }

    public function test_it_stores_nothing_when_validation_fails(): void
    {
        $this->postPayload(['cow_id' => 'cow99', 'temperature' => 'warm'])
            ->assertStatus(422);

        $this->assertDatabaseCount('sensor_readings', 0);
    }
}
