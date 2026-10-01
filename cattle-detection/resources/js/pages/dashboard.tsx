import { Head } from '@inertiajs/react';
import { AlertTriangleIcon, BeefIcon, CircleSlashIcon, HeartPulseIcon, SirenIcon } from 'lucide-react';
import Heading from '@/components/heading';
import CowTable from '@/components/monitoring/cow-table';
import { ErrorState, LoadingState } from '@/components/monitoring/data-state';
import RefreshControls from '@/components/monitoring/refresh-controls';
import StatCard, { type StatTone } from '@/components/monitoring/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { countByRiskStatus, sortByAttention } from '@/lib/cow-summary';
import { cowService } from '@/services/cow-service';
import { dashboard } from '@/routes';
import type { RiskStatusValue } from '@/types/telemetry';

const REFRESH_INTERVAL_MS = 15_000;

const tiles: { key: RiskStatusValue; label: string; icon: typeof BeefIcon; tone: StatTone }[] = [
    { key: 'Normal', label: 'Normal', icon: HeartPulseIcon, tone: 'success' },
    { key: 'Waspada', label: 'Waspada', icon: AlertTriangleIcon, tone: 'warning' },
    { key: 'Berisiko Tinggi', label: 'Berisiko Tinggi', icon: SirenIcon, tone: 'danger' },
    { key: 'Tidak Ada Data', label: 'Tidak ada data', icon: CircleSlashIcon, tone: 'muted' },
];

export default function Dashboard() {
    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: REFRESH_INTERVAL_MS,
        cacheKey: 'cows',
    });

    const counts = cows.data === null ? null : countByRiskStatus(cows.data);
    const attention = cows.data === null ? [] : sortByAttention(cows.data).slice(0, 5);

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <Heading
                        title="Dashboard"
                        description="Ringkasan kondisi sapi berdasarkan data terbaru dari Raspberry Pi."
                        className="mb-0"
                    />
                    <RefreshControls
                        updatedAt={cows.updatedAt}
                        isRefreshing={cows.isRefreshing}
                        onRefresh={cows.refresh}
                    />
                </div>

                {cows.error !== null && cows.data === null ? (
                    <ErrorState error={cows.error} onRetry={cows.refresh} />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total sapi"
                        value={cows.data === null ? '—' : String(cows.data.length)}
                        icon={BeefIcon}
                        isLoading={cows.isLoading && cows.data === null}
                    />
                    {tiles.map((tile) => (
                        <StatCard
                            key={tile.key}
                            label={tile.label}
                            value={counts === null ? '—' : String(counts[tile.key])}
                            icon={tile.icon}
                            tone={tile.tone}
                            isLoading={cows.isLoading && cows.data === null}
                        />
                    ))}
                </div>

                <Card className="gap-4 py-4">
                    <CardHeader className="px-4">
                        <CardTitle className="text-base">
                            Sapi yang perlu perhatian
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 px-4">
                        {cows.isLoading && cows.data === null ? (
                            <LoadingState rows={3} />
                        ) : (
                            <CowTable cows={attention} />
                        )}
                    </CardContent>
                </Card>

                <Card className="gap-4 py-4">
                    <CardHeader className="flex-row items-center justify-between gap-2 px-4">
                        <CardTitle className="text-base">Seluruh sapi</CardTitle>
                        {cows.isRefreshing ? (
                            <Skeleton className="h-4 w-24" />
                        ) : null}
                    </CardHeader>
                    <CardContent className="px-4">
                        {cows.isLoading && cows.data === null ? (
                            <LoadingState rows={4} />
                        ) : (
                            <CowTable
                                cows={sortByAttention(cows.data ?? [])}
                                caption="Diurutkan dari risiko tertinggi. Klik kode sapi untuk melihat detail."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
