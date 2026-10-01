<?php

namespace App\Models;

use Database\Factories\CowFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, SensorReading> $sensorReadings
 * @property-read Collection<int, VisionPrediction> $visionPredictions
 * @property-read Collection<int, RiskAssessment> $riskAssessments
 * @property-read SensorReading|null $latestSensorReading
 * @property-read VisionPrediction|null $latestVisionPrediction
 * @property-read RiskAssessment|null $latestRiskAssessment
 */
#[Fillable(['code', 'name'])]
#[UseFactory(CowFactory::class)]
class Cow extends Model
{
    /** @use HasFactory<CowFactory> */
    use HasFactory;

    /**
     * @return HasMany<SensorReading, $this>
     */
    public function sensorReadings(): HasMany
    {
        return $this->hasMany(SensorReading::class);
    }

    /**
     * @return HasMany<VisionPrediction, $this>
     */
    public function visionPredictions(): HasMany
    {
        return $this->hasMany(VisionPrediction::class);
    }

    /**
     * @return HasMany<RiskAssessment, $this>
     */
    public function riskAssessments(): HasMany
    {
        return $this->hasMany(RiskAssessment::class);
    }

    /**
     * @return HasOne<SensorReading, $this>
     */
    public function latestSensorReading(): HasOne
    {
        return $this->hasOne(SensorReading::class)->latestOfMany('recorded_at');
    }

    /**
     * @return HasOne<VisionPrediction, $this>
     */
    public function latestVisionPrediction(): HasOne
    {
        return $this->hasOne(VisionPrediction::class)->latestOfMany('recorded_at');
    }

    /**
     * @return HasOne<RiskAssessment, $this>
     */
    public function latestRiskAssessment(): HasOne
    {
        return $this->hasOne(RiskAssessment::class)->latestOfMany('recorded_at');
    }
}
