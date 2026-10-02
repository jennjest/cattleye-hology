import { cn } from '@/lib/utils';
import type { RiskStatusValue } from '@/types/telemetry';

/**
 * Visual treatment per risk status, copied from "Desain Dashboard.html".
 *
 * `filled` is the pill used on tables and the map panel, `strong` the larger
 * one on the cow detail header.
 */
const styles: Record<
    RiskStatusValue,
    { pill: string; dot: string; bar: string; text: string }
> = {
    Normal: {
        pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        bar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    Waspada: {
        pill: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        dot: 'bg-amber-500',
        bar: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
    },
    'Berisiko Tinggi': {
        pill: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
        dot: 'bg-red-500',
        bar: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
    },
    'Tidak Ada Data': {
        pill: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300',
        dot: 'bg-gray-400',
        bar: 'bg-gray-300',
        text: 'text-gray-500 dark:text-gray-400',
    },
};

export function riskPillClassName(
    status: RiskStatusValue,
    size: 'sm' | 'md' = 'sm',
): string {
    return cn(
        'inline-flex items-center rounded-full font-bold',
        size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-0.5 text-xs',
        styles[status].pill,
    );
}

export function riskDotClassName(status: RiskStatusValue): string {
    return styles[status].dot;
}

export function riskBarClassName(status: RiskStatusValue): string {
    return styles[status].bar;
}

export function riskTextClassName(status: RiskStatusValue): string {
    return styles[status].text;
}

type Props = {
    status: RiskStatusValue;
    size?: 'sm' | 'md';
    /** Renders a leading status dot, as the detail header does. */
    withDot?: boolean;
    className?: string;
};

/** Status pill used across the map, the table and the detail header. */
export default function RiskStatusPill({
    status,
    size = 'sm',
    withDot = false,
    className,
}: Props) {
    return (
        <span className={cn(riskPillClassName(status, size), className)}>
            {withDot ? (
                <span
                    aria-hidden="true"
                    className={cn(
                        'mr-1.5 size-2 rounded-full',
                        styles[status].dot,
                    )}
                />
            ) : null}
            {status}
        </span>
    );
}
