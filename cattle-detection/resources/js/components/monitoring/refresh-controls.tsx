import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatTime } from '@/lib/format';

type Props = {
    updatedAt: Date | null;
    isRefreshing: boolean;
    onRefresh: () => void;
};

/** "Data terakhir pukul ..." plus a manual refresh button for the polling views. */
export default function RefreshControls({
    updatedAt,
    isRefreshing,
    onRefresh,
}: Props) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
                {updatedAt === null
                    ? 'Memuat data...'
                    : `Data pukul ${formatTime(updatedAt)}`}
            </span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
            >
                {isRefreshing ? <Spinner /> : <RefreshCwIcon />}
                Perbarui
            </Button>
        </div>
    );
}
