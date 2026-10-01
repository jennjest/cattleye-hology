<?php

namespace Database\Seeders;

use App\Enums\RiskStatus;
use App\Enums\VisionLabel;
use App\Models\Cow;
use Illuminate\Database\Seeder;

/**
 * Generates demo telemetry so the dashboard has something to render during
 * development.
 *
 * IMPORTANT: this is sample data, not the real sensor fusion algorithm. The
 * fusion rules live on the Raspberry Pi (cattleye/main.py) and this seeder only
 * produces plausible looking values for local UI work. Once the edge computer
 * is connected, run `php artisan migrate:fresh` and skip this seeder.
 */
class TelemetrySeeder extends Seeder
{
    private const HOURS = 6;

    private const INTERVAL_MINUTES = 5;

    /**
     * One entry per cow so every dashboard state can be exercised: healthy,
     * warning, high risk, and a cow that has never reported at all.
     *
     * @var array<string, string>
     */
    private const PROFILES = [
        'cow01' => 'healthy',
        'cow02' => 'waspada',
        'cow03' => 'berisiko-tinggi',
        'cow04' => 'tanpa-data',
    ];

    public function run(): void
    {
        mt_srand(20261001);

        foreach (self::PROFILES as $code => $profile) {
            $cow = Cow::query()->where('code', $code)->first();

            if ($cow === null || $profile === 'tanpa-data') {
                continue;
            }

            $this->seedCow($cow, $profile);
        }
    }

    private function seedCow(Cow $cow, string $profile): void
    {
        // Keeps the seeder idempotent so `db:seed` can be re-run safely.
        $cow->sensorReadings()->delete();
        $cow->riskAssessments()->delete();
        $cow->visionPredictions()->delete();

        $start = now()->subHours(self::HOURS);
        $steps = intdiv(self::HOURS * 60, self::INTERVAL_MINUTES);
        $isRisky = $profile === 'berisiko-tinggi';

        for ($step = $steps; $step >= 0; $step--) {
            $recordedAt = $start->copy()->addMinutes($step * self::INTERVAL_MINUTES);

            $cow->sensorReadings()->create([
                'temperature' => $this->temperature($profile),
                'ax' => $this->jitter(0.12, 0.08),
                'ay' => $this->jitter(-0.05, 0.08),
                'az' => $this->jitter(9.81, 0.05),
                'gx' => $this->jitter(0.01, 0.02 * $this->activity($profile)),
                'gy' => $this->jitter(0.02, 0.02 * $this->activity($profile)),
                'gz' => $this->jitter(0.00, 0.02 * $this->activity($profile)),
                'recorded_at' => $recordedAt,
            ]);

            $cow->riskAssessments()->create([
                'score' => $this->score($profile),
                'status' => $this->status($profile),
                'reasons' => $this->reasons($profile),
                'recorded_at' => $recordedAt->copy()->addSecond(),
            ]);

            // The Pi only runs inference every N frames, so predictions are
            // sparser than the wearable stream.
            if ($step % 6 === 0) {
                $cow->visionPredictions()->create([
                    'label' => $isRisky ? VisionLabel::Pmk : VisionLabel::Normal,
                    'confidence' => $isRisky ? $this->between(0.85, 0.96) : $this->between(0.82, 0.98),
                    'recorded_at' => $recordedAt->copy()->addSeconds(2),
                ]);
            }
        }
    }

    private function temperature(string $profile): float
    {
        return match ($profile) {
            'healthy' => $this->between(38.0, 38.7),
            'waspada' => $this->between(39.0, 39.4),
            'berisiko-tinggi' => $this->between(39.6, 40.3),
            default => $this->between(38.0, 39.0),
        };
    }

    private function score(string $profile): float
    {
        return match ($profile) {
            'healthy' => $this->between(4, 24),
            'waspada' => $this->between(35, 56),
            'berisiko-tinggi' => $this->between(64, 91),
            default => 0.0,
        };
    }

    private function status(string $profile): RiskStatus
    {
        return match ($profile) {
            'waspada' => RiskStatus::Waspada,
            'berisiko-tinggi' => RiskStatus::BerisikoTinggi,
            default => RiskStatus::Normal,
        };
    }

    /**
     * @return array<int, string>
     */
    private function reasons(string $profile): array
    {
        return match ($profile) {
            'waspada' => ['Suhu mendekati batas demam (derajat 0.41)'],
            'berisiko-tinggi' => [
                'Suhu tinggi (derajat 0.83)',
                'Aktivitas rendah (derajat 0.67)',
                'Visual PMK (derajat 0.91)',
            ],
            default => [],
        };
    }

    /**
     * Movement factor: a sick cow moves less, so its gyroscope values shrink.
     */
    private function activity(string $profile): float
    {
        return match ($profile) {
            'healthy' => 1.0,
            'waspada' => 0.6,
            'berisiko-tinggi' => 0.3,
            default => 1.0,
        };
    }

    private function between(float $min, float $max): float
    {
        return round($min + (mt_rand(0, mt_getrandmax() - 1) / mt_getrandmax()) * ($max - $min), 2);
    }

    private function jitter(float $value, float $spread): float
    {
        return round($value + ($this->between(-$spread, $spread)), 4);
    }
}
