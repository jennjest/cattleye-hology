import { Badge } from '@/components/ui/badge';
import type { VisionLabelValue } from '@/types/telemetry';

/** Visual treatment per computer-vision label produced by the Pi. */
const styles: Record<VisionLabelValue, string> = {
    Normal:
        'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    PMK: 'border-destructive/40 bg-destructive/15 text-destructive',
    Unknown: 'border-border bg-muted text-muted-foreground',
};

type Props = {
    label: VisionLabelValue;
    confidence?: number | null;
    className?: string;
};

export default function VisionLabelBadge({
    label,
    confidence,
    className,
}: Props) {
    return (
        <Badge className={`gap-1.5 ${styles[label]} ${className ?? ''}`}>
            {label}
            {typeof confidence === 'number' ? (
                <span className="font-mono text-[10px] opacity-80">
                    {(confidence * 100).toFixed(0)}%
                </span>
            ) : null}
        </Badge>
    );
}
