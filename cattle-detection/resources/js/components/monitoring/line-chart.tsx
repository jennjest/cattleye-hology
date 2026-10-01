import { EmptyState } from '@/components/monitoring/data-state';
import { formatShortDateTime, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export type ChartPoint = {
    recordedAt: string;
    value: number | null;
};

export type ReferenceLine = {
    value: number;
    label: string;
};

type Props = {
    points: ChartPoint[];
    /** Used as the accessible name of the chart. */
    description: string;
    height?: number;
    unit?: string;
    formatValue?: (value: number) => string;
    referenceLines?: ReferenceLine[];
    /** Pins the y-axis, e.g. a risk score is always between 0 and 100. */
    domain?: { min: number; max: number };
    strokeClassName?: string;
    emptyMessage?: string;
    className?: string;
};

const WIDTH = 640;
const PADDING = { top: 14, right: 14, bottom: 26, left: 46 };

/**
 * Dependency-free single-series line chart.
 *
 * The project intentionally ships no charting dependency, so charts are drawn
 * as plain SVG. A missing reading breaks the line instead of being
 * interpolated, because an absent sensor value must not look like a
 * measurement.
 */
export default function LineChart({
    points,
    description,
    height = 220,
    unit,
    formatValue = (value) => value.toFixed(1),
    referenceLines = [],
    domain,
    strokeClassName = 'stroke-primary',
    emptyMessage = 'Belum ada pembacaan pada rentang waktu ini.',
    className,
}: Props) {
    const samples = points
        .map((point) => ({ time: Date.parse(point.recordedAt), value: point.value }))
        .filter((sample) => Number.isFinite(sample.time));

    const measured = samples.filter(
        (sample): sample is { time: number; value: number } => sample.value !== null,
    );

    if (measured.length === 0) {
        return <EmptyState message={emptyMessage} className={className} />;
    }

    const times = samples.map((sample) => sample.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const isPinned = domain !== undefined;
    const referenceValues = referenceLines.map((line) => line.value);
    const rawMin = isPinned
        ? Math.min(domain.min, ...referenceValues)
        : Math.min(...measured.map((sample) => sample.value));
    const rawMax = isPinned
        ? Math.max(domain.max, ...referenceValues)
        : Math.max(...measured.map((sample) => sample.value));
    const headroom = isPinned ? 0 : Math.max((rawMax - rawMin) * 0.15, 1);
    const minValue = rawMin - headroom;
    const maxValue = rawMax + headroom;
    const span = maxValue - minValue || 1;

    const innerWidth = WIDTH - PADDING.left - PADDING.right;
    const innerHeight = height - PADDING.top - PADDING.bottom;

    const xFor = (time: number): number => {
        if (maxTime === minTime) {
            return PADDING.left + innerWidth / 2;
        }

        return PADDING.left + ((time - minTime) / (maxTime - minTime)) * innerWidth;
    };

    const yFor = (value: number): number =>
        PADDING.top + innerHeight - ((value - minValue) / span) * innerHeight;

    // Consecutive measured samples form one polyline; a null reading breaks it.
    const segments: string[] = [];
    let current: string[] = [];

    for (const sample of samples) {
        if (sample.value === null) {
            if (current.length > 0) {
                segments.push(current.join(' '));
                current = [];
            }

            continue;
        }

        current.push(
            `${xFor(sample.time).toFixed(2)},${yFor(sample.value).toFixed(2)}`,
        );
    }

    if (current.length > 0) {
        segments.push(current.join(' '));
    }

    const last = measured[measured.length - 1];
    const gridValues = [maxValue, minValue + span / 2, minValue];

    return (
        <figure className={cn('flex flex-col gap-2', className)}>
            <svg
                viewBox={`0 0 ${WIDTH} ${height}`}
                role="img"
                aria-label={description}
                className="h-auto w-full overflow-visible"
            >
                {gridValues.map((value) => (
                    <g key={formatValue(value)}>
                        <line
                            x1={PADDING.left}
                            x2={WIDTH - PADDING.right}
                            y1={yFor(value)}
                            y2={yFor(value)}
                            className="stroke-border"
                            strokeDasharray="4 4"
                        />
                        <text
                            x={PADDING.left - 8}
                            y={yFor(value) + 4}
                            textAnchor="end"
                            className="fill-muted-foreground text-[10px]"
                        >
                            {formatValue(value)}
                        </text>
                    </g>
                ))}

                {referenceLines.map((line) => (
                    <g key={line.label}>
                        <line
                            x1={PADDING.left}
                            x2={WIDTH - PADDING.right}
                            y1={yFor(line.value)}
                            y2={yFor(line.value)}
                            className="stroke-destructive/60"
                        />
                        <text
                            x={WIDTH - PADDING.right}
                            y={yFor(line.value) - 4}
                            textAnchor="end"
                            className="fill-destructive text-[10px]"
                        >
                            {line.label}
                        </text>
                    </g>
                ))}

                {segments.map((segment, index) => (
                    <polyline
                        key={`${segment.length}-${index}`}
                        points={segment}
                        fill="none"
                        className={cn('stroke-2', strokeClassName)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}

                <circle
                    cx={xFor(last.time)}
                    cy={yFor(last.value)}
                    r={3.5}
                    className="fill-primary"
                />

                <text
                    x={PADDING.left}
                    y={height - 8}
                    className="fill-muted-foreground text-[10px]"
                >
                    {formatShortDateTime(new Date(minTime))}
                </text>
                <text
                    x={WIDTH - PADDING.right}
                    y={height - 8}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px]"
                >
                    {formatShortDateTime(new Date(maxTime))}
                </text>
            </svg>

            <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                    {measured.length} titik data{unit ? ` · ${unit}` : ''}
                </span>
                <span>Terakhir: {formatTime(new Date(last.time))}</span>
            </figcaption>
        </figure>
    );
}
