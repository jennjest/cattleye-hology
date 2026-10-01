<?php

namespace App\Services;

use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\SensorReading;
use App\Models\VisionPrediction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Carbon;
use Illuminate\Support\LazyCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Turns a cow's telemetry history into a spreadsheet-friendly CSV.
 *
 * The three sensor streams are written in long format (one row per measurement,
 * with a `stream` column) instead of being joined on a shared timestamp. A join
 * would need to invent a matching window between rows produced by independent
 * threads on the Pi, which would quietly fabricate data.
 *
 * Header layout:
 *   recorded_at,stream,value,status,label,confidence,reasons
 */
class CowHistoryExportService
{
    private const CHUNK = 1000;

    /**
     * Columns, in order, shared by every row of the export.
     *
     * @var array<int, string>
     */
    private const HEADER = ['recorded_at', 'stream', 'value', 'status', 'label', 'confidence', 'reasons'];

    /**
     * Rows are pulled in chunks, so a week of 1 Hz readings cannot exhaust memory.
     */
    public function toCsv(Cow $cow, Carbon $since, Carbon $until): StreamedResponse
    {
        $filename = sprintf('cattleye-%s-%s.csv', $cow->code, $until->toDateString());

        return response()->streamDownload(function () use ($cow, $since): void {
            $out = fopen('php://output', 'wb');

            if ($out === false) {
                return;
            }

            fputcsv($out, self::HEADER);

            foreach ($this->temperatureRows($cow, $since) as $row) {
                fputcsv($out, [$row['recorded_at'], 'temperature', $row['temperature'], null, null, null, null]);
            }

            foreach ($this->visionRows($cow, $since) as $row) {
                fputcsv($out, [$row['recorded_at'], 'vision', null, null, $row['label'], $row['confidence'], null]);
            }

            foreach ($this->riskRows($cow, $since) as $row) {
                fputcsv($out, [
                    $row['recorded_at'], 'risk', $row['score'], $row['status'], null, null,
                    implode(' | ', $row['reasons']),
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * @return LazyCollection<int, array{recorded_at: string, temperature: float|null}>
     */
    private function temperatureRows(Cow $cow, Carbon $since): LazyCollection
    {
        return $this->stream(
            $cow->sensorReadings()
                ->where('recorded_at', '>=', $since)
                ->select(['id', 'temperature', 'recorded_at']),
            fn (SensorReading $reading): array => [
                'recorded_at' => $this->timestamp((string) $reading->recorded_at),
                'temperature' => $reading->temperature === null ? null : (float) $reading->temperature,
            ],
        );
    }

    /**
     * @return LazyCollection<int, array{recorded_at: string, label: string, confidence: float}>
     */
    private function visionRows(Cow $cow, Carbon $since): LazyCollection
    {
        return $this->stream(
            $cow->visionPredictions()
                ->where('recorded_at', '>=', $since)
                ->select(['id', 'label', 'confidence', 'recorded_at']),
            fn (VisionPrediction $row): array => [
                'recorded_at' => $this->timestamp((string) $row->recorded_at),
                'label' => $row->label->value,
                'confidence' => (float) $row->confidence,
            ],
        );
    }

    /**
     * @return LazyCollection<int, array{recorded_at: string, score: float, status: string, reasons: array<int, string>}>
     */
    private function riskRows(Cow $cow, Carbon $since): LazyCollection
    {
        return $this->stream(
            $cow->riskAssessments()
                ->where('recorded_at', '>=', $since)
                ->select(['id', 'score', 'status', 'reasons', 'recorded_at']),
            function (RiskAssessment $row): array {
                /** @var array<int, string> $reasons */
                $reasons = is_array($row->reasons) ? $row->reasons : [];

                return [
                    'recorded_at' => $this->timestamp((string) $row->recorded_at),
                    'score' => (float) $row->score,
                    'status' => $row->status->value,
                    'reasons' => $reasons,
                ];
            },
        );
    }

    /**
     * @template TModel of Model
     * @template TValue
     *
     * @param  Builder<TModel>|Relation<TModel, covariant Model, mixed>  $query
     * @param  callable(TModel): TValue  $map
     * @return LazyCollection<int, TValue>
     */
    private function stream(Builder|Relation $query, callable $map): LazyCollection
    {
        return $query->lazyById(self::CHUNK)->map($map);
    }

    /**
     * Export timestamps use local wall-clock time, matching what the dashboard
     * shows. A value the parser cannot read is passed through untouched rather
     * than silently dropped.
     */
    private function timestamp(string $value): string
    {
        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (\Throwable) {
            return $value;
        }
    }
}
