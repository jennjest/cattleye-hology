import { Head } from '@inertiajs/react';
import { DownloadIcon } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { EmptyState, ErrorState, LoadingState } from '@/components/monitoring/data-state';
import LineChart from '@/components/monitoring/line-chart';
import RefreshControls from '@/components/monitoring/refresh-controls';
import VisionLabelBadge from '@/components/monitoring/vision-label-badge';
import { Button } from '@/components/ui/button';
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
import { formatDateTime, formatNumber, formatPercentage } from '@/lib/format';
import { cowService } from '@/services/cow-service';
import { dashboard } from '@/routes';
import { exportMethod as exportCowCsv } from '@/routes/cows';
import { index as historyIndex } from '@/routes/history';

const COWS_INTERVAL_MS = 60_000;
const HISTORY_INTERVAL_MS = 60_000;
const WINDOWS = [6, 12, 24, 48, 72, 168] as const;

export default function History() {
    const [selectedCow, setSelectedCow] = useState<number | null>(null);
    const [hours, setHours] = useState<number>(24);

    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: COWS_INTERVAL_MS,
        cacheKey: 'cows',
    });

    // Defaults to the first cow once the list arrives, so the page always has
    // something real to plot without inventing a selection.
    const cowId = selectedCow ?? cows.data?.[0]?.id ?? null;

    const history = usePollingResource(
        (signal) => cowService.history(cowId ?? 0, { hours }, signal),
        {
            intervalMs: HISTORY_INTERVAL_MS,
            cacheKey: `history:${cowId}:${hours}`,
            enabled: cowId !== null,
        },
    );

    return (
        <>
            <Head title="History" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <Heading
                        title="History"
                        description="Histori pembacaan sensor dan hasil sensor fusion untuk setiap sapi."
                        className="mb-0"
                    />
                    <RefreshControls
                        updatedAt={history.updatedAt}
                        isRefreshing={history.isRefreshing}
                        onRefresh={history.refresh}
                    />
                </div>

                <Card className="gap-4 py-4">
                    <CardHeader className="flex-row flex-wrap items-center gap-3 px-4">
                        <Select
                            value={cowId === null ? undefined : String(cowId)}
                            onValueChange={(value) => setSelectedCow(Number(value))}
                            disabled={cows.isLoading || (cows.data ?? []).length === 0}
                        >
                            <SelectTrigger className="w-56">
                                <SelectValue placeholder="Pilih sapi" />
                            </SelectTrigger>
                            <SelectContent>
                                {(cows.data ?? []).map((cow) => (
                                    <SelectItem key={cow.id} value={String(cow.id)}>
                                        {cow.code} · {cow.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

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

                        {history.data !== null ? (
                            <span className="text-xs text-muted-foreground">
                                {history.data.temperature.length} pembacaan suhu,{' '}
                                {history.data.risk_score.length} penilaian risiko
                            </span>
                        ) : null}

                        {cowId !== null ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-auto"
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
                        ) : null}
                    </CardHeader>

                    <CardContent className="flex flex-col gap-6 px-4">
                        {cows.error !== null ? (
                            <ErrorState error={cows.error} onRetry={cows.refresh} />
                        ) : null}

                        {history.error !== null ? (
                            <ErrorState error={history.error} onRetry={history.refresh} />
                        ) : null}

                        {cows.isLoading && cows.data === null ? (
                            <LoadingState rows={2} />
                        ) : cowId === null ? (
                            <EmptyState message="Belum ada sapi yang bisa ditampilkan. Tambahkan sapi terlebih dahulu." />
                        ) : history.isLoading && history.data === null ? (
                            <LoadingState rows={3} />
                        ) : (
                            <>
                                <div className="grid gap-6 xl:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-medium">
                                            Suhu tubuh
                                        </h3>
                                        <LineChart
                                            description={`Grafik suhu tubuh selama ${hours} jam terakhir`}
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
                                        <h3 className="text-sm font-medium">Risk score</h3>
                                        <LineChart
                                            description={`Grafik risk score selama ${hours} jam terakhir`}
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
                                        Riwayat prediksi computer vision
                                    </h3>
                                    {(history.data?.vision ?? []).length === 0 ? (
                                        <EmptyState message="Belum ada prediksi computer vision pada rentang ini." />
                                    ) : (
                                        <div className="max-h-96 overflow-auto rounded-xl border">
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
                                                    {(history.data?.vision ?? [])
                                                        .slice()
                                                        .reverse()
                                                        .map((point) => (
                                                            <TableRow
                                                                key={point.recorded_at}
                                                            >
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

                                <div className="flex flex-col gap-2">
                                    <h3 className="text-sm font-medium">
                                        Penilaian risiko terbaru
                                    </h3>
                                    <div className="max-h-96 overflow-auto rounded-xl border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Waktu</TableHead>
                                                    <TableHead className="text-right">
                                                        Skor
                                                    </TableHead>
                                                    <TableHead>Alasan</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(history.data?.risk_score ?? [])
                                                    .slice()
                                                    .reverse()
                                                    .map((point) => (
                                                        <TableRow
                                                            key={point.recorded_at}
                                                        >
                                                            <TableCell>
                                                                {formatDateTime(
                                                                    point.recorded_at,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {formatNumber(
                                                                    point.value,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="whitespace-normal text-muted-foreground">
                                                                {point.status}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

History.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'History',
            href: historyIndex(),
        },
    ],
};
