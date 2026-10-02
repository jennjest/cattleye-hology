import { Head } from '@inertiajs/react';
import { Activity } from 'lucide-react';
import { useState } from 'react';
import CowCard from '@/components/monitoring/cow-card';
import LiveCamera from '@/components/monitoring/live-camera';
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from '@/components/monitoring/data-state';
import RefreshControls from '@/components/monitoring/refresh-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { latestRecordedAt, type CowSummary } from '@/types/telemetry';
import { cameraService } from '@/services/camera-service';
import { cowService } from '@/services/cow-service';
import { dashboard } from '@/routes';
import { index as monitoringIndex } from '@/routes/monitoring';

const INTERVALS = [
    { label: '5 detik', value: 5_000 },
    { label: '10 detik', value: 10_000 },
    { label: '30 detik', value: 30_000 },
    { label: '1 menit', value: 60_000 },
] as const;

/**
 * Locally decides staleness for the overview grid. The authoritative check
 * stays on the server (`GET /api/cows/{cow}/latest`), which is what the cow
 * detail page uses.
 */
function isStaleLocally(cow: CowSummary): boolean {
    const updatedAt = latestRecordedAt(cow.latest);

    if (updatedAt === null) {
        return true;
    }

    return Date.now() - Date.parse(updatedAt) > 30_000;
}

export default function Monitoring() {
    const [intervalMs, setIntervalMs] = useState<number>(10_000);

    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs,
        cacheKey: 'cows',
    });

    // The camera state is polled on a slower beat than the cow grid: the feed
    // itself is continuous, so this only refreshes the readouts beside it.
    const camera = usePollingResource(
        (signal) => cameraService.status(signal),
        {
            intervalMs: 15_000,
            cacheKey: 'edge-camera',
        },
    );

    return (
        <>
            <Head title="Monitoring" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                            <Activity className="size-5 text-brand-primary dark:text-brand-accent" />
                            Monitoring Langsung
                        </h1>
                        <p className="text-xs text-gray-500">
                            Pantauan langsung kondisi setiap sapi. Data
                            disegarkan otomatis dari Raspberry Pi.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Select
                            value={String(intervalMs)}
                            onValueChange={(value) =>
                                setIntervalMs(Number(value))
                            }
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERVALS.map((interval) => (
                                    <SelectItem
                                        key={interval.value}
                                        value={String(interval.value)}
                                    >
                                        {interval.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <RefreshControls
                            updatedAt={cows.updatedAt}
                            isRefreshing={cows.isRefreshing}
                            onRefresh={cows.refresh}
                        />
                    </div>
                </div>

                {cows.error !== null ? (
                    <ErrorState error={cows.error} onRetry={cows.refresh} />
                ) : null}

                {camera.error !== null ? (
                    <ErrorState error={camera.error} onRetry={camera.refresh} />
                ) : null}

                <LiveCamera
                    status={camera.data}
                    isLoading={camera.isLoading}
                    onRetry={camera.refresh}
                />

                <Card className="gap-4 py-4">
                    <CardHeader className="px-4">
                        <CardTitle className="text-base">
                            {cows.data === null
                                ? 'Memuat kondisi sapi...'
                                : `${cows.data.length} sapi dipantau`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        {cows.isLoading && cows.data === null ? (
                            <LoadingState rows={3} />
                        ) : (cows.data ?? []).length === 0 ? (
                            <EmptyState message="Belum ada sapi terdaftar di CATTLEYE." />
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {(cows.data ?? []).map((cow) => (
                                    <CowCard
                                        key={cow.id}
                                        cow={cow}
                                        latest={cow.latest}
                                        isStale={isStaleLocally(cow)}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Monitoring.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Monitoring',
            href: monitoringIndex(),
        },
    ],
};
