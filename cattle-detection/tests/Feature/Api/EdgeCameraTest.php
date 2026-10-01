<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EdgeCameraTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Trimmed copy of `latest_state` as published by cattleye/main.py.
     *
     * @return array<string, mixed>
     */
    private function piState(): array
    {
        return [
            'wearable' => [
                'temperature' => 38.4, 'ax' => 0.11, 'ay' => -0.03, 'az' => 9.8,
                'gx' => 0.01, 'gy' => 0.02, 'gz' => 0.0, 'timestamp' => 1759286400.0,
            ],
            'activity' => [
                'std_g' => 0.043, 'ratio' => 1.5, 'score' => 15.0,
                'baseline' => 0.05, 'baseline_ready' => true, 'samples' => 30,
            ],
            'vision' => [
                'label' => 'PMK', 'confidence' => 0.88, 'p_pmk' => 0.8801,
                'timestamp' => 1759286402.0,
            ],
            'risk' => [
                'score' => 71.2, 'status' => 'Berisiko Tinggi',
                'reasons' => ['Suhu tinggi (derajat 0.74)'], 'missing' => ['aktivitas'],
                'inputs' => ['suhu' => 38.4, 'aktivitas' => null, 'visual' => 0.8801],
                'timestamp' => 1759286403.0,
            ],
        ];
    }

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('cattleye.edge.base_url', 'http://192.168.1.212:8000');
        config()->set('cattleye.edge.cache_seconds', 0);
    }

    public function test_it_requires_authentication(): void
    {
        $this->getJson(route('api.edge.camera'))->assertUnauthorized();
    }

    public function test_it_exposes_the_mjpeg_stream_url(): void
    {
        Http::fake([$this->edgeUrl() => Http::response($this->piState())]);

        $this->actingAs($this->user())
            ->getJson(route('api.edge.camera'))
            ->assertOk()
            ->assertJsonPath('data.stream_url', 'http://192.168.1.212:8000/api/video_feed')
            ->assertJsonPath('data.reachable', true);
    }

    public function test_it_normalises_the_pi_state_for_the_dashboard(): void
    {
        Http::fake([$this->edgeUrl() => Http::response($this->piState())]);

        $this->actingAs($this->user())
            ->getJson(route('api.edge.camera'))
            ->assertOk()
            ->assertJsonPath('data.state.wearable.temperature', 38.4)
            ->assertJsonPath('data.state.activity.score', 15)
            ->assertJsonPath('data.state.activity.baseline_ready', true)
            ->assertJsonPath('data.state.vision.label', 'PMK')
            ->assertJsonPath('data.state.vision.p_pmk', 0.8801)
            ->assertJsonPath('data.state.risk.status', 'Berisiko Tinggi')
            ->assertJsonPath('data.state.risk.missing.0', 'aktivitas')
            ->assertJsonPath('data.state.risk.inputs.suhu', 38.4)
            // float epochs become ISO 8601 so the UI never parses them itself
            ->assertJsonPath('data.state.wearable.recorded_at', '2025-10-01T02:40:00+00:00');
    }

    /**
     * The Pi may simply be unplugged. That must read as "offline", not as a 500.
     */
    public function test_it_reports_an_unreachable_pi_without_failing(): void
    {
        Http::fake([$this->edgeUrl() => fn () => throw new ConnectionException('Connection refused')]);

        $this->actingAs($this->user())
            ->getJson(route('api.edge.camera'))
            ->assertOk()
            ->assertJsonPath('data.reachable', false)
            ->assertJsonPath('data.state', [
                'wearable' => null, 'activity' => null, 'vision' => null, 'risk' => null,
            ]);
    }

    public function test_it_treats_a_server_error_as_unreachable(): void
    {
        Http::fake([$this->edgeUrl() => Http::response('boom', 500)]);

        $this->actingAs($this->user())
            ->getJson(route('api.edge.camera'))
            ->assertOk()
            ->assertJsonPath('data.reachable', false);
    }

    /**
     * `latest_state` can briefly contain values that predate the backend schema,
     * e.g. a new label the Pi learned. The dashboard still has to render.
     */
    public function test_it_falls_back_to_safe_values_for_unknown_edge_data(): void
    {
        Http::fake([$this->edgeUrl() => Http::response([
            'wearable' => 'not-an-object',
            'vision' => ['label' => 'Kuku', 'confidence' => 2, 'timestamp' => null],
            'risk' => ['score' => 'x', 'status' => 'Gawat', 'reasons' => 'bukan-array'],
        ])]);

        $this->actingAs($this->user())
            ->getJson(route('api.edge.camera'))
            ->assertOk()
            ->assertJsonPath('data.state.wearable', null)
            ->assertJsonPath('data.state.vision.label', 'Unknown')
            ->assertJsonPath('data.state.vision.confidence', null)
            ->assertJsonPath('data.state.vision.recorded_at', null)
            ->assertJsonPath('data.state.risk.status', 'Tidak Ada Data')
            ->assertJsonPath('data.state.risk.reasons', []);
    }

    public function test_it_caches_the_pi_state_between_dashboards(): void
    {
        config()->set('cattleye.edge.cache_seconds', 30);
        Http::fake([$this->edgeUrl() => Http::response($this->piState())]);

        $this->actingAs($this->user())->getJson(route('api.edge.camera'))->assertOk();
        $this->actingAs($this->user())->getJson(route('api.edge.camera'))->assertOk();

        Http::assertSentCount(1);
    }

    private function edgeUrl(): string
    {
        return 'http://192.168.1.212:8000/api/data';
    }

    private function user(): User
    {
        return User::factory()->create();
    }
}
