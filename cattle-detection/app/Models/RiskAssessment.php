<?php

namespace App\Models;

use App\Enums\RiskStatus;
use Database\Factories\RiskAssessmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Result of the sensor fusion pipeline (temperature + activity + vision).
 *
 * The algorithm itself runs on the Raspberry Pi; the backend only validates
 * and stores what the edge computer reports.
 *
 * @property int $id
 * @property int $cow_id
 * @property float $score
 * @property RiskStatus $status
 * @property array<int, string>|null $reasons
 * @property array<int, string>|null $missing Fusion inputs that were unavailable or stale
 * @property array<string, float|null>|null $inputs Fusion input values used for this score
 * @property Carbon $recorded_at
 * @property-read Cow $cow
 */
#[Fillable(['cow_id', 'score', 'status', 'reasons', 'missing', 'inputs', 'recorded_at'])]
#[UseFactory(RiskAssessmentFactory::class)]
#[WithoutTimestamps]
class RiskAssessment extends Model
{
    /** @use HasFactory<RiskAssessmentFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Cow, $this>
     */
    public function cow(): BelongsTo
    {
        return $this->belongsTo(Cow::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'score' => 'float',
            'status' => RiskStatus::class,
            'reasons' => 'array',
            'missing' => 'array',
            'inputs' => 'array',
            'recorded_at' => 'datetime',
        ];
    }
}
