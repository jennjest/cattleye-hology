/**
 * Display formatting for telemetry values.
 *
 * Every helper renders missing data as an em dash instead of zero, so an
 * absent reading is never mistaken for a real measurement.
 */

export const NOT_AVAILABLE = '—';

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' });

const shortDateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

function toDate(value: string | Date | null | undefined): Date | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | Date | null | undefined): string {
    const date = toDate(value);

    return date === null ? NOT_AVAILABLE : dateTimeFormatter.format(date);
}

export function formatShortDateTime(
    value: string | Date | null | undefined,
): string {
    const date = toDate(value);

    return date === null ? NOT_AVAILABLE : shortDateTimeFormatter.format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
    const date = toDate(value);

    return date === null ? NOT_AVAILABLE : timeFormatter.format(date);
}

export function formatNumber(
    value: number | null | undefined,
    fractionDigits = 1,
): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return NOT_AVAILABLE;
    }

    return value.toLocaleString('id-ID', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
}

export function formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return NOT_AVAILABLE;
    }

    return `${(value * 100).toFixed(1).replace('.', ',')}%`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
];

/** "baru saja", "5 menit lalu", "3 hari lalu". */
export function formatRelativeTime(
    value: string | Date | null | undefined,
    now: Date = new Date(),
): string {
    const date = toDate(value);

    if (date === null) {
        return NOT_AVAILABLE;
    }

    let seconds = Math.round((date.getTime() - now.getTime()) / 1000);

    if (Math.abs(seconds) < 10) {
        return 'baru saja';
    }

    const formatter = new Intl.RelativeTimeFormat('id-ID', {
        numeric: 'auto',
    });

    for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) < size) {
            return formatter.format(Math.round(seconds / 1), unit);
        }

        seconds = seconds / size;
    }

    return formatter.format(Math.round(seconds / 1), 'week');
}
