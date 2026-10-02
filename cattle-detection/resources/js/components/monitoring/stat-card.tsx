import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

/** Icon tile + value colours, taken from the four KPI cards of the mockup. */
const tones: Record<StatTone, { value: string; icon: string }> = {
    default: {
        value: 'text-gray-800 dark:text-white',
        icon: 'bg-brand-soft/60 text-brand-primary dark:bg-emerald-950/50 dark:text-brand-accent',
    },
    success: {
        value: 'text-emerald-600 dark:text-emerald-400',
        icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    warning: {
        value: 'text-amber-500',
        icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    },
    danger: {
        value: 'text-red-600 dark:text-red-400',
        icon: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    },
    muted: {
        value: 'text-gray-400 dark:text-gray-500',
        icon: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
    },
};

type Props = {
    label: string;
    value: string;
    /** Small note under the value, e.g. "75% dari total populasi". */
    hint?: React.ReactNode;
    icon: LucideIcon;
    tone?: StatTone;
    isLoading?: boolean;
    className?: string;
};

/** KPI tile of the Ikhtisar summary row. */
export default function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'default',
    isLoading = false,
    className,
}: Props) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition-all hover:shadow-soft-lg dark:border-slate-700/60 dark:bg-slate-800',
                className,
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {label}
                    </p>
                    {isLoading ? (
                        <Skeleton className="mt-2 h-9 w-16" />
                    ) : (
                        <h3
                            className={cn(
                                'mt-2 text-3xl font-bold tabular-nums',
                                tones[tone].value,
                            )}
                        >
                            {value}
                        </h3>
                    )}
                </div>

                <span
                    aria-hidden="true"
                    className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-xl',
                        tones[tone].icon,
                    )}
                >
                    <Icon className="size-6" />
                </span>
            </div>

            {hint ? (
                <div className="mt-3 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {hint}
                </div>
            ) : null}
        </div>
    );
}
