import { Badge } from '@/components/ui/badge';
import type { RiskStatusValue } from '@/types/telemetry';

/**
 * Single place that maps a risk status to its visual treatment, so the
 * dashboard, the monitoring grid and the history charts never disagree about
 * what "Waspada" looks like.
 */
const styles: Record<
    RiskStatusValue,
    { className: string; dotClassName: string }
> = {
    Normal: {
        className:
            'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        dotClassName: 'bg-emerald-500',
    },
    Waspada: {
        className:
            'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
        dotClassName: 'bg-amber-500',
    },
    'Berisiko Tinggi': {
        className:
            'border-destructive/40 bg-destructive/15 text-destructive dark:text-destructive-foreground',
        dotClassName: 'bg-destructive',
    },
    'Tidak Ada Data': {
        className:
            'border-border bg-muted text-muted-foreground dark:text-muted-foreground',
        dotClassName: 'bg-muted-foreground/50',
    },
};

export function riskStatusClassName(status: RiskStatusValue): string {
    return styles[status].className;
}

type Props = {
    status: RiskStatusValue;
    className?: string;
};

export default function RiskStatusBadge({ status, className }: Props) {
    return (
        <Badge className={`gap-1.5 ${styles[status].className} ${className ?? ''}`}>
            <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${styles[status].dotClassName}`}
            />
            {status}
        </Badge>
    );
}
