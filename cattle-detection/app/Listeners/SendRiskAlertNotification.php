<?php

namespace App\Listeners;

use App\Enums\RiskStatus;
use App\Events\RiskAssessed;
use App\Models\Cow;
use App\Models\User;
use App\Notifications\RiskAlertNotification;
use Illuminate\Support\Facades\Cache;

/**
 * Decides whether a freshly stored risk assessment deserves to alert somebody.
 *
 * The event is raised by the ingestion service once its transaction has
 * committed, so an alert never describes a row that was rolled back.
 *
 * Two rules keep the channel usable:
 *  - only statuses at or above the configured threshold raise an alert, and a
 *    cow coming back down below it raises a single recovery notice;
 *  - `Cache::add()` is atomic, so a cow that stays unhealthy for an hour
 *    produces one alert per cooldown window instead of one per reading. The Pi
 *    reports fusion results every second.
 */
class SendRiskAlertNotification
{
    public function handle(RiskAssessed $event): void
    {
        $cow = $event->cow;
        $assessment = $event->assessment;
        $threshold = $this->threshold();

        $previous = Cache::get($this->levelKey($cow));
        Cache::forever($this->levelKey($cow), $assessment->status->value);

        $isAlert = $assessment->status->isAtLeast($threshold);
        $wasAlerting = $previous !== null
            && RiskStatus::from($previous)->isAtLeast($threshold);

        // Nothing changed: the cow is still in the same band.
        if ($isAlert === $wasAlerting) {
            return;
        }

        $minutes = max(1, (int) config('cattleye.notifications.cooldown_minutes'));
        $cooldown = $this->cooldownKey($cow);

        if ($isAlert) {
            if (Cache::add($cooldown, true, now()->addMinutes($minutes)) === false) {
                // An alert is already on its way; do not stack another one on top.
                return;
            }
        } else {
            // A recovery is news in its own right, so it must not be swallowed by
            // the cooldown the alert itself opened. Clearing it also re-arms the
            // alert if the cow gets sick again within the window.
            Cache::forget($cooldown);
        }

        $recipients = User::query()->whereNotNull('email_verified_at')->get();

        if ($recipients->isEmpty()) {
            return;
        }

        foreach ($recipients as $recipient) {
            $recipient->notify(new RiskAlertNotification($cow, $assessment, ! $isAlert));
        }
    }

    /**
     * The configured level, falling back to the strictest one if the env value
     * names a status this build does not know.
     */
    private function threshold(): RiskStatus
    {
        $configured = (string) config('cattleye.notifications.alert_status');

        return RiskStatus::tryFrom($configured) ?? RiskStatus::BerisikoTinggi;
    }

    private function cooldownKey(Cow $cow): string
    {
        return "cattleye:alert-cooldown:cow:{$cow->id}";
    }

    private function levelKey(Cow $cow): string
    {
        return "cattleye:risk-level:cow:{$cow->id}";
    }
}
