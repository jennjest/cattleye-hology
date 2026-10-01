<?php

namespace App\Notifications\Channels;

use App\Notifications\RiskAlertNotification;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Records the alert in the application log instead of sending it anywhere.
 *
 * This is the default driver so that a fresh install never silently swallows a
 * sick cow: the alert ends up in `storage/logs/laravel.log` and the operator can
 * confirm the pipeline works before wiring up Telegram or WhatsApp.
 */
class LogChannel
{
    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! $notification instanceof RiskAlertNotification) {
            return;
        }

        $recipient = $notifiable->routeNotificationFor('log', $notification);

        Log::channel('cattleye')->info($notification->subject(), [
            'recipient' => $recipient,
            'cow' => $notification->cow->code,
            'risk' => $notification->toArray($notifiable),
        ]);
    }
}
