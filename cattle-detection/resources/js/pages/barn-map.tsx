import { Head, Link, router } from '@inertiajs/react';
import { Box, ExternalLink, Info, MousePointerClick } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/monitoring/data-state';
import RiskStatusPill from '@/components/monitoring/risk-status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePollingResource } from '@/hooks/use-polling-resource';
import { assignBarns, barnRangeLabel, cowsInBarn, BARNS } from '@/lib/barns';
import { riskStatusOf } from '@/lib/cow-summary';
import { formatNumber, formatRelativeTime, NOT_AVAILABLE } from '@/lib/format';
import { index as mapIndex } from '@/routes/barn-map';
import { cowService } from '@/services/cow-service';
import {
    latestRecordedAt,
    type CowSummary,
    type RiskStatusValue,
} from '@/types/telemetry';

const COWS_INTERVAL_MS = 30_000;

/** Tailwind tile colours of a pin, keyed by the four risk statuses. */
const pinClasses: Record<RiskStatusValue, string> = {
    Normal: 'bg-emerald-500 text-white',
    Waspada: 'bg-amber-500 text-white',
    'Berisiko Tinggi': 'bg-red-500 text-white pulse-danger',
    'Tidak Ada Data': 'bg-gray-400 text-white',
};

export default function BarnMap() {
    const cows = usePollingResource((signal) => cowService.list(signal), {
        intervalMs: COWS_INTERVAL_MS,
        cacheKey: 'cows',
    });

    const assigned = assignBarns(cows.data ?? []);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected =
        assigned.find((cow) => cow.id === selectedId) ?? assigned[0] ?? null;

    return (
        <>
            <Head title="Peta Kandang" />

            <div className="space-y-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                            Peta Layout Denah Kandang Visual
                        </h1>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Klik marker sapi untuk melihat ringkasan. Klik ganda
                            untuk membuka Detail Ternak.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-full bg-emerald-500" />
                            Normal
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-full bg-amber-500" />
                            Waspada
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-full bg-red-500" />
                            Risiko Tinggi
                        </span>
                    </div>
                </div>

                {cows.error !== null && cows.data === null ? (
                    <ErrorState error={cows.error} onRetry={cows.refresh} />
                ) : null}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <Card className="min-h-[520px] justify-between gap-4 py-6 lg:col-span-3">
                        <CardContent className="flex flex-1 flex-col px-6">
                            {cows.isLoading && cows.data === null ? (
                                <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
                                    {BARNS.map((barn) => (
                                        <Skeleton
                                            key={barn.id}
                                            className="h-56 w-full"
                                        />
                                    ))}
                                </div>
                            ) : assigned.length === 0 ? (
                                <EmptyState
                                    message="Daftarkan sapi terlebih dahulu untuk menampilkan denah kandang."
                                    className="h-full"
                                />
                            ) : (
                                <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
                                    {BARNS.map((barn) => {
                                        const members = cowsInBarn(
                                            assigned,
                                            barn.id,
                                        );

                                        return (
                                            <div
                                                key={barn.id}
                                                className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 barn-zone p-4 dark:border-slate-700 dark:bg-slate-900/40"
                                            >
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">
                                                        {barn.label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {barnRangeLabel(
                                                            members,
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3 pt-3">
                                                    {members.map((cow) => (
                                                        <CowPin
                                                            key={cow.id}
                                                            cow={cow}
                                                            isSelected={
                                                                selected?.id ===
                                                                cow.id
                                                            }
                                                            onSelect={() =>
                                                                setSelectedId(
                                                                    cow.id,
                                                                )
                                                            }
                                                        />
                                                    ))}

                                                    {members.length === 0 ? (
                                                        <p className="col-span-3 py-6 text-center text-[11px] text-gray-400">
                                                            Belum ada sapi
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>

                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 px-6 pt-3 text-[11px] text-gray-400 dark:border-slate-700">
                            <span className="flex items-center gap-1">
                                <Info className="size-3.5" />
                                Arahkan kursor ke pin untuk pratinjau, klik
                                untuk memilih.
                            </span>
                            <span>CATTLEYE Spatial Tracking Engine v2.4</span>
                        </div>
                    </Card>

                    <CowPanel cow={selected} />
                </div>
            </div>
        </>
    );
}

function CowPin({
    cow,
    isSelected,
    onSelect,
}: {
    cow: CowSummary & { barn: { name: string } };
    isSelected: boolean;
    onSelect: () => void;
}) {
    const status = riskStatusOf(cow);

    return (
        <button
            type="button"
            onClick={onSelect}
            onDoubleClick={() => router.visit(`/cows/${cow.id}`)}
            title={`#${cow.code} - ${cow.name} · ${status}`}
            className={`group relative flex flex-col items-center justify-center rounded-xl p-2.5 text-center shadow-md transition-all hover:scale-105 ${
                pinClasses[status]
            } ${isSelected ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-white dark:ring-offset-slate-800' : ''}`}
        >
            <Box className="mb-1 size-4" />
            <span className="text-[11px] font-bold">#{cow.code}</span>
            <span className="max-w-[50px] truncate text-[9px] opacity-90">
                {cow.name}
            </span>

            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-36 -translate-x-1/2 rounded-lg bg-slate-900 p-2 text-left text-[10px] text-white shadow-xl group-hover:block">
                <span className="block font-bold">
                    #{cow.code} - {cow.name}
                </span>
                <span className="block">
                    Suhu: {formatNumber(cow.latest.sensor_reading?.temperature)}{' '}
                    °C
                </span>
                <span className="block">Status: {status}</span>
            </span>
        </button>
    );
}

function CowPanel({
    cow,
}: {
    cow: (CowSummary & { barn: { name: string } }) | null;
}) {
    if (cow === null) {
        return (
            <Card className="justify-between gap-4 py-6">
                <CardHeader className="border-b border-gray-100 pb-4 dark:border-slate-700">
                    <CardTitle className="text-lg">Pilih Sapi</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col items-center justify-center py-6 text-center text-xs text-gray-400">
                    <MousePointerClick className="mb-2 size-10 opacity-50" />
                    Klik salah satu pin sapi di denah kandang untuk melihat
                    diagnosa IoT &amp; AI Computer Vision.
                </CardContent>
            </Card>
        );
    }

    const reading = cow.latest.sensor_reading;
    const vision = cow.latest.vision_prediction;
    const status = riskStatusOf(cow);

    return (
        <Card className="justify-between gap-4 py-6">
            <CardContent className="px-6">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-slate-700">
                    <div>
                        <span className="text-[10px] font-bold tracking-wider text-brand-primary uppercase dark:text-brand-accent">
                            {cow.barn.name}
                        </span>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                            #{cow.code} - {cow.name}
                        </h3>
                    </div>
                    <RiskStatusPill status={status} />
                </div>

                <div className="space-y-3 pt-6 text-left text-xs">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900">
                            <span className="text-[10px] text-gray-400">
                                Suhu Tubuh
                            </span>
                            <p className="font-bold text-gray-800 dark:text-white">
                                {formatNumber(reading?.temperature)} °C
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900">
                            <span className="text-[10px] text-gray-400">
                                Skor Risiko
                            </span>
                            <p className="font-bold text-gray-800 dark:text-white">
                                {cow.latest.risk_assessment === null
                                    ? NOT_AVAILABLE
                                    : `${formatNumber(cow.latest.risk_assessment.score, 0)}/100`}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-slate-900">
                        <span className="text-[10px] text-gray-400">
                            Diagnosa Computer Vision:
                        </span>
                        <p className="mt-0.5 font-medium text-gray-700 dark:text-gray-300">
                            {vision === null
                                ? 'Belum ada prediksi visual.'
                                : `Label ${vision.label} · confidence ${formatNumber(
                                      vision.confidence * 100,
                                      0,
                                  )}%`}
                        </p>
                    </div>

                    <p className="text-[10px] text-gray-400">
                        Telemetri terakhir:{' '}
                        {formatRelativeTime(latestRecordedAt(cow.latest))}
                    </p>
                </div>
            </CardContent>

            <div className="border-t border-gray-100 px-6 pt-4 dark:border-slate-700">
                <Button
                    asChild
                    className="w-full gap-2 rounded-xl bg-brand-primary text-xs font-semibold text-white hover:bg-brand-secondary"
                >
                    <Link href={`/cows/${cow.id}`}>
                        <ExternalLink className="size-4" />
                        Buka Halaman Detail Sapi
                    </Link>
                </Button>
            </div>
        </Card>
    );
}

BarnMap.layout = {
    breadcrumbs: [{ title: 'Peta Kandang', href: mapIndex() }],
};
