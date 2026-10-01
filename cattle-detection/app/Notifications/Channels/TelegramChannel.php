<?php

namespace App\Notifications\Channels;

use App\Notifications\RiskAlertNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends an alert through the Telegram Bot API.
 *
 * Uses the plain `sendMessage` endpoint instead of a Telegram SDK: the payload
 * is a single text field, and one HTTP call is easier to audit than a
 * dependency that only wraps it.
 */
class TelegramChannel
{
    public function send(mixed $notifiable, RiskAlertNotification $notification): void
    {
        $token = (string) config('cattleye.notifications.telegram.bot_token');
        $chatId = (string) config('cattleye.notifications.telegram.chat_id');

        if ($token === '' || $chatId === '') {
            // Throwing here would push the job to the failed queue and retry for
            // no reason; the misconfiguration is reported in the log instead.
            Log::warning('CATTLEYE_NOTIFY_DRIVER=telegram but TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is empty. Alert skipped.');

            return;
        }

        $response = Http::timeout(10)
            ->asJson()
            ->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $notification->toTelegram($notifiable),
                'disable_web_page_preview' => true,
            ]);

        if ($response->failed()) {
            Log::warning('Telegram rejected a CATTLEYE alert.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }
}
