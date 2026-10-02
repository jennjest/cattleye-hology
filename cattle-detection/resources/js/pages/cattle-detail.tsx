import { Head, Link } from '@inertiajs/react';
import CattleDetailView from '@/components/cattle/cattle-detail-view';
import { EmptyState } from '@/components/monitoring/data-state';
import { Button } from '@/components/ui/button';
import { index as cowsIndex } from '@/routes/cows';
import { index as detailIndex } from '@/routes/detail';
import type { CowSnapshot } from '@/types/telemetry';

type Props = {
    /** Null when no cow has been registered yet. */
    snapshot: CowSnapshot | null;
    /** Zero-based herd position, used to derive the pen name. */
    ordinal: number;
};

/**
 * `/detail` — the sidebar's "Detail Ternak" entry.
 *
 * The URL carries no cow, so the controller resolves one server-side and passes
 * it down as `snapshot`. Reusing the same component as `/cows/{cow}` keeps both
 * entry points pixel-identical.
 */
export default function CattleDetail({ snapshot, ordinal }: Props) {
    return (
        <>
            <Head title="Detail Ternak" />

            {snapshot === null ? (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-800">
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                            Detail Ternak
                        </h1>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Belum ada sapi yang terdaftar
                        </p>
                    </div>

                    <EmptyState
                        message="Daftarkan sapi terlebih dahulu untuk melihat detail telemetry, prediksi computer vision, dan risk score AI."
                        className="border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                    />

                    <Button
                        asChild
                        className="bg-brand-primary text-white hover:bg-brand-secondary"
                    >
                        <Link href={cowsIndex()}>Tambah sapi</Link>
                    </Button>
                </div>
            ) : (
                <CattleDetailView snapshot={snapshot} ordinal={ordinal} />
            )}
        </>
    );
}

CattleDetail.layout = {
    breadcrumbs: [{ title: 'Detail Ternak', href: detailIndex() }],
};
