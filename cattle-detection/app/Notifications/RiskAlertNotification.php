<?php

namespace App\Notifications;

use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Notifications\Channels\LogChannel;
use App\Notifications\Channels\TelegramChannel;
use App\Notifications\Channels\WhatsAppWebhookChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the farmer that a cow's fusion score crossed a risk threshold.
 *
 * Queued because it is triggered from the ingestion endpoint, and an HTTP call to
 * Telegram or a WhatsApp gateway must not add latency to the Pi's request. Run
 * `php artisan queue:work` on the server for alerts to actually leave the box.
 *
 * The message is assembled here rather than in a view so all three drivers show
 * exactly the same facts.
 */
class RiskAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Cow $cow,
        public readonly RiskAssessment $assessment,
        public readonly bool $isRecovery,
    ) {
        $this->onQueue('notifications');
    }

    /**
     * @return list<object>
     */
    public function via(object $notifiable): array
    {
        return match ((string) config('cattleye.notifications.driver')) {
            'telegram' => [new TelegramChannel],
            'whatsapp' => [new WhatsAppWebhookChannel],
            // "log" and any unknown value: record the alert instead of dropping
            // it, so a missing driver never hides a sick cow.
            default => [new LogChannel],
        };
    }

    public function toMail(object $notifiable): MailMessage
    {
        $reasons = $this->assessment->reasons ?? [];
        $missing = $this->assessment->missing ?? [];

        return (new MailMessage)
            ->subject($this->subject())
            ->line($this->headline())
            ->line('Sapi: '.$this->cow->code.' · '.$this->cow->name)
            ->line('Status: '.$this->assessment->status->value)
            ->line('Skor risiko: '.$this->assessment->score)
            ->when($reasons !== [], fn (MailMessage $mail): MailMessage => $mail
                ->line('Alasan: '.implode('; ', $reasons)))
            ->when($missing !== [], fn (MailMessage $mail): MailMessage => $mail
                ->line('Input tidak tersedia: '.implode(', ', $missing)))
            ->line('Waktu: '.$this->assessment->recorded_at->toDateTimeString());
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'cow' => ['id' => $this->cow->id, 'code' => $this->cow->code, 'name' => $this->cow->name],
            'risk' => [
                'score' => $this->assessment->score,
                'status' => $this->assessment->status->value,
                'reasons' => $this->assessment->reasons,
                'missing' => $this->assessment->missing,
                'recorded_at' => $this->assessment->recorded_at->toIso8601String(),
            ],
            'is_recovery' => $this->isRecovery,
        ];
    }

    /**
     * Telegram renders a small subset of HTML; the fields come from validated
     * enums and bounded strings, so escaping them is enough.
     */
    public function toTelegram(object $notifiable): string
    {
        // The subject line is repeated in the body on purpose: Telegram renders
        // no subject, so without it the message the farmer sees would not say
        // whether it is a warning or a recovery.
        return implode("\n", [
            $this->subject(),
            $this->headline(),
            '',
            sprintf('Sapi: %s · %s', $this->cow->code, $this->cow->name),
            sprintf('Status: %s', $this->assessment->status->value),
            sprintf('Skor risiko: %s', $this->formatScore()),
            $this->reasonLine(),
            $this->missingLine(),
            sprintf('Waktu: %s', $this->assessment->recorded_at->toDateTimeString()),
        ]);
    }

    /**
     * WhatsApp has no markup, so this is the plain-text form of the same facts.
     */
    public function toWhatsApp(object $notifiable): string
    {
        return implode("\n", [
            $this->subject(),
            $this->headline(),
            sprintf('Sapi: %s - %s', $this->cow->code, $this->cow->name),
            sprintf('Status: %s', $this->assessment->status->value),
            sprintf('Skor: %s', $this->formatScore()),
            $this->reasonLine(),
            $this->missingLine(),
            sprintf('Waktu: %s', $this->assessment->recorded_at->toDateTimeString()),
        ]);
    }

    public function subject(): string
    {
        return $this->isRecovery
            ? sprintf('[CATTLEYE] %s kembali normal', $this->cow->code)
            : sprintf('[CATTLEYE] PERINGATAN %s', $this->cow->code);
    }

    private function headline(): string
    {
        return $this->isRecovery
            ? 'Kondisi sapi kembali normal.'
            : 'Sapi terdeteksi berisiko tinggi.';
    }

    private function formatScore(): string
    {
        return number_format($this->assessment->score, 1, ',', '.');
    }

    /**
     * `reasons` and `missing` are nullable JSON columns, so a row written before
     * those columns existed casts to null rather than an empty array. Both lines
     * read them defensively: a missing bookkeeping value must not turn an alert
     * into a 500, because the alert itself is the part that matters.
     */
    private function reasonLine(): string
    {
        $reasons = $this->assessment->reasons ?? [];

        return $reasons === [] ? '' : 'Alasan: '.implode('; ', $reasons);
    }

    private function missingLine(): string
    {
        $missing = $this->assessment->missing ?? [];

        return $missing === []
            ? ''
            : 'Input tidak tersedia: '.implode(', ', $missing);
    }
}
