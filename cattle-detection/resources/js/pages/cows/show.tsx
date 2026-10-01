import { Head, Link } from '@inertiajs/react';
import { ClockAlertIcon, DownloadIcon } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { EmptyState, ErrorState, LoadingState } from '@/components/monitoring/data-state';
import LineChart from '@/components/monitoring/line-chart';
import ReadingValue from '@/components/monitoring/reading-value';
import RefreshControls from '@/components/monitoring/refresh-controls';
import RiskStatusBadge from '@/components/monitoring/risk-status-badge';
import VisionLabelBadge from '@/components/monitoring/vision-label-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { usePollingResource } from '@/hooks/use-polling-resource';
import {
    formatDateTime,
    formatNumber,
    formatPercentage,
    formatRelativeTime,
    NOT_AVAILABLE,
} from '@/lib/format';
import { Button } from '@/components/ui/button';
import { cowService } from '@/services/cow-service';
import { dashboard } from '@/routes';
import { exportMethod as exportCowCsv, index as cowsIndex } from '@/routes/cows';
import { NO_DATA_STATUS, type CowSnapshot } from '@/types/telemetry';

const LATEST_INTERVAL_MS = 10_000;
const HISTORY_INTERVAL_MS = 60_000;
const WINDOWS = [6, 12, 24, 48, 72, 168] as const;

type Props = {
    /** Server-rendered snapshot so the first paint is never empty. */
    snapshot: CowSnapshot;
};

export default function CowShow({ snapshot }: Props) {
    const [hours, setHours] = useState<number>(24);
    const cowId = snapshot.cow.id;

    const latest = usePollingResource(
        (signal) => cowService.latest(cowId, signal),
        {
            intervalMs: LATEST_INTERVAL_MS,
            cacheKey: `cow:${cowId}`,
            initialData: snapshot,
        },
    );

    const history = usePollingResource(
        (signal) => cowService.history(cowId, { hours }, signal),
        {
            intervalMs: HISTORY_INTERVAL_MS,
            cacheKey: `history:${cowId}:${hours}`,
        },
    );

    const current = latest.data ?? snapshot;
    const { sensor_reading, vision_prediction, risk_assessment } = current;
    const status = risk_assessment?.status ?? NO_DATA_STATUS;

    return (
        <>
            <Head title={`Sapi ${snapshot.cow.code}`} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <Heading
                            title={`${snapshot.cow.code} · ${snapshot.cow.name}`}
                            description="Kondisi terkini, data sensor, prediksi visual, dan histori sapi."
                            className="mb-0"
                        />
                        <Link
                            href={cowsIndex()}
                            className="text-sm text-muted-foreground hover:underline"
                        >
                            Kembali ke daftar sapi
                        </Link>
                    </div>
                    <RefreshControls
                        updatedAt={latest.updatedAt}
                        isRefreshing={latest.isRefreshing}
                        onRefresh={latest.refresh}
                    />
                </div>

                {latest.error !== null && latest.data === null ? (
                    <ErrorState error={latest.error} onRetry={latest.refresh} />
                ) : null}

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="gap-4 py-4 lg:col-span-1">
                        <CardHeader className="flex-row items-center justify-between gap-2 px-4">
                            <CardTitle className="text-base">Status risiko</CardTitle>
                            {current.is_stale ? (
                                <Badge
                                    variant="outline"
                                    className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                                >
                                    <ClockAlertIcon className="size-3" />
                                    Data basi
                                </Badge>
                            ) : null}
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 px-4">
                            <div className="flex items-end gap-3">
                                <span className="text-4xl leading-none font-semibold tabular-nums">
                                    {risk_assessment === null
                                        ? NOT_AVAILABLE
                                        : formatNumber(risk_assessment.score)}
                                </span>
                                <RiskStatusBadge status={status} className="mb-1" />
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-xs text-muted-foreground">
                                    Alasan dari sensor fusion
                                </span>
                                {risk_assessment === null || risk_assessment.reasons.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Tidak ada alasan yang dilaporkan.
                                    </p>
                                ) : (
                                    <ul className="list-inside list-disc text-sm">
                                        {risk_assessment.reasons.map((reason) => (
                                            <li key={reason}>{reason}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Dinilai:{' '}
                                {formatDateTime(risk_assessment?.recorded_at ?? null)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="gap-4 py-4 lg:col-span-2">
                        <CardHeader className="px-4">
                            <CardTitle className="text-base">
                                Pembacaan sensor wearable
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4">
                            {sensor_reading === null ? (
                                <EmptyState message="Raspberry Pi belum mengirim pembacaan sensor untuk sapi ini." />
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                        <ReadingValue
                                            label="Suhu tubuh"
                                            value={`${formatNumber(sensor_reading.temperature)} °C`}
                                        />
                                        <ReadingValue
                                            label="Akselerometer X"
                                            value={formatNumber(sensor_reading.ax, 2)}
                                            mono
                                        />
                                        <ReadingValue
                                            label="Akselerometer Y"
                                            value={formatNumber(sensor_reading.ay, 2)}
                                            mono
                                        />
                                        <ReadingValue
                                            label="Akselerometer Z"
                                            value={formatNumber(sensor_reading.az, 2)}
                                            mono
                                        />
                                        <ReadingValue
                                            label="Giroskop X"
                                            value={formatNumber(sensor_reading.gx, 2)}
                                            mono
                                        />
                                        <ReadingValue
                                            label="Giroskop Y"
                                            value={formatNumber(sensor_reading.gy, 2)}
                                            mono
                                        />
                                        <ReadingValue
                                            label="Giroskop Z"
                                            value={formatNumber(sensor_reading.gz, 2)}
                                            mono
                                        />
                                        <ReadingValue
                                            label="Waktu sensor"
                                            value={formatRelativeTime(
                                                sensor_reading.recorded_at,
                                            )}
                                        />
                                    </div>
                                    <p className="mt-4 text-xs text-muted-foreground">
                                        Akselerometer dan giroskop dalam m/s² dan rad/s. Nilai
                                        negatif berarti arah sumbu terbalik.
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="gap-4 py-4">
                    <CardHeader className="flex-row items-center justify-between gap-2 px-4">
                        <CardTitle className="text-base">Prediksi computer vision</CardTitle>
                        {vision_prediction === null ? (
                            <span className="text-sm text-muted-foreground">
                                {NOT_AVAILABLE}
                            </span>
                        ) : (
                            <VisionLabelBadge
                                label={vision_prediction.label}
                                confidence={vision_prediction.confidence}
                            />
                        )}
                    </CardHeader>
                    <CardContent className="px-4">
                        {vision_prediction === null ? (
                            <EmptyState message="Belum ada hasil deteksi visual untuk sapi ini." />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Label {vision_prediction.label} dengan confidence{' '}
                                {formatPercentage(vision_prediction.confidence)} pada{' '}
                                {formatDateTime(vision_prediction.recorded_at)}.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="gap-4 py-4">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 px-4">
                        <CardTitle className="text-base">Histori</CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                Rentang
                            </span>
                            <Select
                                value={String(hours)}
                                onValueChange={(value) => setHours(Number(value))}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {WINDOWS.map((window) => (
                                        <SelectItem key={window} value={String(window)}>
                                            {window} jam
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <RefreshControls
                                updatedAt={history.updatedAt}
                                isRefreshing={history.isRefreshing}
                                onRefresh={history.refresh}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                // Plain anchor so the browser follows the file
                                // download instead of an Inertia visit.
                                asChild
                            >
                                <a
                                    href={exportCowCsv.url(
                                        { cow: cowId },
                                        { query: { hours } },
                                    )}
                                    download
                                >
                                    <DownloadIcon />
                                    Ekspor CSV
                                </a>
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-6 px-4">
                        {history.error !== null ? (
                            <ErrorState error={history.error} onRetry={history.refresh} />
                        ) : null}

                        {history.isLoading && history.data === null ? (
                            <LoadingState rows={2} />
                        ) : (
                            <>
                                <div className="grid gap-6 xl:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-medium">
                                            Suhu tubuh
                                        </h3>
                                        <LineChart
                                            description={`Grafik suhu tubuh ${snapshot.cow.code} selama ${hours} jam terakhir`}
                                            points={(history.data?.temperature ?? []).map(
                                                (point) => ({
                                                    recordedAt: point.recorded_at,
                                                    value: point.value,
                                                }),
                                            )}
                                            unit="suhu"
                                            formatValue={(value) => value.toFixed(1)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-medium">
                                            Risk score
                                        </h3>
                                        <LineChart
                                            description={`Grafik risk score ${snapshot.cow.code} selama ${hours} jam terakhir`}
                                            points={(history.data?.risk_score ?? []).map(
                                                (point) => ({
                                                    recordedAt: point.recorded_at,
                                                    value: point.value,
                                                }),
                                            )}
                                            unit="skor"
                                            domain={{ min: 0, max: 100 }}
                                            strokeClassName="stroke-amber-500"
                                            formatValue={(value) => value.toFixed(0)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <h3 className="text-sm font-medium">
                                        Riwayat prediksi visual
                                    </h3>
                                    {(history.data?.vision ?? []).length === 0 ? (
                                        <EmptyState message="Belum ada prediksi computer vision pada rentang ini." />
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Waktu</TableHead>
                                                        <TableHead>Label</TableHead>
                                                        <TableHead className="text-right">
                                                            Confidence
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(
                                                        history.data?.vision ?? []
                                                    )
                                                        .slice()
                                                        .reverse()
                                                        .map((point) => (
                                                            <TableRow key={point.recorded_at}>
                                                                <TableCell>
                                                                    {formatDateTime(
                                                                        point.recorded_at,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <VisionLabelBadge
                                                                        label={point.label}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {formatPercentage(
                                                                        point.confidence,
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CowShow.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Cows',
            href: cowsIndex(),
        },
    ],
};
