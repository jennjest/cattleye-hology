import {
    NO_DATA_STATUS,
    type CowSummary,
    type RiskStatusValue,
} from '@/types/telemetry';

/**
 * Aggregation helpers for the cow list.
 *
 * These stay as pure functions instead of hooks so the same logic can be reused
 * by the dashboard, the cow list and the monitoring grid without duplicating
 * the rules for "which cows need attention".
 */

export type CowCounts = Record<RiskStatusValue, number>;

/**
 * A cow without a risk assessment is treated as "Tidak Ada Data" so the
 * dashboard never counts a silent device as healthy.
 */
export function riskStatusOf(cow: CowSummary): RiskStatusValue {
    return cow.latest.risk_assessment?.status ?? NO_DATA_STATUS;
}

export function countByRiskStatus(cows: CowSummary[]): CowCounts {
    const counts: CowCounts = {
        Normal: 0,
        Waspada: 0,
        'Berisiko Tinggi': 0,
        'Tidak Ada Data': 0,
    };

    for (const cow of cows) {
        counts[riskStatusOf(cow)] += 1;
    }

    return counts;
}

/** Only the red tier, for the notification bell and the alert timeline. */
export function needsAttention(cow: CowSummary): boolean {
    return riskStatusOf(cow) === 'Berisiko Tinggi';
}

/** Highest score first, then lowest risk rank, then cow code. */
const rank: Record<RiskStatusValue, number> = {
    'Berisiko Tinggi': 0,
    Waspada: 1,
    Normal: 2,
    'Tidak Ada Data': 3,
};

export function sortByAttention(cows: CowSummary[]): CowSummary[] {
    return [...cows].sort((a, b) => {
        const byStatus = rank[riskStatusOf(a)] - rank[riskStatusOf(b)];

        if (byStatus !== 0) {
            return byStatus;
        }

        const byScore =
            (b.latest.risk_assessment?.score ?? -1) -
            (a.latest.risk_assessment?.score ?? -1);

        if (byScore !== 0) {
            return byScore;
        }

        return a.code.localeCompare(b.code);
    });
}

export function matchesQuery(cow: CowSummary, query: string): boolean {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
        return true;
    }

    return (
        cow.code.toLowerCase().includes(needle) ||
        cow.name.toLowerCase().includes(needle)
    );
}
