<?php

namespace Tests\Feature\Api;

use App\Models\Cow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RiskAssessmentTest extends TestCase
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
        return $this->postJson(route('api.risk-assessments.store'), $payload, [
            'Authorization' => 'Bearer test-device-token',
        ]);
    }

    public function test_it_requires_a_device_token(): void
    {
        $this->postJson(route('api.risk-assessments.store'), [])->assertUnauthorized();
    }

    public function test_it_stores_a_fusion_result(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'score' => 78.4,
            'status' => 'Berisiko Tinggi',
            'reasons' => ['Suhu tinggi (derajat 0.83)', 'Aktivitas rendah (derajat 0.67)'],
        ])->assertCreated()
            ->assertJsonPath('data.score', 78.4)
            ->assertJsonPath('data.status', 'Berisiko Tinggi')
            ->assertJsonCount(2, 'data.reasons');
    }

    public function test_it_accepts_the_no_data_status_sent_by_the_pi(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'score' => 0,
            'status' => 'Tidak Ada Data',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'Tidak Ada Data')
            ->assertJsonPath('data.reasons', []);
    }

    public function test_it_requires_a_score_and_status(): void
    {
        $this->postPayload(['cow_id' => 'cow01'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['score', 'status']);
    }

    public function test_it_rejects_an_out_of_range_score(): void
    {
        $this->postPayload(['cow_id' => 'cow01', 'score' => 140, 'status' => 'Normal'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('score');
    }

    public function test_it_rejects_an_unknown_status(): void
    {
        $this->postPayload(['cow_id' => 'cow01', 'score' => 10, 'status' => 'Awas'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_it_rejects_non_string_reasons(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'score' => 10,
            'status' => 'Normal',
            'reasons' => [['nested']],
        ])->assertStatus(422)->assertJsonValidationErrors('reasons.0');
    }
}
