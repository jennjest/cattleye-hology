<?php

namespace App\Models;

use App\Enums\VisionLabel;
use Database\Factories\VisionPredictionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Output of the computer vision model running on the edge computer.
 *
 * @property int $id
 * @property int $cow_id
 * @property VisionLabel $label
 * @property float $confidence
 * @property float|null $p_pmk Raw PMK probability straight from the TFLite output
 * @property Carbon $recorded_at
 * @property-read Cow $cow
 */
#[Fillable(['cow_id', 'label', 'confidence', 'p_pmk', 'recorded_at'])]
#[UseFactory(VisionPredictionFactory::class)]
#[WithoutTimestamps]
class VisionPrediction extends Model
{
    /** @use HasFactory<VisionPredictionFactory> */
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
            'label' => VisionLabel::class,
            'confidence' => 'float',
            'p_pmk' => 'float',
            'recorded_at' => 'datetime',
        ];
    }
}
