import { Link } from '@inertiajs/react';
import { ClockAlertIcon } from 'lucide-react';
import ReadingValue from '@/components/monitoring/reading-value';
import RiskStatusBadge from '@/components/monitoring/risk-status-badge';
import VisionLabelBadge from '@/components/monitoring/vision-label-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { NO_DATA_STATUS, latestRecordedAt } from '@/types/telemetry';
import { show as cowShowRoute } from '@/routes/cows';
import {
    formatNumber,
    formatPercentage,
    formatRelativeTime,
    NOT_AVAILABLE,
} from '@/lib/format';
import type { CowLatestTelemetry } from '@/types/telemetry';

type Props = {
    cow: { id: number; code: string; name: string };
    latest: CowLatestTelemetry;
    isStale: boolean;
    isLoading?: boolean;
};

/** One live cow tile for the monitoring grid. */
export default function CowCard({ cow, latest, isStale, isLoading }: Props) {
    const { sensor_reading, vision_prediction, risk_assessment } = latest;
    const status = risk_assessment?.status ?? NO_DATA_STATUS;
    const updatedAt = latestRecordedAt(latest);

    return (
        <Card className="gap-4 py-4">
            <CardHeader className="flex-row items-start justify-between gap-2 px-4">
                <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-base">
                        <Link
                            href={cowShowRoute(cow.id)}
                            className="hover:underline"
                        >
                            {cow.code}
                        </Link>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                        {cow.name}
                    </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <RiskStatusBadge status={status} />
                    {isStale ? (
                        <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                        >
                            <ClockAlertIcon className="size-3" />
                            Data basi
                        </Badge>
                    ) : null}
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 px-4">
                <div className="flex items-end justify-between gap-2">
                    {isLoading ? (
                        <Skeleton className="h-9 w-20" />
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                                Risk score
                            </span>
                            <span className="text-3xl leading-none font-semibold tabular-nums">
                                {risk_assessment === null
                                    ? NOT_AVAILABLE
                                    : formatNumber(risk_assessment.score)}
                            </span>
                        </div>
                    )}
                    {vision_prediction === null ? (
                        <span className="text-xs text-muted-foreground">
                            Vision {NOT_AVAILABLE}
                        </span>
                    ) : (
                        <VisionLabelBadge
                            label={vision_prediction.label}
                            confidence={vision_prediction.confidence}
                        />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <ReadingValue
                        label="Suhu"
                        value={
                            sensor_reading === null
                                ? NOT_AVAILABLE
                                : `${formatNumber(sensor_reading.temperature)} °C`
                        }
                    />
                    <ReadingValue
                        label="Akselerometer"
                        value={
                            sensor_reading === null
                                ? NOT_AVAILABLE
                                : formatNumber(sensor_reading.ax, 2)
                        }
                        mono
                    />
                    <ReadingValue
                        label="Giroskop"
                        value={
                            sensor_reading === null
                                ? NOT_AVAILABLE
                                : formatNumber(sensor_reading.gz, 2)
                        }
                        mono
                    />
                    <ReadingValue
                        label="Confidence"
                        value={formatPercentage(vision_prediction?.confidence)}
                    />
                </div>

                <p className="text-xs text-muted-foreground">
                    Pembaruan terakhir:{' '}
                    {updatedAt === null
                        ? 'belum pernah'
                        : formatRelativeTime(updatedAt)}
                </p>
            </CardContent>
        </Card>
    );
}
