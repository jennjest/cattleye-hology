import { FormEvent, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { needsAttention, sortByAttention } from '@/lib/cow-summary';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import { cameraService } from '@/services/camera-service';
import { cowService } from '@/services/cow-service';
import { index as cowsIndex } from '@/routes/cows';
import { latestRecordedAt, type CowSummary } from '@/types/telemetry';
import type { BreadcrumbItem } from '@/types';

const EDGE_INTERVAL_MS = 15_000;
const COWS_INTERVAL_MS = 30_000;

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

/**
 * Top bar of the main column, matching the `<header>` of
 * "Desain Dashboard.html": page title and gateway status on the left, quick
 * search, AI re-scan and the alert bell on the right.
 */
export function AppTopbar({ breadcrumbs = [] }: Props) {
    const { auth } = usePage().props;
    const [query, setQuery] = useState('');

    const title = breadcrumbs.at(-1)?.title ?? 'CATTLEYE';

    // Reachability of the Raspberry Pi, which is what "IoT Gateway Online" means.
    const edge = usePollingResource((signal) => cameraService.status(signal), {
        intervalMs: EDGE_INTERVAL_MS,
        cacheKey: 'edge-camera',
    });

    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: COWS_INTERVAL_MS,
        cacheKey: 'cows',
    });

    const alerts: CowSummary[] =
        cows.data === null
            ? []
            : sortByAttention(cows.data).filter(needsAttention).slice(0, 5);

    const isOnline = edge.data?.reachable === true;

    const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        router.get(cowsIndex(), { q: query.trim() }, { preserveState: true });
    };

    const rescan = async (): Promise<void> => {
        edge.refresh();
        cows.refresh();

        try {
            const status = await cameraService.status();
            const risk = status.state.risk;

            if (!status.reachable) {
                toast.error('Raspberry Pi tidak dapat dihubungi.');

                return;
            }

            toast.success(
                risk === null
                    ? 'Analisis AI selesai. Belum ada penilaian risiko dari Pi.'
                    : `Analisis AI: skor ${formatNumber(risk.score, 0)} · ${risk.status}.`,
            );
        } catch {
            toast.error('Gagal menjalankan analisis AI.');
        }
    };

    return (
        <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md transition-colors duration-300 md:px-6 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1 lg:hidden" />

                <h2 className="truncate text-base font-bold tracking-tight text-gray-800 dark:text-white">
                    {title}
                </h2>

                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 sm:flex dark:bg-emerald-950/80 dark:text-emerald-300">
                    <span
                        className={`size-2 animate-pulse rounded-full ${
                            isOnline ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                    />
                    {isOnline ? 'IoT Gateway Online' : 'IoT Gateway Offline'}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <form
                    onSubmit={submitSearch}
                    className="relative hidden sm:block"
                >
                    <Search className="absolute top-2.5 left-3 size-4 text-gray-400" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari Sapi (ID / Nama)..."
                        aria-label="Cari sapi"
                        className="w-56 rounded-xl bg-gray-100 py-2 pr-3 pl-9 text-xs text-gray-700 focus:ring-2 focus:ring-brand-primary focus:outline-none dark:bg-slate-800 dark:text-gray-200"
                    />
                </form>

                <Button
                    type="button"
                    onClick={rescan}
                    className="gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-3.5 py-2 text-xs font-semibold shadow-md transition-all hover:opacity-95 active:scale-95"
                >
                    <Sparkles className="size-3.5 text-brand-accent" />
                    <span className="hidden sm:inline">
                        Perbarui Analisis AI
                    </span>
                    <span className="sm:hidden">AI</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Peringatan sapi berisiko tinggi"
                            className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            <Bell className="size-5" />
                            {alerts.length > 0 ? (
                                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
                            ) : null}
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="text-xs font-bold tracking-wider uppercase">
                            Peringatan AI
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {cows.isLoading && cows.data === null ? (
                            <div className="space-y-2 p-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : alerts.length === 0 ? (
                            <p className="px-2 py-3 text-xs text-muted-foreground">
                                Tidak ada sapi berisiko tinggi saat ini.
                            </p>
                        ) : (
                            alerts.map((cow) => (
                                <Link
                                    key={cow.id}
                                    href={`/cows/${cow.id}`}
                                    className="flex items-start gap-3 rounded-xl p-2 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                                >
                                    <span className="mt-1 size-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold text-gray-800 dark:text-white">
                                            {cow.code} · {cow.name}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {cow.latest.risk_assessment?.reasons.join(
                                                ', ',
                                            ) || 'Tidak ada alasan dilaporkan.'}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-[10px] text-gray-400">
                                        {formatRelativeTime(
                                            latestRecordedAt(cow.latest),
                                        )}
                                    </span>
                                </Link>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <span className="sr-only">
                    Pengguna saat ini: {auth.user?.name ?? 'tidak dikenal'}
                </span>
            </div>
        </header>
    );
}
