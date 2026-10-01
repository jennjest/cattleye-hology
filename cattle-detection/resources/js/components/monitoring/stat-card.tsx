import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

const tones: Record<StatTone, string> = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-destructive',
    muted: 'text-muted-foreground',
};

const iconTones: Record<StatTone, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/15 text-destructive',
    muted: 'bg-muted text-muted-foreground',
};

type Props = {
    label: string;
    value: string;
    hint?: string;
    icon?: LucideIcon;
    tone?: StatTone;
    isLoading?: boolean;
};

/** KPI tile for the dashboard summary row. */
export default function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'default',
    isLoading = false,
}: Props) {
    return (
        <Card className="gap-4 py-4">
            <CardHeader className="flex-row items-center justify-between gap-2 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                </CardTitle>
                {Icon ? (
                    <span
                        aria-hidden="true"
                        className={cn(
                            'flex size-8 items-center justify-center rounded-md',
                            iconTones[tone],
                        )}
                    >
                        <Icon className="size-4" />
                    </span>
                ) : null}
            </CardHeader>
            <CardContent className="px-4">
                {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <p
                        className={cn(
                            'text-2xl leading-none font-semibold tabular-nums',
                            tones[tone],
                        )}
                    >
                        {value}
                    </p>
                )}
                {hint ? (
                    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                ) : null}
            </CardContent>
        </Card>
    );
}
