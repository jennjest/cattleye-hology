import { formatNumber, NOT_AVAILABLE } from '@/lib/format';

export type HeatmapCell = {
    /** Column header (hour bucket). */
    column: string;
    /** Row header (period label). */
    row: string;
    /** 0-1 intensity. `null` means "no reading", which renders as empty. */
    intensity: number | null;
    value?: number | null;
};

type Props = {
    cells: HeatmapCell[];
    description: string;
    className?: string;
};

/**
 * Activity heatmap of the Analitik page.
 *
 * Built from divs rather than SVG so a hover tooltip comes for free, and so the
 * grid stays responsive without recomputing a viewBox.
 */
export default function Heatmap({ cells, description, className }: Props) {
    const columns = [...new Set(cells.map((cell) => cell.column))];
    const rows = [...new Set(cells.map((cell) => cell.row))];

    const intensityClass = (intensity: number | null): string => {
        if (intensity === null) {
            return 'bg-gray-100 dark:bg-slate-800';
        }

        if (intensity > 0.66) {
            return 'bg-brand-primary';
        }

        if (intensity > 0.33) {
            return 'bg-brand-light';
        }

        return 'bg-brand-soft';
    };

    return (
        <div className={className}>
            <div
                role="img"
                aria-label={description}
                className="flex flex-col gap-1"
            >
                {rows.map((row) => (
                    <div key={row} className="flex items-center gap-1">
                        <span className="w-16 shrink-0 text-[10px] text-gray-400">
                            {row}
                        </span>

                        {columns.map((column) => {
                            const cell = cells.find(
                                (item) =>
                                    item.row === row && item.column === column,
                            );
                            const intensity = cell?.intensity ?? null;

                            return (
                                <span
                                    key={`${row}-${column}`}
                                    title={
                                        intensity === null
                                            ? `${row} ${column}: ${NOT_AVAILABLE}`
                                            : `${row} ${column}: ${formatNumber(
                                                  cell?.value ?? null,
                                                  0,
                                              )}`
                                    }
                                    className={`h-6 flex-1 rounded-sm ${intensityClass(
                                        intensity,
                                    )}`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center gap-1 pl-16 text-[10px] text-gray-400">
                <span>Lembut</span>
                <span className="h-3 flex-1 rounded-sm bg-brand-soft" />
                <span className="h-3 flex-1 rounded-sm bg-brand-light" />
                <span className="h-3 flex-1 rounded-sm bg-brand-primary" />
                <span>Aktif</span>
            </div>
        </div>
    );
}
