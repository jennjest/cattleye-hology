<?php

namespace App\Notifications\Channels;

use App\Notifications\RiskAlertNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends an alert to a WhatsApp gateway over a plain JSON webhook.
 *
 * Every provider (Fonnte, CallMeBot, a self-hosted WA gateway, Meta's Cloud API
 * bridge) differs in authentication and field names, so this channel targets the
 * common denominator: POST `{"message": "...", "to": "..."}`. Point
 * `CATTLEYE_WHATSAPP_WEBHOOK_URL` at a gateway that accepts that shape.
 *
 * Plain text is used on purpose: WhatsApp has no markdown, and a farmer reading
 * a phone at 3am needs plain text.
 */
class WhatsAppWebhookChannel
{
    public function send(mixed $notifiable, RiskAlertNotification $notification): void
    {
        $url = (string) config('cattleye.notifications.whatsapp.webhook_url');
        $recipient = (string) config('cattleye.notifications.whatsapp.recipient');

        if ($url === '') {
            Log::warning('CATTLEYE_NOTIFY_DRIVER=whatsapp but CATTLEYE_WHATSAPP_WEBHOOK_URL is empty. Alert skipped.');

            return;
        }

        $payload = ['message' => $notification->toWhatsApp($notifiable)];

        if ($recipient !== '') {
            $payload['to'] = $recipient;
        }

        $response = Http::timeout(15)->asJson()->post($url, $payload);

        if ($response->failed()) {
            Log::warning('WhatsApp gateway rejected a CATTLEYE alert.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }
}
