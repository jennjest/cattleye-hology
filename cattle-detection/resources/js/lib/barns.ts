import type { CowSummary } from '@/types/telemetry';

/**
 * Pen ("kandang") layout for the map and table views.
 *
 * The schema has no pen column, so a cow's pen is derived from its position in
 * the (code-ordered) herd list, six head per pen. The mapping is therefore
 * stable across reloads but is *not* stored: moving a cow between pens is a
 * future schema change, not something the UI pretends to persist.
 */

export type BarnId = 'A' | 'B' | 'C' | 'D';

export type Barn = {
    id: BarnId;
    name: string;
    /** Full label, e.g. "Kandang A (Perah)". */
    label: string;
    /** What the pen is used for, shown under the title. */
    purpose: string;
};

export const COWS_PER_BARN = 6;

export const BARNS: Barn[] = [
    {
        id: 'A',
        name: 'Kandang A',
        label: 'Kandang A (Perah)',
        purpose: 'Produksi susu',
    },
    {
        id: 'B',
        name: 'Kandang B',
        label: 'Kandang B (Penggemukan)',
        purpose: 'Penggemukan',
    },
    {
        id: 'C',
        name: 'Kandang C',
        label: 'Kandang C (Pembibitan)',
        purpose: 'Pembibitan',
    },
    {
        id: 'D',
        name: 'Kandang D',
        label: 'Kandang D (Isolasi & Medis)',
        purpose: 'Isolasi & medis',
    },
];

export type BarnAssignment = {
    barn: Barn;
    /** Position of the cow inside the whole herd, starting at 1. */
    ordinal: number;
};

/** Pen of a cow that sits at `index` of the code-ordered herd list. */
export function barnOfIndex(index: number): Barn {
    const position = Math.max(0, Math.floor(index / COWS_PER_BARN));

    return BARNS[Math.min(position, BARNS.length - 1)];
}

export function assignmentOfIndex(index: number): BarnAssignment {
    return { barn: barnOfIndex(index), ordinal: index + 1 };
}

/** Every cow with the pen it was derived into, keeping the herd order. */
export function assignBarns(
    cows: CowSummary[],
): (CowSummary & BarnAssignment)[] {
    return cows.map((cow, index) => ({ ...cow, ...assignmentOfIndex(index) }));
}

export function cowsInBarn(
    cows: (CowSummary & BarnAssignment)[],
    barnId: BarnId,
): (CowSummary & BarnAssignment)[] {
    return cows.filter((cow) => cow.barn.id === barnId);
}

/** "Sapi #001 - #006" style caption for a pen header. */
export function barnRangeLabel(cows: (CowSummary & BarnAssignment)[]): string {
    if (cows.length === 0) {
        return 'Belum ada sapi';
    }

    const first = Math.min(...cows.map((cow) => cow.ordinal));
    const last = Math.max(...cows.map((cow) => cow.ordinal));

    return `Sapi #${String(first).padStart(3, '0')} - #${String(last).padStart(3, '0')}`;
}
