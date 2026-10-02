type Bar = {
    label: string;
    value: number;
    color?: string;
};

type Props = {
    bars: Bar[];
    description: string;
    /** Suffix appended to the value on top of each bar, e.g. " ekor". */
    unit?: string;
    height?: number;
    className?: string;
};

/**
 * Vertical bars for the per-pen distribution on the Analitik page.
 *
 * Values are scaled against the tallest bar, so an empty dataset still renders
 * a baseline instead of dividing by zero.
 */
export default function BarChart({
    bars,
    description,
    unit = '',
    height = 220,
    className,
}: Props) {
    const max = Math.max(...bars.map((bar) => bar.value), 0);
    const plotHeight = height - 34;
    const slot = 640 / Math.max(bars.length, 1);
    const barWidth = Math.min(slot * 0.45, 56);

    return (
        <svg
            viewBox={`0 0 640 ${height}`}
            role="img"
            aria-label={description}
            className={`h-auto w-full ${className ?? ''}`}
        >
            <title>{description}</title>

            {[0, 0.5, 1].map((ratio) => {
                const y = 8 + plotHeight * (1 - ratio);

                return (
                    <g key={ratio}>
                        <line
                            x1={16}
                            x2={624}
                            y1={y}
                            y2={y}
                            strokeDasharray="4 4"
                            className="stroke-border"
                        />
                        <text
                            x={624}
                            y={y - 4}
                            textAnchor="end"
                            className="fill-muted-foreground text-[10px]"
                        >
                            {Math.round(max * ratio)}
                        </text>
                    </g>
                );
            })}

            {bars.map((bar, index) => {
                const barHeight =
                    max === 0 ? 0 : (bar.value / max) * (plotHeight - 16);
                const x = 16 + slot * index + (slot - barWidth) / 2;
                const y = 8 + plotHeight - barHeight;

                return (
                    <g key={bar.label}>
                        <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx={4}
                            className={bar.color ?? 'fill-brand-primary'}
                        />
                        <text
                            x={x + barWidth / 2}
                            y={y - 6}
                            textAnchor="middle"
                            className="fill-muted-foreground text-[10px]"
                        >
                            {bar.value}
                            {unit}
                        </text>
                        <text
                            x={x + barWidth / 2}
                            y={height - 12}
                            textAnchor="middle"
                            className="fill-muted-foreground text-[10px]"
                        >
                            {bar.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
