<?php

namespace Tests\Feature;

use App\Enums\RiskStatus;
use App\Events\RiskAssessed;
use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\User;
use App\Notifications\RiskAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Alerts are raised from the ingestion pipeline, so these tests dispatch the
 * event the same way the service does and assert on what the farmer would get.
 */
class RiskAlertNotificationTest extends TestCase
{
    use RefreshDatabase;

    private Cow $cow;

    private User $recipient;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->cow = Cow::factory()->withCode('cow01')->create();
        $this->recipient = User::factory()->create();
    }

    private function assess(RiskStatus $status, float $score = 71.2): RiskAssessment
    {
        return RiskAssessment::factory()->for($this->cow)->create([
            'score' => $score,
            'status' => $status,
        ]);
    }

    public function test_it_alerts_when_a_cow_crosses_the_threshold(): void
    {
        $assessment = $this->assess(RiskStatus::BerisikoTinggi);

        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertSentTo(
            $this->recipient,
            RiskAlertNotification::class,
            function (RiskAlertNotification $notification): bool {
                return $notification->isRecovery === false
                    && $notification->cow->is($this->cow)
                    && str_contains($notification->toTelegram($this->recipient), 'PERINGATAN cow01');
            },
        );
    }

    public function test_it_stays_quiet_below_the_threshold(): void
    {
        $assessment = $this->assess(RiskStatus::Waspada, 45);

        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertNothingSent();
    }

    /**
     * The Pi reports a fusion result every second. Without a cooldown the farmer
     * would get thousands of identical messages an hour.
     */
    public function test_it_rate_limits_repeat_alerts_for_the_same_cow(): void
    {
        config()->set('cattleye.notifications.cooldown_minutes', 30);

        $assessment = $this->assess(RiskStatus::BerisikoTinggi);
        RiskAssessed::dispatch($this->cow, $assessment);

        // First alert sent; the level is remembered as "already alerting".
        $assessment = $this->assess(RiskStatus::BerisikoTinggi, 80.0);
        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertSentToTimes($this->recipient, RiskAlertNotification::class, 1);

        // Even a jump to the next level is suppressed inside the cooldown window.
        Cache::forget("cattleye:risk-level:cow:{$this->cow->id}");
        $assessment = $this->assess(RiskStatus::BerisikoTinggi, 95.0);
        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertSentToTimes($this->recipient, RiskAlertNotification::class, 1);
    }

    public function test_it_announces_a_recovery_once(): void
    {
        $assessment = $this->assess(RiskStatus::BerisikoTinggi);
        RiskAssessed::dispatch($this->cow, $assessment);

        $assessment = $this->assess(RiskStatus::Normal, 10.0);
        RiskAssessed::dispatch($this->cow, $assessment);

        // Still healthy on the next reading: no further messages.
        $assessment = $this->assess(RiskStatus::Normal, 8.0);
        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertSentToTimes($this->recipient, RiskAlertNotification::class, 2);

        Notification::assertSentTo(
            $this->recipient,
            RiskAlertNotification::class,
            fn (RiskAlertNotification $notification): bool => $notification->isRecovery,
        );
    }

    public function test_it_alerts_again_after_a_recovery(): void
    {
        $assessment = $this->assess(RiskStatus::BerisikoTinggi);
        RiskAssessed::dispatch($this->cow, $assessment);

        $assessment = $this->assess(RiskStatus::Normal);
        RiskAssessed::dispatch($this->cow, $assessment);

        $assessment = $this->assess(RiskStatus::BerisikoTinggi);
        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertSentToTimes($this->recipient, RiskAlertNotification::class, 3);
    }

    public function test_it_honours_a_custom_alert_status(): void
    {
        config()->set('cattleye.notifications.alert_status', 'Waspada');

        $assessment = $this->assess(RiskStatus::Waspada, 45);
        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertSentToTimes($this->recipient, RiskAlertNotification::class, 1);
    }

    /**
     * Losing the feed is an infrastructure problem, not a sick cow, so it must
     * not raise a health alert that nobody can act on.
     */
    public function test_it_never_alerts_on_missing_data(): void
    {
        $assessment = $this->assess(RiskStatus::TidakAdaData, 0);

        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertNothingSent();
    }

    public function test_it_skips_unverified_users(): void
    {
        $pending = User::factory()->unverified()->create();

        $assessment = $this->assess(RiskStatus::BerisikoTinggi);
        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertNotSentTo($pending, RiskAlertNotification::class);
        Notification::assertSentTo($this->recipient, RiskAlertNotification::class);
    }

    public function test_the_message_carries_the_fusion_context(): void
    {
        $assessment = RiskAssessment::factory()->for($this->cow)->create([
            'score' => 71.24,
            'status' => RiskStatus::BerisikoTinggi,
            'reasons' => ['Suhu tinggi (derajat 0.74)'],
            'missing' => ['aktivitas'],
        ]);

        $notification = new RiskAlertNotification($this->cow, $assessment, isRecovery: false);
        $message = $notification->toTelegram($this->recipient);

        $this->assertStringContainsString('Suhu tinggi (derajat 0.74)', $message);
        $this->assertStringContainsString('aktivitas', $message);
        $this->assertStringContainsString('71,2', $message);
    }

    /**
     * Telegram shows no subject line, so the warning label has to be in the body.
     * This is a regression guard rather than a restatement of the headline test:
     * removing it makes the farmer read "risiko rendah" with no indication that
     * the message is about a cow at all.
     */
    public function test_every_driver_states_whether_it_is_a_warning_or_a_recovery(): void
    {
        $alert = new RiskAlertNotification(
            $this->cow,
            $this->assess(RiskStatus::BerisikoTinggi),
            isRecovery: false,
        );

        $recovery = new RiskAlertNotification(
            $this->cow,
            $this->assess(RiskStatus::Normal, 12.0),
            isRecovery: true,
        );

        foreach ([$alert, $recovery] as $notification) {
            $label = $notification->isRecovery ? 'kembali normal' : 'PERINGATAN';

            foreach ([$notification->toTelegram($this->recipient), $notification->toWhatsApp($this->recipient)] as $message) {
                $this->assertStringContainsString($label, $message);
                $this->assertStringContainsString('cow01', $message);
            }

            $this->assertStringContainsString($label, $notification->subject());
        }
    }

    /**
     * `reasons` and `missing` are nullable JSON columns. A row written before those
     * columns existed casts to null, and an alert must still go out.
     */
    public function test_it_still_alerts_when_the_json_columns_are_null(): void
    {
        $assessment = RiskAssessment::factory()->for($this->cow)->create([
            'score' => 71.2,
            'status' => RiskStatus::BerisikoTinggi,
            'reasons' => null,
            'missing' => null,
        ]);

        RiskAssessed::dispatch($this->cow, $assessment);

        Notification::assertSentTo(
            $this->recipient,
            RiskAlertNotification::class,
            fn (RiskAlertNotification $notification): bool => str_contains(
                $notification->toTelegram($this->recipient),
                'PERINGATAN cow01',
            ),
        );
    }
}
