import { Link } from '@inertiajs/react';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import CowAvatar from '@/components/monitoring/cow-avatar';
import RiskStatusPill, {
    riskDotClassName,
} from '@/components/monitoring/risk-status-pill';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { BarnAssignment } from '@/lib/barns';
import { riskStatusOf } from '@/lib/cow-summary';
import { formatNumber, NOT_AVAILABLE } from '@/lib/format';
import { show as cowShowRoute } from '@/routes/cows';
import type { CowSummary } from '@/types/telemetry';

type Row = CowSummary & BarnAssignment;

type Props = {
    cows: Row[];
    /**
     * Passed only on the cow management page. The monitoring view stays
     * read-only so a stray click while watching the pen cannot delete a cow.
     */
    onEdit?: (cow: { id: number; code: string; name: string }) => void;
    onDelete?: (cow: { id: number; code: string; name: string }) => void;
};

/**
 * "Daftar Ternak" table, matching section "PAGE 3" of the mockup.
 *
 * Cells render an em dash when the Pi has not reported a value yet, so an empty
 * cell never reads as a zero measurement.
 */
export default function CowTable({ cows, onEdit, onDelete }: Props) {
    const canManage = onEdit !== undefined || onDelete !== undefined;

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:border-slate-700/80 dark:bg-slate-900/60">
                        <TableHead className="px-4 py-3.5">Foto</TableHead>
                        <TableHead className="px-4 py-3.5">ID Sapi</TableHead>
                        <TableHead className="px-4 py-3.5">Nama Sapi</TableHead>
                        <TableHead className="px-4 py-3.5">Kandang</TableHead>
                        <TableHead className="px-4 py-3.5">Suhu (°C)</TableHead>
                        <TableHead className="px-4 py-3.5">
                            Aktivitas IoT
                        </TableHead>
                        <TableHead className="px-4 py-3.5">Status AI</TableHead>
                        <TableHead className="px-4 py-3.5 text-center">
                            Aksi
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 text-xs dark:divide-slate-700/60">
                    {cows.map((cow) => {
                        const status = riskStatusOf(cow);
                        const reading = cow.latest.sensor_reading;
                        const activity = reading?.activity;

                        return (
                            <TableRow
                                key={cow.id}
                                className="transition-colors hover:bg-gray-50/70 dark:hover:bg-slate-800/60"
                            >
                                <TableCell className="px-4 py-3">
                                    <CowAvatar
                                        name={cow.name}
                                        dotClassName={riskDotClassName(status)}
                                        className="size-9"
                                    />
                                </TableCell>

                                <TableCell className="px-4 py-3">
                                    <Link
                                        href={cowShowRoute(cow.id)}
                                        className="font-mono font-bold text-brand-primary hover:underline dark:text-brand-accent"
                                    >
                                        #{cow.code}
                                    </Link>
                                </TableCell>

                                <TableCell className="px-4 py-3 font-semibold text-gray-800 dark:text-white">
                                    {cow.name}
                                </TableCell>

                                <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                    {cow.barn.name}
                                </TableCell>

                                <TableCell className="px-4 py-3 font-semibold tabular-nums">
                                    {reading?.temperature === undefined ||
                                    reading?.temperature === null ? (
                                        <span className="text-gray-400">
                                            {NOT_AVAILABLE}
                                        </span>
                                    ) : (
                                        <span
                                            className={
                                                reading.temperature > 39.3
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-gray-800 dark:text-white'
                                            }
                                        >
                                            {formatNumber(reading.temperature)}
                                        </span>
                                    )}
                                </TableCell>

                                <TableCell className="px-4 py-3">
                                    {activity?.score === undefined ||
                                    activity?.score === null ? (
                                        <span className="text-gray-400">
                                            {NOT_AVAILABLE}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                                                <span
                                                    className="block h-full rounded-full bg-brand-primary"
                                                    style={{
                                                        width: `${Math.min(
                                                            Math.round(
                                                                activity.score,
                                                            ),
                                                            100,
                                                        )}%`,
                                                    }}
                                                />
                                            </span>
                                            <span className="text-gray-600 tabular-nums dark:text-gray-300">
                                                {formatNumber(activity.score)}
                                            </span>
                                        </span>
                                    )}
                                </TableCell>

                                <TableCell className="px-4 py-3">
                                    <RiskStatusPill status={status} />
                                </TableCell>

                                <TableCell className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-gray-500 hover:text-brand-primary"
                                        >
                                            <Link
                                                href={cowShowRoute(cow.id)}
                                                aria-label={`Lihat detail ${cow.code}`}
                                            >
                                                <Eye className="size-4" />
                                            </Link>
                                        </Button>

                                        {canManage ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-gray-500"
                                                        aria-label={`Kelola ${cow.code}`}
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {onEdit ? (
                                                        <DropdownMenuItem
                                                            onSelect={() =>
                                                                onEdit(cow)
                                                            }
                                                        >
                                                            <Pencil />
                                                            Edit
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                    {onDelete ? (
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onSelect={() =>
                                                                onDelete(cow)
                                                            }
                                                        >
                                                            <Trash2 />
                                                            Hapus
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : null}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
