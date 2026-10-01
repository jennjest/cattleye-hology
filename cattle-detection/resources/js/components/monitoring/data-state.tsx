import { AlertCircleIcon, InboxIcon, RefreshCwIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApiError } from '@/services/api-client';

type LoadingProps = {
    className?: string;
    rows?: number;
};

/** Skeleton placeholders shown while the first request is in flight. */
export function LoadingState({ className, rows = 4 }: LoadingProps) {
    return (
        <div className={className}>
            <div className="flex flex-col gap-3" aria-hidden="true">
                {Array.from({ length: rows }, (_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                ))}
            </div>
            <span className="sr-only">Memuat data...</span>
        </div>
    );
}

type EmptyProps = {
    message: string;
    className?: string;
};

/** Shown when the API answered successfully but there is nothing to plot. */
export function EmptyState({ message, className }: EmptyProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center ${className ?? ''}`}
        >
            <InboxIcon className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Belum ada data</p>
            <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

type ErrorProps = {
    error: ApiError | null;
    onRetry?: () => void;
    className?: string;
};

/**
 * Explicit failure state. Real telemetry is never substituted with fallback
 * values, so a failed request has to be visible to the operator.
 */
export function ErrorState({ error, onRetry, className }: ErrorProps) {
    return (
        <Alert variant="destructive" className={className}>
            <AlertCircleIcon />
            <AlertTitle>Gagal memuat data</AlertTitle>
            <AlertDescription>
                <p>
                    {error?.isNetworkError
                        ? 'Server CATTLEYE tidak dapat dihubungi.'
                        : (error?.message ?? 'Permintaan gagal.')}
                </p>
                {onRetry ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                    >
                        <RefreshCwIcon />
                        Coba lagi
                    </Button>
                ) : null}
            </AlertDescription>
        </Alert>
    );
}
