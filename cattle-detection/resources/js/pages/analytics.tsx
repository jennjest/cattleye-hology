import { Head } from '@inertiajs/react';
import BarChart from '@/components/charts/bar-chart';
import DonutChart, { type DonutSegment } from '@/components/charts/donut-chart';
import Heatmap, { type HeatmapCell } from '@/components/charts/heatmap';
import { EmptyState, ErrorState } from '@/components/monitoring/data-state';
import LineChart from '@/components/monitoring/line-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { assignBarns, cowsInBarn, BARNS } from '@/lib/barns';
import { countByRiskStatus, riskStatusOf } from '@/lib/cow-summary';
import { index as analyticsIndex } from '@/routes/analytics';
import { analyticsService } from '@/services/analytics-service';
import { cowService } from '@/services/cow-service';
import { useState } from 'react';

const ANALYTICS_INTERVAL_MS = 300_000;
const COWS_INTERVAL_MS = 60_000;
const WINDOWS = [7, 30, 90] as const;

export default function Analytics() {
    const [days, setDays] = useState<number>(30);

    const summary = usePollingResource(
        (signal) => analyticsService.summary(days, signal),
        {
            intervalMs: ANALYTICS_INTERVAL_MS,
            cacheKey: `analytics:${days}`,
        },
    );

    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: COWS_INTERVAL_MS,
        cacheKey: 'cows',
    });

    const herd = cows.data ?? [];
    const counts = cows.data === null ? null : countByRiskStatus(herd);

    const segments: DonutSegment[] = [
        { label: 'Normal', value: counts?.Normal ?? 0, color: '#2A9D8F' },
        { label: 'Waspada', value: counts?.Waspada ?? 0, color: '#F4A261' },
        {
            label: 'Risiko',
            value: counts?.['Berisiko Tinggi'] ?? 0,
            color: '#D62828',
        },
    ];

    const assigned = assignBarns(herd);
    const bars = BARNS.map((barn) => {
        const members = cowsInBarn(assigned, barn.id);

        return {
            label: barn.name.replace('Kandang ', ''),
            value: members.filter((cow) => riskStatusOf(cow) !== 'Normal')
                .length,
            color: '#D62828',
        };
    });

    const buckets = summary.data?.hourly_activity ?? [];
    const cells: HeatmapCell[] = buckets.map((bucket) => ({
        row: 'Aktivitas',
        column: `${String(bucket.hour).padStart(2, '0')}:00`,
        intensity: bucket.score === null ? null : bucket.score / 100,
        value: bucket.score,
    }));

    return (
        <>
            <Head title="Analitik" />

            <div className="space-y-6">
                <Card className="gap-4 py-5">
                    <CardContent className="flex flex-col items-start justify-between gap-4 px-5 sm:flex-row sm:items-center">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                                Dashboard Analitik &amp; Tren Peternakan
                            </h1>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Analisis agregat data sensor IoT dan deteksi
                                anomalitas populasi ternak.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <label
                                htmlFor="analytics-window"
                                className="text-xs font-semibold text-gray-500"
                            >
                                Rentang Waktu:
                            </label>
                            <Select
                                value={String(days)}
                                onValueChange={(value) =>
                                    setDays(Number(value))
                                }
                            >
                                <SelectTrigger
                                    id="analytics-window"
                                    className="w-44 rounded-xl text-xs font-bold"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {WINDOWS.map((window) => (
                                        <SelectItem
                                            key={window}
                                            value={String(window)}
                                        >
                                            {window} Hari Terakhir
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {summary.error !== null && summary.data === null ? (
                    <ErrorState
                        error={summary.error}
                        onRetry={summary.refresh}
                    />
                ) : null}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card className="gap-4 py-6 lg:col-span-2">
                        <CardHeader className="flex-row items-center justify-between gap-3 px-6">
                            <CardTitle className="text-sm">
                                Rata-Rata Tren Suhu Populasi (°C)
                            </CardTitle>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                Batas Aman: 38.0 - 39.3°C
                            </span>
                        </CardHeader>

                        <CardContent className="px-6">
                            {summary.isLoading && summary.data === null ? (
                                <Skeleton className="h-64 w-full" />
                            ) : (summary.data?.daily ?? []).length === 0 ? (
                                <EmptyState message="Belum ada pembacaan sensor pada rentang ini." />
                            ) : (
                                <LineChart
                                    description={`Rata-rata suhu populasi ${days} hari terakhir`}
                                    points={(summary.data?.daily ?? []).map(
                                        (day) => ({
                                            recordedAt: day.date,
                                            value: day.avg_temperature,
                                        }),
                                    )}
                                    height={256}
                                    formatValue={(value) => value.toFixed(1)}
                                    referenceLines={[
                                        { value: 39.3, label: 'Batas aman' },
                                    ]}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col justify-between gap-4 py-6">
                        <CardHeader className="px-6">
                            <CardTitle className="text-sm">
                                Proporsi Status Kesehatan
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="flex flex-1 items-center justify-center px-6">
                            {cows.isLoading && cows.data === null ? (
                                <Skeleton className="size-48 rounded-full" />
                            ) : herd.length === 0 ? (
                                <EmptyState message="Belum ada sapi terdaftar." />
                            ) : (
                                <DonutChart
                                    segments={segments}
                                    caption={String(herd.length)}
                                    description="Proporsi status kesehatan populasi sapi"
                                    size={192}
                                />
                            )}
                        </CardContent>

                        <div className="grid grid-cols-3 gap-2 border-t border-gray-100 px-6 pt-3 text-center text-[11px] dark:border-slate-700">
                            {segments.map((segment) => (
                                <div key={segment.label}>
                                    <span
                                        className="mx-auto mb-1 block size-2.5 rounded-full"
                                        style={{
                                            backgroundColor: segment.color,
                                        }}
                                    />
                                    <span className="text-gray-500">
                                        {segment.label}
                                    </span>
                                    <span className="block font-bold text-gray-800 dark:text-white">
                                        {segment.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="gap-4 py-6">
                        <CardHeader className="px-6">
                            <CardTitle className="text-sm">
                                Distribusi Risiko Per Kandang
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="px-6">
                            {cows.isLoading && cows.data === null ? (
                                <Skeleton className="h-60 w-full" />
                            ) : herd.length === 0 ? (
                                <EmptyState message="Belum ada sapi terdaftar." />
                            ) : (
                                <BarChart
                                    bars={bars}
                                    description="Jumlah sapi berisiko per kandang"
                                    unit=" ekor"
                                    height={240}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="gap-4 py-6">
                        <CardHeader className="flex-row items-center justify-between gap-3 px-6">
                            <CardTitle className="text-sm">
                                Heatmap Jam Aktivitas Ternak (24 Jam)
                            </CardTitle>
                            <span className="text-[11px] text-gray-400">
                                Intensitas pergerakan
                            </span>
                        </CardHeader>

                        <CardContent className="px-6">
                            {summary.isLoading && summary.data === null ? (
                                <Skeleton className="h-60 w-full" />
                            ) : cells.length === 0 ? (
                                <EmptyState message="Belum ada data aktivitas 24 jam terakhir." />
                            ) : (
                                <>
                                    <Heatmap
                                        cells={cells}
                                        description="Rata-rata skor aktivitas per dua jam dalam 24 jam terakhir"
                                    />
                                    <p className="mt-3 text-[11px] text-gray-400">
                                        Skor 0-100 dari sensor IMU,
                                        dirata-ratakan per dua jam.
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Analytics.layout = {
    breadcrumbs: [{ title: 'Analitik', href: analyticsIndex() }],
};
