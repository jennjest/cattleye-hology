import { cn } from '@/lib/utils';

type Props = {
    label: string;
    value: string;
    mono?: boolean;
    className?: string;
};

/** Small label/value pair used inside telemetry cards. */
export default function ReadingValue({
    label,
    value,
    mono = false,
    className,
}: Props) {
    return (
        <div className={cn('flex flex-col gap-0.5', className)}>
            <span className="text-xs text-muted-foreground">{label}</span>
            <span
                className={cn(
                    'text-sm font-medium tabular-nums',
                    value === '—' && 'text-muted-foreground',
                    mono && 'font-mono',
                )}
            >
                {value}
            </span>
        </div>
    );
}
