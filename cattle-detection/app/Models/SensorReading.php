<?php

namespace App\Models;

use Database\Factories\SensorReadingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Raw wearable sensor data: body temperature (MLX90614) and IMU axes (MPU6050).
 *
 * This model deliberately stores only raw signals. Derived values such as
 * activity scores are computed by the sensor fusion pipeline on the Raspberry
 * Pi and are stored separately in RiskAssessment, so the raw stream stays
 * reusable for future machine learning work.
 *
 * @property int $id
 * @property int $cow_id
 * @property float|null $temperature
 * @property float|null $ax
 * @property float|null $ay
 * @property float|null $az
 * @property float|null $gx
 * @property float|null $gy
 * @property float|null $gz
 * @property array<string, mixed>|null $activity IMU activity window reported by the fusion loop
 * @property Carbon $recorded_at
 * @property-read Cow $cow
 */
#[Fillable(['cow_id', 'temperature', 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'activity', 'recorded_at'])]
#[UseFactory(SensorReadingFactory::class)]
#[WithoutTimestamps]
class SensorReading extends Model
{
    /** @use HasFactory<SensorReadingFactory> */
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
            'temperature' => 'float',
            'ax' => 'float',
            'ay' => 'float',
            'az' => 'float',
            'gx' => 'float',
            'gy' => 'float',
            'gz' => 'float',
            'activity' => 'array',
            'recorded_at' => 'datetime',
        ];
    }
}
