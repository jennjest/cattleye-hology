import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    BellRing,
    Camera,
    CheckCircle2,
    HeartPulse,
    MapPin,
    Package,
    Radar,
    ShieldAlert,
    TrendingUp,
} from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/monitoring/data-state';
import LineChart from '@/components/monitoring/line-chart';
import RiskStatusPill from '@/components/monitoring/risk-status-pill';
import StatCard from '@/components/monitoring/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { assignBarns, cowsInBarn, BARNS } from '@/lib/barns';
import {
    countByRiskStatus,
    riskStatusOf,
    sortByAttention,
} from '@/lib/cow-summary';
import { formatNumber, formatRelativeTime, NOT_AVAILABLE } from '@/lib/format';
import { dashboard } from '@/routes';
import { index as mapIndex } from '@/routes/barn-map';
import { analyticsService } from '@/services/analytics-service';
import { cameraService } from '@/services/camera-service';
import { cowService } from '@/services/cow-service';
import { latestRecordedAt, type CowSummary } from '@/types/telemetry';

const COWS_INTERVAL_MS = 15_000;
const EDGE_INTERVAL_MS = 15_000;
const ANALYTICS_INTERVAL_MS = 300_000;

export default function Dashboard() {
    const { auth } = usePage().props;

    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: COWS_INTERVAL_MS,
        cacheKey: 'cows',
    });

    const edge = usePollingResource((signal) => cameraService.status(signal), {
        intervalMs: EDGE_INTERVAL_MS,
        cacheKey: 'edge-camera',
    });

    const trend = usePollingResource(
        (signal) => analyticsService.summary(7, signal),
        { intervalMs: ANALYTICS_INTERVAL_MS, cacheKey: 'analytics:7' },
    );

    const herd = cows.data ?? [];
    const counts = cows.data === null ? null : countByRiskStatus(herd);
    const total = herd.length;
    const isLoading = cows.isLoading && cows.data === null;

    const alerts = sortByAttention(herd)
        .filter((cow) => riskStatusOf(cow) !== 'Normal')
        .slice(0, 8);

    const recentReadings = [...herd]
        .filter((cow) => cow.latest.sensor_reading !== null)
        .sort(
            (a, b) =>
                Date.parse(b.latest.sensor_reading?.recorded_at ?? '') -
                Date.parse(a.latest.sensor_reading?.recorded_at ?? ''),
        )
        .slice(0, 8);

    return (
        <>
            <Head title="Gambaran Umum" />

            <div className="space-y-6">
                <section className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-secondary to-emerald-800 p-6 text-white shadow-soft md:flex-row md:items-center">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -bottom-10 size-48 rounded-full bg-white/5 blur-2xl"
                    />

                    <div className="z-10">
                        <span className="mb-1 block text-xs font-semibold tracking-widest text-brand-accent uppercase">
                            AI Livestock Monitoring System
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Selamat Datang, {auth.user?.name ?? 'Petugas'}
                        </h1>
                        <p className="mt-1 max-w-xl text-xs text-emerald-100/80">
                            Pemantauan kesehatan ternak secara real-time
                            berbasis Computer Vision &amp; sensor IoT.{' '}
                            {isLoading
                                ? 'Menghitung populasi...'
                                : `${total} ekor sapi dalam pengawasan intensif.`}
                        </p>
                    </div>

                    <Link
                        href={mapIndex()}
                        className="z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20"
                    >
                        <MapPin className="size-4" />
                        Buka Denah Kandang
                    </Link>
                </section>

                {cows.error !== null && cows.data === null ? (
                    <ErrorState error={cows.error} onRetry={cows.refresh} />
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Ternak"
                        value={isLoading ? '—' : String(total)}
                        hint={
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="size-3.5" />
                                {total === 0
                                    ? 'Belum ada sapi terdaftar'
                                    : 'Terpantau lewat sensor IoT'}
                            </span>
                        }
                        icon={Package}
                        isLoading={isLoading}
                    />

                    <StatCard
                        label="Kondisi Normal"
                        value={counts === null ? '—' : String(counts.Normal)}
                        hint={
                            counts === null
                                ? undefined
                                : `${percentage(counts.Normal, total)} dari total populasi`
                        }
                        icon={CheckCircle2}
                        tone="success"
                        isLoading={isLoading}
                    />

                    <StatCard
                        label="Status Waspada"
                        value={counts === null ? '—' : String(counts.Waspada)}
                        hint="Perlu pengamatan suhu"
                        icon={AlertTriangle}
                        tone="warning"
                        isLoading={isLoading}
                    />

                    <StatCard
                        label="Risiko Tinggi"
                        value={
                            counts === null
                                ? '—'
                                : String(counts['Berisiko Tinggi'])
                        }
                        hint={
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <AlertCircle className="size-3.5" />
                                Tindakan medis diperlukan
                            </span>
                        }
                        icon={ShieldAlert}
                        tone="danger"
                        isLoading={isLoading}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card className="gap-4 py-6 lg:col-span-2">
                        <CardHeader className="flex-row items-start justify-between gap-3 px-6">
                            <div>
                                <CardTitle className="text-sm">
                                    Tren Suhu Rata-Rata Populasi (7 Hari)
                                </CardTitle>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Rata-rata seluruh sensor wearable per hari
                                </p>
                            </div>
                            <span className="rounded-full bg-brand-soft/50 px-3 py-1 text-xs font-semibold text-brand-primary dark:bg-emerald-950/60 dark:text-brand-accent">
                                Semua Kandang
                            </span>
                        </CardHeader>

                        <CardContent className="px-6">
                            {trend.isLoading && trend.data === null ? (
                                <Skeleton className="h-64 w-full" />
                            ) : (trend.data?.daily ?? []).length === 0 ? (
                                <EmptyState message="Belum ada pembacaan sensor dalam 7 hari terakhir." />
                            ) : (
                                <LineChart
                                    description="Tren suhu rata-rata populasi selama 7 hari terakhir"
                                    points={(trend.data?.daily ?? []).map(
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

                    <div className="space-y-6">
                        <GatewayCard
                            reachable={edge.data?.reachable ?? null}
                            isLoading={edge.isLoading && edge.data === null}
                            updatedAt={edge.updatedAt}
                        />

                        <BarnBreakdown cows={herd} isLoading={isLoading} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="gap-4 py-6">
                        <CardHeader className="flex-row items-center justify-between gap-3 px-6">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <BellRing className="size-4 text-brand-primary dark:text-brand-accent" />
                                Timeline Peringatan Terbaru
                            </CardTitle>
                            <span className="text-[11px] text-gray-400">
                                Diperbarui otomatis
                            </span>
                        </CardHeader>

                        <CardContent className="max-h-72 space-y-4 overflow-y-auto px-6 pr-4">
                            {isLoading ? (
                                <Skeleton className="h-24 w-full" />
                            ) : alerts.length === 0 ? (
                                <p className="py-4 text-xs text-gray-400">
                                    Tidak ada sapi yang memerlukan perhatian
                                    saat ini.
                                </p>
                            ) : (
                                alerts.map((cow) => (
                                    <AlertRow key={cow.id} cow={cow} />
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="gap-4 py-6">
                        <CardHeader className="flex-row items-center justify-between gap-3 px-6">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Activity className="size-4 text-brand-primary dark:text-brand-accent" />
                                Aktivitas Sensor Terakhir
                            </CardTitle>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Real-time stream
                            </span>
                        </CardHeader>

                        <CardContent className="max-h-72 space-y-3.5 overflow-y-auto px-6 pr-4 text-xs">
                            {isLoading ? (
                                <Skeleton className="h-24 w-full" />
                            ) : recentReadings.length === 0 ? (
                                <p className="py-4 text-xs text-gray-400">
                                    Belum ada pembacaan sensor.
                                </p>
                            ) : (
                                recentReadings.map((cow) => (
                                    <ReadingRow key={cow.id} cow={cow} />
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function percentage(part: number, total: number): string {
    if (total === 0) {
        return '0%';
    }

    return `${Math.round((part / total) * 100)}%`;
}

function GatewayCard({
    reachable,
    isLoading,
    updatedAt,
}: {
    reachable: boolean | null;
    isLoading: boolean;
    updatedAt: Date | null;
}) {
    const online = reachable === true;

    return (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-brand-primary p-5 text-white shadow-soft">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-brand-accent uppercase">
                    Gateway Edge
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px]">
                    {isLoading
                        ? 'Memeriksa...'
                        : online
                          ? 'Perangkat aktif'
                          : 'Perangkat offline'}
                </span>
            </div>

            <div className="mt-3 flex items-center gap-4">
                <Radar
                    className={`size-12 shrink-0 ${
                        online ? 'text-brand-accent' : 'text-red-300'
                    }`}
                />
                <div>
                    <h4 className="text-2xl font-bold">
                        {online
                            ? 'Online'
                            : reachable === null
                              ? '—'
                              : 'Offline'}
                    </h4>
                    <p className="text-xs text-emerald-100/80">
                        {online
                            ? 'Raspberry Pi mengirim telemetri dan stream kamera.'
                            : 'Tidak menerima balasan dari Raspberry Pi.'}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
                <div>
                    <span className="text-[10px] text-emerald-200/70">
                        Kamera MJPEG
                    </span>
                    <p className="flex items-center gap-1 font-semibold">
                        <Camera className="size-3.5" />
                        {online ? 'Siap diakses' : 'Tidak tersedia'}
                    </p>
                </div>
                <div>
                    <span className="text-[10px] text-emerald-200/70">
                        Pembaruan terakhir
                    </span>
                    <p className="font-semibold">
                        {updatedAt === null
                            ? '—'
                            : updatedAt.toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                              })}
                    </p>
                </div>
            </div>
        </div>
    );
}

function BarnBreakdown({
    cows,
    isLoading,
}: {
    cows: CowSummary[];
    isLoading: boolean;
}) {
    const assigned = assignBarns(cows);

    return (
        <Card className="gap-4 py-6">
            <CardHeader className="px-6">
                <CardTitle className="text-xs font-bold tracking-wider text-gray-800 uppercase dark:text-white">
                    Sebaran Sapi Berisiko Per Kandang
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 px-6 text-xs">
                {isLoading ? (
                    <Skeleton className="h-24 w-full" />
                ) : assigned.length === 0 ? (
                    <p className="py-2 text-gray-400">
                        Belum ada sapi terdaftar.
                    </p>
                ) : (
                    BARNS.map((barn) => {
                        const members = cowsInBarn(assigned, barn.id);
                        const atRisk = members.filter(
                            (cow) => riskStatusOf(cow) !== 'Normal',
                        ).length;
                        const ratio =
                            members.length === 0
                                ? 0
                                : Math.round((atRisk / members.length) * 100);

                        return (
                            <div key={barn.id}>
                                <div className="mb-1 flex justify-between font-medium dark:text-gray-300">
                                    <span>{barn.name}</span>
                                    <span
                                        className={
                                            atRisk === 0
                                                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                                : 'font-semibold text-amber-500'
                                        }
                                    >
                                        {atRisk} Perhatian / {members.length}{' '}
                                        Sapi
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                                    <div
                                        className={`h-full rounded-full ${
                                            atRisk === 0
                                                ? 'bg-emerald-500'
                                                : 'bg-amber-500'
                                        }`}
                                        style={{ width: `${ratio}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}

function AlertRow({ cow }: { cow: CowSummary }) {
    const risk = cow.latest.risk_assessment;

    return (
        <Link
            href={`/cows/${cow.id}`}
            className="flex items-start gap-3 rounded-xl p-1 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
        >
            <RiskStatusPill
                status={riskStatusOf(cow)}
                className="mt-0.5 shrink-0"
            />

            <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-gray-800 dark:text-white">
                    {cow.code} · {cow.name}
                </span>
                <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {risk?.reasons.join(', ') || 'Tidak ada alasan dilaporkan.'}
                </span>
            </span>

            <span className="shrink-0 text-[10px] text-gray-400">
                {formatRelativeTime(latestRecordedAt(cow.latest))}
            </span>
        </Link>
    );
}

function ReadingRow({ cow }: { cow: CowSummary }) {
    const reading = cow.latest.sensor_reading;

    if (reading === null) {
        return null;
    }

    return (
        <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
                <HeartPulse className="size-4 shrink-0 text-red-500" />
                <span className="truncate font-semibold text-gray-700 dark:text-gray-300">
                    {cow.code}
                </span>
            </span>
            <span className="shrink-0 text-right">
                <span className="font-bold text-gray-800 dark:text-white">
                    {reading.temperature === null
                        ? NOT_AVAILABLE
                        : `${formatNumber(reading.temperature)} °C`}
                </span>
                <span className="block text-[10px] text-gray-400">
                    {formatRelativeTime(reading.recorded_at)}
                </span>
            </span>
        </div>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Gambaran Umum',
            href: dashboard(),
        },
    ],
};
