import { Head } from '@inertiajs/react';
import { DownloadIcon } from 'lucide-react';
import CattleDetailView from '@/components/cattle/cattle-detail-view';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import {
    exportMethod as exportCowCsv,
    index as cowsIndex,
} from '@/routes/cows';
import type { CowSnapshot } from '@/types/telemetry';

type Props = {
    /** Server-rendered snapshot so the first paint is never empty. */
    snapshot: CowSnapshot;
    /** Position in the code-ordered herd, so the header can name the pen. */
    ordinal: number;
};

/**
 * `/cows/{cow}` — same layout as `/detail`, plus the CSV export the mockup's
 * "Ekspor" button sits next to.
 */
export default function CowShow({ snapshot, ordinal }: Props) {
    return (
        <>
            <Head title={`Sapi ${snapshot.cow.code}`} />

            <CattleDetailView
                snapshot={snapshot}
                ordinal={ordinal}
                headerActions={
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl border-gray-200 text-xs font-semibold"
                        // Plain anchor so the browser follows the file download
                        // instead of an Inertia visit.
                        asChild
                    >
                        <a
                            href={exportCowCsv.url({ cow: snapshot.cow.id })}
                            download
                        >
                            <DownloadIcon className="size-4" />
                            Ekspor CSV
                        </a>
                    </Button>
                }
            />
        </>
    );
}

CowShow.layout = {
    breadcrumbs: [
        { title: 'Gambaran Umum', href: dashboard() },
        { title: 'Daftar Ternak', href: cowsIndex() },
    ],
};
