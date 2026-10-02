import { Link } from '@inertiajs/react';
import {
    Activity,
    CameraOff,
    Footprints,
    Gauge,
    RefreshCw,
    Repeat,
    Thermometer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import RiskGauge, { riskGaugeCaption } from '@/components/charts/risk-gauge';
import CowAvatar from '@/components/monitoring/cow-avatar';
import { ErrorState } from '@/components/monitoring/data-state';
import LineChart from '@/components/monitoring/line-chart';
import RiskStatusPill, {
    riskDotClassName,
} from '@/components/monitoring/risk-status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMjpegStream, type MjpegStream } from '@/hooks/use-mjpeg-stream';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { barnOfIndex } from '@/lib/barns';
import {
    formatDateTime,
    formatNumber,
    formatPercentage,
    formatRelativeTime,
    NOT_AVAILABLE,
} from '@/lib/format';
import { index as historyIndex } from '@/routes/history';
import { cameraService } from '@/services/camera-service';
import { cowService } from '@/services/cow-service';
import {
    NO_DATA_STATUS,
    type CowSnapshot,
    type RiskStatusValue,
} from '@/types/telemetry';

const LATEST_INTERVAL_MS = 10_000;
const EDGE_INTERVAL_MS = 15_000;
const HISTORY_INTERVAL_MS = 60_000;

const CAMERA_BADGE = 'CAM-04 (MJPEG)';

/** Slider scale of the mockup, used to place the current body temperature. */
const TEMP_MIN = 36;
const TEMP_MAX = 42.5;
const TEMP_SAFE_MAX = 39.3;

type Props = {
    /** Server-rendered snapshot so the first paint is never empty. */
    snapshot: CowSnapshot;
    /** Position of the cow in the herd, used to derive its pen. */
    ordinal?: number;
    /** Extra buttons for the profile bar, e.g. the CSV export. */
    headerActions?: ReactNode;
    /** Extra controls for the chart header, e.g. the window picker. */
    chartActions?: ReactNode;
};

/**
 * Body of the "Detail Ternak" page, shared by `/detail` and `/cows/{cow}`.
 *
 * Layout, colours and spacing follow section "PAGE 4: DETAIL TERNAK" of
 * "Desain Dashboard.html". Every readout is real telemetry; where the mockup
 * invents a metric the wearable does not have (heart rate, rumination), the
 * panel shows an actual IMU measurement instead of a fake number.
 */
export default function CattleDetailView({
    snapshot,
    ordinal = 0,
    headerActions,
    chartActions,
}: Props) {
    const cowId = snapshot.cow.id;

    const latest = usePollingResource(
        (signal) => cowService.latest(cowId, signal),
        {
            intervalMs: LATEST_INTERVAL_MS,
            cacheKey: `cow:${cowId}`,
            initialData: snapshot,
        },
    );

    const camera = usePollingResource(
        (signal) => cameraService.status(signal),
        { intervalMs: EDGE_INTERVAL_MS, cacheKey: 'edge-camera' },
    );

    const history = usePollingResource(
        (signal) => cowService.history(cowId, { hours: 24 }, signal),
        {
            intervalMs: HISTORY_INTERVAL_MS,
            cacheKey: `history:${cowId}:24`,
        },
    );

    const current = latest.data ?? snapshot;
    const { sensor_reading, vision_prediction, risk_assessment } = current;
    const status = risk_assessment?.status ?? NO_DATA_STATUS;
    const barn = barnOfIndex(ordinal);
    const temperature = sensor_reading?.temperature ?? null;
    const activity = sensor_reading?.activity ?? null;
    const stream = useMjpegStream(camera.data?.stream_url ?? null);

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-soft md:flex-row md:items-center dark:border-slate-700/60 dark:bg-slate-800">
                <div className="flex items-center gap-4">
                    <CowAvatar
                        name={snapshot.cow.name}
                        dotClassName={riskDotClassName(status)}
                        className="size-16"
                    />

                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                                Sapi {snapshot.cow.code} ({snapshot.cow.name})
                            </h1>
                            <RiskStatusPill status={status} size="md" withDot />
                        </div>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Kode: {snapshot.cow.code} | {barn.label} |
                            Pembaruan:{' '}
                            {formatRelativeTime(
                                sensor_reading?.recorded_at ??
                                    risk_assessment?.recorded_at ??
                                    null,
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[11px] text-gray-400">
                        {latest.isRefreshing
                            ? 'Memperbarui...'
                            : latest.updatedAt === null
                              ? 'Memuat data...'
                              : `Data pukul ${latest.updatedAt.toLocaleTimeString(
                                    'id-ID',
                                    {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                    },
                                )}`}
                    </span>

                    {headerActions}

                    <Button
                        type="button"
                        onClick={() => stream.restart()}
                        className="gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow transition-all hover:bg-brand-secondary"
                    >
                        <RefreshCw className="size-4" />
                        Sambung Ulang
                    </Button>
                </div>
            </div>

            {latest.error !== null && latest.data === null ? (
                <ErrorState error={latest.error} onRetry={latest.refresh} />
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                    <CameraPanel
                        stream={stream}
                        isOffline={camera.data?.reachable === false}
                        isLoading={camera.isLoading && camera.data === null}
                        label={vision_prediction?.label ?? null}
                        confidence={vision_prediction?.confidence ?? null}
                        pPmk={vision_prediction?.p_pmk ?? null}
                        status={status}
                        code={snapshot.cow.code}
                    />

                    <Card className="gap-4 py-5">
                        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 px-6">
                            <div>
                                <CardTitle className="text-sm">
                                    Grafik Fluktuasi Suhu 24 Jam
                                </CardTitle>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Data kontinu dari sensor wearable IoT
                                </p>
                            </div>

                            {chartActions ?? (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                                    Interval 1 Jam
                                </span>
                            )}
                        </CardHeader>

                        <CardContent className="px-6">
                            {history.isLoading && history.data === null ? (
                                <Skeleton className="h-60 w-full" />
                            ) : (
                                <LineChart
                                    description={`Grafik suhu tubuh ${snapshot.cow.code} selama 24 jam terakhir`}
                                    points={(
                                        history.data?.temperature ?? []
                                    ).map((point) => ({
                                        recordedAt: point.recorded_at,
                                        value: point.value,
                                    }))}
                                    height={240}
                                    formatValue={(value) => value.toFixed(1)}
                                    referenceLines={[
                                        {
                                            value: TEMP_SAFE_MAX,
                                            label: 'Batas aman',
                                        },
                                    ]}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="gap-4 py-5">
                        <CardHeader className="px-6">
                            <CardTitle className="text-sm">
                                Riwayat Medis &amp; Log Diagnosa
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="px-6">
                            {history.isLoading && history.data === null ? (
                                <div className="space-y-4" aria-hidden="true">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : (
                                <Timeline
                                    temperature={
                                        history.data?.temperature ?? []
                                    }
                                    riskScore={history.data?.risk_score ?? []}
                                    vision={history.data?.vision ?? []}
                                    code={snapshot.cow.code}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6 lg:col-span-4">
                    <Card className="gap-4 py-6 text-center">
                        <CardHeader className="px-6">
                            <CardTitle className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                AI Risk Score Index
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="px-6">
                            <RiskGauge
                                score={risk_assessment?.score ?? null}
                                description={`Skor risiko AI untuk ${snapshot.cow.code}`}
                                className="mx-auto size-40"
                            />

                            <p className="mt-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {riskGaugeCaption(
                                    risk_assessment?.score ?? null,
                                )}
                            </p>

                            {risk_assessment === null ? null : (
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Dinilai:{' '}
                                    {formatDateTime(
                                        risk_assessment.recorded_at,
                                    )}
                                </p>
                            )}

                            {risk_assessment === null ||
                            risk_assessment.reasons.length === 0 ? (
                                <p className="mt-3 text-xs text-gray-400">
                                    Tidak ada alasan yang dilaporkan.
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-1 text-left text-xs text-gray-600 dark:text-gray-300">
                                    {risk_assessment.reasons.map((reason) => (
                                        <li key={reason}>• {reason}</li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="gap-4 py-5">
                        <CardHeader className="px-6">
                            <CardTitle className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                Sensor Telemetri IoT Direct
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4 px-6">
                            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        <Thermometer className="size-4 text-red-500" />
                                        Suhu Tubuh
                                    </span>
                                    <span className="text-base font-bold text-gray-800 dark:text-white">
                                        {formatNumber(temperature)} °C
                                    </span>
                                </div>

                                <div className="space-y-1 pt-1">
                                    <input
                                        type="range"
                                        min={TEMP_MIN}
                                        max={TEMP_MAX}
                                        step={0.1}
                                        value={temperature ?? TEMP_MIN}
                                        readOnly
                                        aria-label="Posisi suhu tubuh pada skala 36,0 - 42,5 °C"
                                        aria-valuetext={`${formatNumber(
                                            temperature,
                                        )} derajat Celsius`}
                                        className="h-1.5 w-full cursor-default appearance-none rounded-lg bg-gray-200 range-brand dark:bg-slate-700"
                                    />
                                    <div className="flex justify-between font-mono text-[10px] text-gray-400">
                                        <span>36.0°C (Hipotermia)</span>
                                        <span>Batas aman 39.3°C</span>
                                        <span>42.5°C (Demam)</span>
                                    </div>
                                </div>
                            </div>

                            <ReadingRow
                                icon={Footprints}
                                iconClassName="text-emerald-500"
                                label="Tingkat Aktivitas"
                                value={
                                    activity?.score === undefined ||
                                    activity?.score === null
                                        ? NOT_AVAILABLE
                                        : `${formatNumber(activity.score)} (${describeActivity(
                                              activity.score,
                                          )})`
                                }
                            />

                            <ReadingRow
                                icon={Repeat}
                                iconClassName="text-amber-500"
                                label="Rasio Gerak IMU"
                                value={
                                    activity?.ratio === undefined ||
                                    activity?.ratio === null
                                        ? NOT_AVAILABLE
                                        : formatNumber(activity.ratio, 2)
                                }
                            />

                            <ReadingRow
                                icon={Gauge}
                                iconClassName="text-rose-500"
                                label="Baseline Akselerometer"
                                value={
                                    activity?.baseline === undefined ||
                                    activity?.baseline === null
                                        ? NOT_AVAILABLE
                                        : `${formatNumber(activity.baseline, 3)} g`
                                }
                            />

                            <ReadingRow
                                icon={Activity}
                                iconClassName="text-brand-secondary dark:text-brand-accent"
                                label="Waktu Sensor"
                                value={formatRelativeTime(
                                    sensor_reading?.recorded_at ?? null,
                                )}
                            />

                            {activity?.baseline_ready === false ? (
                                <p className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <Activity className="mt-0.5 size-3.5 shrink-0" />
                                    Baseline aktivitas belum stabil, skor
                                    aktivitas masih sementara.
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ReadingRow({
    icon: Icon,
    iconClassName,
    label,
    value,
}: {
    icon: typeof Thermometer;
    iconClassName: string;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <Icon className={`size-4 ${iconClassName}`} />
                {label}
            </span>
            <span className="text-base font-bold text-gray-800 dark:text-white">
                {value}
            </span>
        </div>
    );
}

function describeActivity(score: number): string {
    if (score < 30) {
        return 'Rendah';
    }

    if (score < 70) {
        return 'Sedang';
    }

    return 'Tinggi';
}

type CameraPanelProps = {
    stream: MjpegStream;
    isOffline: boolean | undefined;
    isLoading: boolean;
    label: string | null;
    confidence: number | null;
    pPmk: number | null;
    status: RiskStatusValue;
    code: string;
};

/**
 * Live MJPEG box with the AI detection strip of the mockup.
 *
 * The feed is loaded straight from the Pi: proxying a continuous multipart
 * response through PHP would buffer frames and turn "live" into "delayed".
 */
function CameraPanel({
    stream,
    isOffline,
    isLoading,
    label,
    confidence,
    pPmk,
    status,
    code,
}: CameraPanelProps) {
    return (
        <Card className="gap-4 py-5">
            <CardHeader className="flex-row items-center justify-between gap-3 px-5">
                <div className="flex items-center gap-2">
                    <span className="size-2.5 animate-ping rounded-full bg-red-500" />
                    <CardTitle className="text-xs font-bold tracking-wider uppercase">
                        AI Computer Vision Live Stream Feed
                    </CardTitle>
                </div>
                <span className="rounded bg-black px-2 py-0.5 font-mono text-[10px] text-white">
                    {CAMERA_BADGE}
                </span>
            </CardHeader>

            <CardContent className="px-5">
                <div className="relative flex h-80 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                    {stream.src === null ? (
                        <Skeleton className="size-full rounded-none" />
                    ) : (
                        <img
                            key={stream.src}
                            src={stream.src}
                            alt={`Live camera sapi dari Raspberry Pi (${code})`}
                            className="absolute inset-0 size-full object-cover opacity-80"
                            onLoad={stream.markFrame}
                            onError={stream.markFailed}
                        />
                    )}

                    {isOffline || stream.failed ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center">
                            <CameraOff className="size-8 text-gray-400" />
                            <p className="text-xs font-semibold text-white">
                                {isOffline
                                    ? 'Raspberry Pi tidak merespons'
                                    : 'Stream kamera terputus'}
                            </p>
                            <p className="max-w-sm text-[11px] text-gray-400">
                                Pastikan cattleye/main.py berjalan dan alamat
                                CATTLEYE_EDGE_URL benar.
                            </p>
                        </div>
                    ) : null}

                    {!stream.hasFrame &&
                    !stream.failed &&
                    !isOffline &&
                    stream.src !== null ? (
                        <span className="absolute top-3 left-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] text-white backdrop-blur-md">
                            {isLoading
                                ? 'Menghubungi Raspberry Pi...'
                                : 'Menunggu frame pertama...'}
                        </span>
                    ) : null}

                    <div className="absolute right-3 bottom-3 left-3 z-20 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-900/80 p-2.5 text-[11px] text-white backdrop-blur-md">
                        <span className="font-semibold text-brand-accent">
                            Deteksi CV AI:
                        </span>
                        <span
                            className={`rounded border px-2 py-0.5 ${
                                label === 'PMK'
                                    ? 'border-red-500/40 bg-red-500/30 text-red-300'
                                    : 'border-emerald-500/40 bg-emerald-500/30 text-emerald-300'
                            }`}
                        >
                            Label: {label ?? 'Belum ada'} (
                            {formatPercentage(confidence)})
                        </span>
                        <span
                            className={`rounded border px-2 py-0.5 ${
                                pPmk !== null && pPmk >= 0.5
                                    ? 'border-red-500/40 bg-red-500/30 text-red-300'
                                    : 'border-amber-500/40 bg-amber-500/30 text-amber-300'
                            }`}
                        >
                            p(PMK): {formatPercentage(pPmk)}
                        </span>
                        <span
                            className={`rounded border px-2 py-0.5 ${
                                status === 'Berisiko Tinggi'
                                    ? 'border-red-500/40 bg-red-500/30 text-red-300'
                                    : 'border-emerald-500/40 bg-emerald-500/30 text-emerald-300'
                            }`}
                        >
                            Risiko: {status}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

type TimelineProps = {
    temperature: { recorded_at: string; value: number | null }[];
    riskScore: { recorded_at: string; value: number; status: string }[];
    vision: { recorded_at: string; label: string; confidence: number }[];
    code: string;
};

/**
 * Diagnosis log, newest first.
 *
 * The mockup hard-codes two entries per cow; here the entries are the actual
 * telemetry timeline so an operator can see what the AI based its score on.
 */
function Timeline({ temperature, riskScore, vision, code }: TimelineProps) {
    const events = [
        ...temperature.map((point) => ({
            at: point.recorded_at,
            text:
                point.value === null
                    ? 'Pembacaan sensor tanpa nilai suhu.'
                    : `Sensor wearable mencatat suhu tubuh ${formatNumber(point.value)} °C.`,
        })),
        ...riskScore.map((point) => ({
            at: point.recorded_at,
            text: `Penilaian risiko AI: ${formatNumber(point.value, 0)}/100 (${point.status}).`,
        })),
        ...vision.map((point) => ({
            at: point.recorded_at,
            text: `Computer vision: label ${point.label} dengan confidence ${formatPercentage(point.confidence)}.`,
        })),
    ]
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .slice(0, 20);

    if (events.length === 0) {
        return (
            <p className="py-4 text-xs text-gray-400">
                Belum ada histori untuk {code} pada rentang 24 jam terakhir.
            </p>
        );
    }

    return (
        <div className="ml-2 space-y-4 border-l-2 border-gray-200 pl-4 dark:border-slate-700">
            {events.map((event) => (
                <div
                    key={`${event.at}-${event.text}`}
                    className="relative pl-2"
                >
                    <span className="text-[10px] font-bold text-brand-primary dark:text-brand-accent">
                        {formatRelativeTime(event.at)}
                    </span>
                    <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {event.text}
                    </p>
                </div>
            ))}

            <p className="text-[11px] text-gray-400">
                Total {events.length} kejadian terbaru.{' '}
                <Link
                    href={historyIndex()}
                    className="font-semibold text-brand-primary hover:underline dark:text-brand-accent"
                >
                    Lihat histori lengkap
                </Link>
            </p>
        </div>
    );
}
