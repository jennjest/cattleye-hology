import { Head, router, useForm } from "@inertiajs/react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDeleteDialog from "@/components/confirm-delete-dialog";
import CowFormDialog from "@/components/cows/cow-form-dialog";
import Heading from "@/components/heading";
import CowTable from "@/components/monitoring/cow-table";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/components/monitoring/data-state";
import RefreshControls from "@/components/monitoring/refresh-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePollingResource } from "@/hooks/use-polling-resource";
import {
    countByRiskStatus,
    matchesQuery,
    sortByAttention,
} from "@/lib/cow-summary";
import { formatUrl } from '@/lib/utils';
import { cowService } from "@/services/cow-service";
import CowsController from "@/actions/App/Http/Controllers/CowsController";
import { dashboard } from "@/routes";
import { index as cowsIndex } from "@/routes/cows";
import { RISK_STATUSES, type RiskStatusValue } from "@/types/telemetry";

const REFRESH_INTERVAL_MS = 20_000;
const ALL_STATUSES = "all";

/** Shape the form and the delete dialog both work with. */
type CowActionTarget = { id: number; code: string; name: string };

export default function CowsIndex() {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<RiskStatusValue | typeof ALL_STATUSES>(
        ALL_STATUSES,
    );

    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: REFRESH_INTERVAL_MS,
        cacheKey: "cows",
    });

    const deleteForm = useForm({});

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CowActionTarget | undefined>(
        undefined,
    );
    const [deleting, setDeleting] = useState<CowActionTarget | null>(null);

    const counts = cows.data === null ? null : countByRiskStatus(cows.data);

    const visible = useMemo(() => {
        if (cows.data === null) {
            return [];
        }

        return sortByAttention(
            cows.data.filter(
                (cow) =>
                    matchesQuery(cow, query) &&
                    (status === ALL_STATUSES ||
                        (cow.latest.risk_assessment?.status ??
                            "Tidak Ada Data") === status),
            ),
        );
    }, [cows.data, query, status]);

    return (
        <>
            <Head title="Cows" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <Heading
                        title="Cows"
                        description="Daftar seluruh sapi yang dimonitor oleh CATTLEYE beserta telemetry terbaru."
                        className="mb-0"
                    />
                    <div className="flex items-center gap-2">
                        <RefreshControls
                            updatedAt={cows.updatedAt}
                            isRefreshing={cows.isRefreshing}
                            onRefresh={cows.refresh}
                        />
                        <Button
                            onClick={() => {
                                setEditing(undefined);
                                setFormOpen(true);
                            }}
                        >
                            <PlusIcon />
                            Tambah sapi
                        </Button>
                    </div>
                </div>

                {cows.error !== null && cows.data === null ? (
                    <ErrorState error={cows.error} onRetry={cows.refresh} />
                ) : null}

                <Card className="gap-4 py-4">
                    <CardHeader className="flex-row items-center gap-2 px-4">
                        <SearchIcon className="size-4 text-muted-foreground" />
                        <Label htmlFor="cow-search" className="sr-only">
                            Cari sapi
                        </Label>
                        <Input
                            id="cow-search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cari berdasarkan kode atau nama sapi"
                            className="max-w-sm"
                        />
                        <Select
                            value={status}
                            onValueChange={(value) =>
                                setStatus(
                                    value as
                                        RiskStatusValue | typeof ALL_STATUSES,
                                )
                            }
                        >
                            <SelectTrigger className="w-52">
                                <SelectValue placeholder="Semua status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_STATUSES}>
                                    Semua status
                                </SelectItem>
                                {RISK_STATUSES.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item}
                                        {counts === null
                                            ? ""
                                            : ` (${counts[item]})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>

                    <CardContent className="px-4">
                        {cows.isLoading && cows.data === null ? (
                            <LoadingState rows={4} />
                        ) : visible.length === 0 ? (
                            <EmptyState message="Tidak ada sapi yang cocok dengan filter." />
                        ) : (
                            <CowTable
                                cows={visible}
                                caption={`Menampilkan ${visible.length} dari ${cows.data?.length ?? 0} sapi.`}
                                onEdit={(cow) => {
                                    setEditing(cow);
                                    setFormOpen(true);
                                }}
                                onDelete={(cow) => setDeleting(cow)}
                            />
                        )}
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
                title={`Hapus sapi ${deleting?.code ?? ""}?`}
                description={
                    deleting
                        ? `Seluruh telemetry ${deleting.code} (${deleting.name}) akan ikut terhapus permanen: pembacaan sensor, hasil deteksi vision, dan penilaian risiko. Tindakan ini tidak bisa dibatalkan.`
                        : ""
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
            title: "Dashboard",
            href: dashboard(),
        },
        {
            title: "Cows",
            href: cowsIndex(),
        },
    ],
};
