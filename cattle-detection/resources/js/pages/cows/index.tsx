import { Head, router, useForm } from '@inertiajs/react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import CowFormDialog from '@/components/cows/cow-form-dialog';
import CowTable from '@/components/monitoring/cow-table';
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from '@/components/monitoring/data-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { assignBarns, BARNS, type BarnId } from '@/lib/barns';
import { matchesQuery, riskStatusOf } from '@/lib/cow-summary';
import { formatUrl } from '@/lib/utils';
import CowsController from '@/actions/App/Http/Controllers/CowsController';
import { dashboard } from '@/routes';
import { index as cowsIndex } from '@/routes/cows';
import { cowService } from '@/services/cow-service';
import { RISK_STATUSES, type RiskStatusValue } from '@/types/telemetry';

const REFRESH_INTERVAL_MS = 20_000;
const PAGE_SIZE = 10;
const ALL_STATUSES = 'all';

/** Shape the form and the delete dialog both work with. */
type CowActionTarget = { id: number; code: string; name: string };

export default function CowsIndex() {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<RiskStatusValue | typeof ALL_STATUSES>(
        ALL_STATUSES,
    );
    const [barn, setBarn] = useState<BarnId | typeof ALL_STATUSES>(
        ALL_STATUSES,
    );
    const [ascending, setAscending] = useState(true);
    const [page, setPage] = useState(1);

    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: REFRESH_INTERVAL_MS,
        cacheKey: 'cows',
    });

    const deleteForm = useForm({});

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CowActionTarget | undefined>(
        undefined,
    );
    const [deleting, setDeleting] = useState<CowActionTarget | null>(null);

    const visible = useMemo(() => {
        if (cows.data === null) {
            return [];
        }

        const filtered = assignBarns(cows.data).filter(
            (cow) =>
                matchesQuery(cow, query) &&
                (status === ALL_STATUSES || riskStatusOf(cow) === status) &&
                (barn === ALL_STATUSES || cow.barn.id === barn),
        );

        return filtered.sort((a, b) =>
            ascending
                ? a.code.localeCompare(b.code)
                : b.code.localeCompare(a.code),
        );
    }, [cows.data, query, status, barn, ascending]);

    useEffect(() => {
        setPage(1);
    }, [query, status, barn]);

    const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    const paged = visible.slice(start, start + PAGE_SIZE);

    return (
        <>
            <Head title="Daftar Ternak" />

            <div className="space-y-6">
                <Card className="gap-4 py-5">
                    <CardContent className="flex flex-col items-stretch justify-between gap-4 px-5 md:flex-row md:items-center">
                        <div className="relative max-w-md flex-1">
                            <input
                                type="search"
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Cari ID, nama sapi, atau indikasi..."
                                aria-label="Cari sapi"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-10 text-xs text-gray-800 focus:ring-2 focus:ring-brand-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                            />
                            <svg
                                aria-hidden="true"
                                className="absolute top-3 left-3.5 size-4 text-gray-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={status}
                                onValueChange={(value) =>
                                    setStatus(
                                        value as
                                            | RiskStatusValue
                                            | typeof ALL_STATUSES,
                                    )
                                }
                            >
                                <SelectTrigger className="w-44 rounded-xl text-xs">
                                    <SelectValue placeholder="Semua Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>
                                        Semua Status
                                    </SelectItem>
                                    {RISK_STATUSES.map((item) => (
                                        <SelectItem key={item} value={item}>
                                            {item}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={barn}
                                onValueChange={(value) =>
                                    setBarn(
                                        value as BarnId | typeof ALL_STATUSES,
                                    )
                                }
                            >
                                <SelectTrigger className="w-40 rounded-xl text-xs">
                                    <SelectValue placeholder="Semua Kandang" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>
                                        Semua Kandang
                                    </SelectItem>
                                    {BARNS.map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={item.id}
                                        >
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setAscending((value) => !value)}
                                className="gap-1.5 rounded-xl text-xs font-semibold"
                            >
                                <ArrowUpDown className="size-3.5" />
                                Urutan ID: {ascending ? 'ASC' : 'DESC'}
                            </Button>

                            <Button
                                type="button"
                                onClick={() => {
                                    setEditing(undefined);
                                    setFormOpen(true);
                                }}
                                className="gap-2 rounded-xl bg-brand-primary text-xs font-semibold text-white hover:bg-brand-secondary"
                            >
                                <Plus className="size-4" />
                                Tambah sapi
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {cows.error !== null && cows.data === null ? (
                    <ErrorState error={cows.error} onRetry={cows.refresh} />
                ) : null}

                <Card className="overflow-hidden py-0">
                    <CardContent className="p-0">
                        {cows.isLoading && cows.data === null ? (
                            <div className="p-4">
                                <LoadingState rows={5} />
                            </div>
                        ) : visible.length === 0 ? (
                            <div className="p-6">
                                <EmptyState message="Tidak ada sapi yang cocok dengan filter." />
                            </div>
                        ) : (
                            <CowTable
                                cows={paged}
                                onEdit={(cow) => {
                                    setEditing(cow);
                                    setFormOpen(true);
                                }}
                                onDelete={(cow) => setDeleting(cow)}
                            />
                        )}

                        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-900/40">
                            <span>
                                Menampilkan{' '}
                                {visible.length === 0 ? 0 : start + 1}-
                                {Math.min(start + PAGE_SIZE, visible.length)}{' '}
                                dari {visible.length} sapi
                            </span>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1}
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.max(1, value - 1),
                                        )
                                    }
                                    className="gap-1 rounded-lg text-xs"
                                >
                                    <ChevronLeft className="size-3.5" />
                                    Previous
                                </Button>

                                <span className="px-2 font-semibold text-gray-800 dark:text-white">
                                    Halaman {currentPage}
                                </span>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= pageCount}
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.min(pageCount, value + 1),
                                        )
                                    }
                                    className="gap-1 rounded-lg text-xs"
                                >
                                    Next
                                    <ChevronRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <CowFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                cow={editing}
                action={
                    editing
                        ? formatUrl(CowsController.update.form(editing.id))
                        : formatUrl(CowsController.store.form())
                }
                onSuccess={() => {
                    setFormOpen(false);
                    setEditing(undefined);
                    cows.refresh();

                    // Creating a cow redirects to its detail page, so the list
                    // view has to be re-fetched explicitly on the way back.
                    if (!editing) {
                        router.get(cowsIndex(), { preserveScroll: true });
                    }
                }}
            />

            <ConfirmDeleteDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Hapus sapi ${deleting?.code ?? ''}?`}
                description={
                    deleting
                        ? `Seluruh telemetry ${deleting.code} (${deleting.name}) akan ikut terhapus permanen: pembacaan sensor, hasil deteksi vision, dan penilaian risiko. Tindakan ini tidak bisa dibatalkan.`
                        : ''
                }
                confirmLabel="Hapus sapi"
                processing={deleteForm.processing}
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    deleteForm.submit(
                        formatUrl(CowsController.destroy.form(deleting.id)),
                        {
                            onSuccess: () => {
                                setDeleting(null);
                                cows.refresh();
                            },
                        },
                    );
                }}
            />
        </>
    );
}

CowsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Gambaran Umum',
            href: dashboard(),
        },
        {
            title: 'Daftar Ternak',
            href: cowsIndex(),
        },
    ],
};
