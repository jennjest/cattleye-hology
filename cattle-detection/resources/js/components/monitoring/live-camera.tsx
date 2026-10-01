import {
    CameraOffIcon,
    CircleAlertIcon,
    RefreshCwIcon,
    VideoIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import ReadingValue from '@/components/monitoring/reading-value';
import RiskStatusBadge from '@/components/monitoring/risk-status-badge';
import VisionLabelBadge from '@/components/monitoring/vision-label-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    formatNumber,
    formatPercentage,
    formatTime,
} from '@/lib/format';
import type { CameraStatus } from '@/types/camera';

/**
 * Live MJPEG view of the cow pen.
 *
 * The Raspberry Pi owns the camera, the overlay and the model; this component
 * only renders the `<img>` it hands us. The stream is therefore never proxied
 * through PHP: proxying a continuous multipart response would buffer frames and
 * turn "live" into "delayed by a few seconds".
 *
 * Two details matter for a multipart feed:
 *  - `onLoad` fires as soon as the first frame decodes, even though the request
 *    stays open forever, so it is used as the "stream is up" signal.
 *  - the element must not be re-created on every poll. React keeps it as long as
 *    `src` is unchanged; the retry button bumps `nonce` on purpose to restart it.
 */
type Props = {
    status: CameraStatus | null;
    isLoading: boolean;
    onRetry: () => void;
    className?: string;
};

export default function LiveCamera({ status, isLoading, onRetry, className }: Props) {
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [hasFrame, setHasFrame] = useState(false);
    const [streamFailed, setStreamFailed] = useState(false);
    const [nonce, setNonce] = useState(0);

    // Adopt a new URL only when it really changed, so polling never restarts the
    // stream behind the operator's back.
    useEffect(() => {
        const next = status?.stream_url ?? null;

        if (next !== streamUrl) {
            setStreamUrl(next);
            setHasFrame(false);
            setStreamFailed(false);
        }
    }, [status?.stream_url, streamUrl]);

    const isOffline = status !== null && !status.reachable;

    const restart = (): void => {
        setNonce((value) => value + 1);
        setHasFrame(false);
        setStreamFailed(false);
        onRetry();
    };

    return (
        <Card className={`gap-4 py-4 ${className ?? ''}`}>
            <CardHeader className="px-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="grid gap-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <VideoIcon className="size-4" />
                            Live camera
                        </CardTitle>
                        <CardDescription>
                            Aliran MJPEG dari Raspberry Pi. Semua pemrosesan
                            video berjalan di Pi, bukan di server.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOffline ? (
                            <Badge
                                variant="outline"
                                className="border-destructive/40 text-destructive"
                            >
                                <CameraOffIcon className="size-3" />
                                Raspberry Pi offline
                            </Badge>
                        ) : hasFrame ? (
                            <Badge
                                variant="outline"
                                className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                            >
                                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                                Live
                            </Badge>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={restart}
                        >
                            <RefreshCwIcon />
                            Sambung ulang
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="grid gap-4 px-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                    {streamUrl === null ? (
                        <Skeleton className="size-full" />
                    ) : (
                        <img
                            key={`${streamUrl}-${nonce}`}
                            src={streamUrl}
                            alt="Live camera sapi dari Raspberry Pi"
                            className="size-full object-contain"
                            onLoad={() => setHasFrame(true)}
                            onError={() => {
                                setStreamFailed(true);
                                setHasFrame(false);
                            }}
                        />
                    )}

                    {isOffline || streamFailed ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 p-4 text-center">
                            <CameraOffIcon className="size-6 text-muted-foreground" />
                            <p className="text-sm font-medium">
                                {isOffline
                                    ? 'Raspberry Pi tidak merespons'
                                    : 'Stream kamera terputus'}
                            </p>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                {isOffline
                                    ? `Pastikan cattleye/main.py berjalan dan alamat CATTLEYE_EDGE_URL benar (${streamUrl ?? 'tidak diketahui'}).`
                                    : 'Stream berhenti sementara Pi masih hidup. Coba sambungkan ulang.'}
                            </p>
                        </div>
                    ) : null}

                    {hasFrame === false && streamFailed === false && isOffline === false ? (
                        <div className="absolute inset-x-0 bottom-0 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
                            {isLoading && streamUrl === null
                                ? 'Menghubungi Raspberry Pi...'
                                : 'Menunggu frame pertama...'}
                        </div>
                    ) : null}
                </div>

                <EdgeInputs status={status} />
            </CardContent>
        </Card>
    );
}

/**
 * Fusion inputs read straight from the Pi.
 *
 * These are the values `fuzzy_infer()` in main.py actually weighs, including the
 * ones it had to substitute because the input was missing. Showing them makes an
 * unexpected risk score explainable instead of mysterious.
 */
function EdgeInputs({ status }: { status: CameraStatus | null }) {
    const state = status?.state ?? null;

    if (state === null) {
        return (
            <div className="grid content-start gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    const { wearable, activity, vision, risk } = state;

    if (wearable === null && activity === null && vision === null && risk === null) {
        return (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-4">
                <p className="text-sm font-medium">Input fusion belum tersedia</p>
                <p className="text-sm text-muted-foreground">
                    Pi belum mengirim state. Proses fusion baru berjalan setelah
                    kamera dan sensor wearer menghasilkan data pertama.
                </p>
            </div>
        );
    }

    return (
        <div className="grid content-start gap-4">
            <div className="grid grid-cols-2 gap-3">
                <ReadingValue
                    label="Suhu permukaan"
                    value={
                        wearable?.temperature === null || wearable === null
                            ? '—'
                            : `${formatNumber(wearable.temperature, 2)} °C`
                    }
                    mono
                />
                <ReadingValue
                    label="Aktivitas"
                    value={
                        activity?.score === null || activity === null
                            ? '—'
                            : formatNumber(activity.score, 1)
                    }
                    mono
                />
                <ReadingValue
                    label="Baseline IMU"
                    value={
                        activity?.baseline === null || activity === null
                            ? '—'
                            : `${formatNumber(activity.baseline, 3)} g`
                    }
                    mono
                />
                <ReadingValue
                    label="Rasio gerak"
                    value={
                        activity?.ratio === null || activity === null
                            ? '—'
                            : formatNumber(activity.ratio, 2)
                    }
                    mono
                />
            </div>

            <div className="grid gap-2">
                <span className="text-xs text-muted-foreground">Visual</span>
                <div className="flex flex-wrap items-center gap-2">
                    {vision === null ? (
                        <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                        <>
                            <VisionLabelBadge label={vision.label} />
                            <span className="text-sm tabular-nums text-muted-foreground">
                                {formatPercentage(vision.confidence)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                p(PMK) {formatPercentage(vision.p_pmk)}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-2">
                <span className="text-xs text-muted-foreground">Hasil fusion</span>
                <div className="flex flex-wrap items-center gap-2">
                    {risk === null ? (
                        <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                        <>
                            <RiskStatusBadge status={risk.status} />
                            <span className="text-sm tabular-nums text-muted-foreground">
                                skor {formatNumber(risk.score, 1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatTime(risk.recorded_at)}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {activity !== null && !activity.baseline_ready ? (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                    Baseline aktivitas belum stabil. Skor aktivitas sementara
                    memakai nilai default, jadi risiko belum bisa dianggap final.
                </p>
            ) : null}

            {risk !== null && risk.missing.length > 0 ? (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                    Input dianggap netral karena tidak tersedia:{' '}
                    {risk.missing.join(', ')}.
                </p>
            ) : null}

            {risk !== null && risk.reasons.length > 0 ? (
                <ul className="grid gap-1 text-xs text-muted-foreground">
                    {risk.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
