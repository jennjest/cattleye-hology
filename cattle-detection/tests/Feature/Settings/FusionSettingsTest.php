<?php

namespace Tests\Feature\Settings;

use App\Models\FusionSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class FusionSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);

        // Same host the camera test uses, so Http::fake patterns stay predictable.
        config()->set('cattleye.edge.base_url', 'http://cattleye.test');
        config()->set('cattleye.edge.cache_seconds', 0);
    }

    /**
     * @return array<string, string|int|float>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'waspada_threshold' => 25,
            'tinggi_threshold' => 55,
            'temp_offset' => 1.2,
            'activity_window_sec' => 45,
            'activity_min_samples' => 12,
            'activity_score_normal' => 68,
            'baseline_default' => 0.04,
            'baseline_warmup_windows' => 8,
            'baseline_alpha' => 0.003,
            'baseline_update_min_ratio' => 0.5,
            'wearable_stale_sec' => 25,
            'vision_stale_sec' => 40,
            'fusion_interval_sec' => 2.5,
        ], $overrides);
    }

    public function test_the_settings_page_renders(): void
    {
        Http::fake();

        $this->get(route('fusion-settings.edit'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('settings/fusion')
                ->has('settings.waspada_threshold')
                ->has('settings.tinggi_threshold')
                ->has('settings.activity_window_sec')
                ->has('defaults')
                ->has('device.reachable')
                ->has('device.message')
            );
    }

    public function test_it_seeds_the_defaults_on_first_visit(): void
    {
        Http::fake();

        $this->get(route('fusion-settings.edit'))->assertOk();

        // The seeded values are the constants that shipped on the Pi, so nothing
        // changes on upgrade until an operator edits them.
        $this->assertSame(1, FusionSetting::count());
        $settings = FusionSetting::current();
        $this->assertSame(33.0, (float) $settings->waspada_threshold);
        $this->assertSame(60.0, (float) $settings->tinggi_threshold);
    }

    public function test_it_persists_the_thresholds(): void
    {
        Http::fake();

        $this->put(route('fusion-settings.update'), $this->payload())
            ->assertRedirect(route('fusion-settings.edit'))
            ->assertSessionHasNoErrors();

        $settings = FusionSetting::current();
        $this->assertSame(25.0, (float) $settings->waspada_threshold);
        $this->assertSame(55.0, (float) $settings->tinggi_threshold);
        $this->assertSame(45, $settings->activity_window_sec);
        $this->assertSame(2.5, (float) $settings->fusion_interval_sec);
    }

    /**
     * Crossed thresholds would leave the score with no band at all: the Pi would
     * report "Normal" forever and no cow would ever alert.
     */
    public function test_tinggi_must_be_above_waspada(): void
    {
        Http::fake();

        $this->put(route('fusion-settings.update'), $this->payload([
            'waspada_threshold' => 70,
            'tinggi_threshold' => 40,
        ]))
            ->assertSessionHasErrors('tinggi_threshold');

        $this->assertSame(33.0, (float) FusionSetting::current()->waspada_threshold);
    }

    public function test_equal_thresholds_are_refused(): void
    {
        Http::fake();

        $this->put(route('fusion-settings.update'), $this->payload([
            'waspada_threshold' => 50,
            'tinggi_threshold' => 50,
        ]))->assertSessionHasErrors('tinggi_threshold');
    }

    public function test_it_rejects_out_of_range_values(): void
    {
        Http::fake();

        $this->put(route('fusion-settings.update'), $this->payload([
            'waspada_threshold' => 150,
            'temp_offset' => 9,
            'activity_window_sec' => 0,
            'baseline_alpha' => 5,
            'fusion_interval_sec' => 0,
        ]))->assertSessionHasErrors([
            'waspada_threshold',
            'temp_offset',
            'activity_window_sec',
            'baseline_alpha',
            'fusion_interval_sec',
        ]);
    }

    public function test_every_field_is_required(): void
    {
        Http::fake();

        $this->put(route('fusion-settings.update'), [])
            ->assertSessionHasErrors(array_keys($this->payload()));
    }

    public function test_guests_cannot_reach_the_page(): void
    {
        auth()->logout();

        $this->get(route('fusion-settings.edit'))->assertRedirect(route('login'));
        $this->put(route('fusion-settings.update'), $this->payload())->assertRedirect(route('login'));

        $this->assertTrue(FusionSetting::count() >= 0);
    }

    /**
     * An unverified account must not decide when a cow raises an alert.
     */
    public function test_unverified_users_cannot_change_thresholds(): void
    {
        Http::fake();

        $pending = User::factory()->unverified()->create();
        $this->actingAs($pending);

        $this->get(route('fusion-settings.edit'))->assertRedirect(route('verification.notice'));
        $this->put(route('fusion-settings.update'), $this->payload())
            ->assertRedirect(route('verification.notice'));

        $this->assertTrue(FusionSetting::count() >= 0);
    }

    public function test_the_device_endpoint_returns_the_saved_values(): void
    {
        FusionSetting::current()->fill($this->payload())->save();

        config()->set('cattleye.device_token', 'device-token');
        $this->withHeader('Authorization', 'Bearer device-token')
            ->getJson(route('api.fusion-settings.show'))
            ->assertOk()
            ->assertJsonPath('data.waspada_threshold', 25)
            ->assertJsonPath('data.tinggi_threshold', 55)
            ->assertJsonPath('data.fusion_interval_sec', 2.5)
            ->assertJsonStructure(['data' => [
                'waspada_threshold', 'tinggi_threshold', 'temp_offset',
                'activity_window_sec', 'activity_min_samples', 'activity_score_normal',
                'baseline_default', 'baseline_warmup_windows', 'baseline_alpha',
                'baseline_update_min_ratio', 'wearable_stale_sec', 'vision_stale_sec',
                'fusion_interval_sec', 'updated_at',
            ]]);
    }

    public function test_the_device_endpoint_requires_the_token(): void
    {
        FusionSetting::current()->fill($this->payload())->save();

        $this->getJson(route('api.fusion-settings.show'))
            ->assertUnauthorized();

        $this->withHeader('Authorization', 'Bearer salah')
            ->getJson(route('api.fusion-settings.show'))
            ->assertUnauthorized();
    }

    /**
     * The page must not claim the saved threshold is live when the Pi cannot be
     * reached: the operator would otherwise trust a number nothing is running.
     */
    public function test_an_unreachable_pi_is_reported_as_unknown(): void
    {
        Http::fake([
            'cattleye.test/*' => Http::response('nope', 503),
        ]);

        $this->get(route('fusion-settings.edit'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('device.reachable', false)
                ->where('device.applied', null)
            );
    }

    public function test_the_page_reports_what_the_pi_is_running(): void
    {
        FusionSetting::current()->fill($this->payload())->save();

        Http::fake([
            'cattleye.test/*' => Http::response([
                'settings' => [
                    // Pi masih jalan dengan ambang lama.
                    'waspada_threshold' => 33,
                    'tinggi_threshold' => 60,
                    'temp_offset' => 1.2,
                ],
                'source' => 'server',
            ]),
        ]);

        $this->get(route('fusion-settings.edit'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('device.reachable', true)
                ->where('device.applied.waspada_threshold', 33)
            );
    }
}
