<?php

namespace Tests\Feature\Api;

use App\Models\Cow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class VisionDataTest extends TestCase
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
        return $this->postJson(route('api.vision-data.store'), $payload, [
            'Authorization' => 'Bearer test-device-token',
        ]);
    }

    public function test_it_requires_a_device_token(): void
    {
        $this->postJson(route('api.vision-data.store'), [])->assertUnauthorized();
    }

    public function test_it_stores_a_prediction(): void
    {
        $this->postPayload([
            'cow_id' => 'cow01',
            'label' => 'PMK',
            'confidence' => 0.91,
        ])->assertCreated()
            ->assertJsonPath('data.label', 'PMK')
            ->assertJsonPath('data.confidence', 0.91);

        $this->assertDatabaseHas('vision_predictions', [
            'cow_id' => 1,
            'label' => 'PMK',
            'confidence' => 0.9100,
        ]);
    }

    public function test_it_requires_a_label_and_confidence(): void
    {
        $this->postPayload(['cow_id' => 'cow01'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['label', 'confidence']);
    }

    public function test_it_rejects_an_out_of_range_confidence(): void
    {
        $this->postPayload(['cow_id' => 'cow01', 'label' => 'Normal', 'confidence' => 1.4])
            ->assertStatus(422)
            ->assertJsonValidationErrors('confidence');
    }

    public function test_it_rejects_an_unknown_label(): void
    {
        $this->postPayload(['cow_id' => 'cow01', 'label' => 'FMD', 'confidence' => 0.8])
            ->assertStatus(422)
            ->assertJsonValidationErrors('label');
    }
}
