import { Link } from "@inertiajs/react";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import RiskStatusBadge from "@/components/monitoring/risk-status-badge";
import VisionLabelBadge from "@/components/monitoring/vision-label-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { riskStatusOf } from "@/lib/cow-summary";
import { formatNumber, formatRelativeTime, NOT_AVAILABLE } from "@/lib/format";
import { latestRecordedAt } from "@/types/telemetry";
import { show as cowShowRoute } from "@/routes/cows";
import type { CowSummary } from "@/types/telemetry";

type Props = {
    cows: CowSummary[];
    caption?: string;
    /**
     * Passed only on the cow management page. The monitoring view stays
     * read-only so a stray click while watching the pen cannot delete a cow.
     */
    onEdit?: (cow: { id: number; code: string; name: string }) => void;
    onDelete?: (cow: { id: number; code: string; name: string }) => void;
};

/**
 * Overview table of every cow with its newest telemetry.
 *
 * Cells render an em dash when the Pi has not reported a value yet, so an
 * empty cell never reads as a zero measurement.
 */
export default function CowTable({ cows, caption, onEdit, onDelete }: Props) {
    const canManage = onEdit !== undefined || onDelete !== undefined;
    return (
        <div className="overflow-x-auto rounded-xl border">
            <Table>
                {caption ? <TableCaption>{caption}</TableCaption> : null}
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-28">Kode</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead className="text-right">Suhu (°C)</TableHead>
                        <TableHead className="text-right">IMU (gx)</TableHead>
                        <TableHead>Vision</TableHead>
                        <TableHead className="text-right">Risk score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Pembaruan</TableHead>
                        {canManage && <TableHead className="w-12" />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cows.map((cow) => {
                        const {
                            sensor_reading,
                            vision_prediction,
                            risk_assessment,
                        } = cow.latest;

                        return (
                            <TableRow key={cow.id}>
                                <TableCell className="font-mono text-xs">
                                    <Link
                                        href={cowShowRoute(cow.id)}
                                        className="font-medium hover:underline"
                                    >
                                        {cow.code}
                                    </Link>
                                </TableCell>
                                <TableCell>{cow.name}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {sensor_reading === null
                                        ? NOT_AVAILABLE
                                        : formatNumber(
                                              sensor_reading.temperature,
                                          )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {sensor_reading === null
                                        ? NOT_AVAILABLE
                                        : formatNumber(sensor_reading.gx, 2)}
                                </TableCell>
                                <TableCell>
                                    {vision_prediction === null ? (
                                        <span className="text-muted-foreground">
                                            {NOT_AVAILABLE}
                                        </span>
                                    ) : (
                                        <VisionLabelBadge
                                            label={vision_prediction.label}
                                            confidence={
                                                vision_prediction.confidence
                                            }
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {risk_assessment === null
                                        ? NOT_AVAILABLE
                                        : formatNumber(risk_assessment.score)}
                                </TableCell>
                                <TableCell>
                                    <RiskStatusBadge
                                        status={riskStatusOf(cow)}
                                    />
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {latestRecordedAt(cow.latest) === null ? (
                                        <Badge variant="secondary">
                                            Belum pernah
                                        </Badge>
                                    ) : (
                                        formatRelativeTime(
                                            latestRecordedAt(cow.latest),
                                        )
                                    )}
                                </TableCell>
                                {canManage && (
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Kelola ${cow.code}`}
                                                >
                                                    <MoreHorizontalIcon />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {onEdit && (
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            onEdit(cow)
                                                        }
                                                    >
                                                        <PencilIcon />
                                                        Edit
                                                    </DropdownMenuItem>
                                                )}
                                                {onDelete && (
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onSelect={() =>
                                                            onDelete(cow)
                                                        }
                                                    >
                                                        <Trash2Icon />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
