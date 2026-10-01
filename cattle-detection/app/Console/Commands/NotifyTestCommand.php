<?php

namespace App\Console\Commands;

use App\Enums\RiskStatus;
use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\User;
use App\Notifications\RiskAlertNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

/**
 * Verifies the alert setup without waiting for a cow to actually fall ill.
 *
 * Exits non-zero when the driver is unusable, so it can be wired into a
 * deployment check or run right after filling the credentials in .env.
 */
class NotifyTestCommand extends Command
{
    protected $signature = 'cattleye:notify-test {--cow= : Kode sapi yang akan disebut dalam pesan}';

    protected $description = 'Kirim satu notifikasi uji sesuai driver alert CATTLEYE';

    public function handle(): int
    {
        $driver = (string) config('cattleye.notifications.driver');

        $this->components->info("Driver alert: {$driver}");

        $missing = $this->missingCredentials($driver);

        if ($missing !== []) {
            $this->components->error('Kredensial belum lengkap: '.implode(', ', $missing));

            return self::FAILURE;
        }

        $cow = $this->resolveCow();
        $recipients = User::query()->whereNotNull('email_verified_at')->get();

        if ($recipients->isEmpty()) {
            $this->components->error('Tidak ada user dengan email terverifikasi untuk menerima alert.');

            return self::FAILURE;
        }

        $assessment = new RiskAssessment([
            'score' => 71.2,
            'status' => RiskStatus::BerisikoTinggi,
            'reasons' => ['Suhu tinggi (derajat 0.74)', 'Visual PMK (derajat 0.88)'],
            'missing' => [],
            'inputs' => ['suhu' => 39.8, 'aktivitas' => 15.0, 'visual' => 0.88],
            'recorded_at' => Carbon::now(),
        ]);

        // QueueFake is not used here: this command must exercise the real queue
        // so an operator can confirm the worker is actually picking alerts up.
        Notification::send($recipients, new RiskAlertNotification($cow, $assessment, isRecovery: false));

        $this->components->info(sprintf(
            'Notifikasi uji dikirim ke %d penerima%s.',
            $recipients->count(),
            $driver === 'log' ? ' (lihat storage/logs/laravel.log)' : '',
        ));

        if ($driver !== 'log') {
            $this->components->warn('Pastikan worker queue berjalan: php artisan queue:work');
        }

        return self::SUCCESS;
    }

    /**
     * @return array<int, string>
     */
    private function missingCredentials(string $driver): array
    {
        return match ($driver) {
            'telegram' => $this->emptyConfigs([
                'cattleye.notifications.telegram.bot_token' => 'TELEGRAM_BOT_TOKEN',
                'cattleye.notifications.telegram.chat_id' => 'TELEGRAM_CHAT_ID',
            ]),
            'whatsapp' => $this->emptyConfigs([
                'cattleye.notifications.whatsapp.webhook_url' => 'CATTLEYE_WHATSAPP_WEBHOOK_URL',
            ]),
            'log' => [],
            default => ['CATTLEYE_NOTIFY_DRIVER tidak dikenal: '.$driver],
        };
    }

    /**
     * @param  array<string, string>  $map
     * @return array<int, string>
     */
    private function emptyConfigs(array $map): array
    {
        $missing = [];

        foreach ($map as $key => $envName) {
            if ((string) config($key) === '') {
                $missing[] = $envName;
            }
        }

        return $missing;
    }

    /**
     * A named cow when one exists, otherwise a detached placeholder so the test
     * message can be sent before any cow has been registered.
     */
    private function resolveCow(): Cow
    {
        $code = $this->option('cow');

        if (is_string($code) && $code !== '' && Cow::where('code', $code)->exists()) {
            return Cow::where('code', $code)->firstOrFail();
        }

        $cow = new Cow;
        $cow->code = is_string($code) && $code !== '' ? $code : 'cow01';
        $cow->name = 'Sapi uji coba';
        $cow->exists = false;

        return $cow;
    }
}
