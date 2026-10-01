import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/services/api-client';

/**
 * Polling for the read API.
 *
 * The Raspberry Pi pushes telemetry over HTTP and there is no WebSocket layer
 * yet, so the dashboard refetches on an interval instead. This hook is the one
 * place that knows about timers, request cancellation and pausing while the
 * tab is hidden.
 *
 * Every page passes a `cacheKey` describing *what* is being fetched. When it
 * changes (different cow, different time window) the previous payload is
 * dropped, so a chart never shows the previous cow's readings.
 */

export type PollingOptions = {
    /** Delay between two refreshes, in milliseconds. */
    intervalMs: number;
    /** Identity of the fetched resource; a new value restarts polling. */
    cacheKey: string;
    /** Set to false to stop polling entirely (e.g. nothing to fetch yet). */
    enabled?: boolean;
    /** Server-rendered snapshot so the first paint already shows real data. */
    initialData?: unknown;
};

export type PollingResource<T> = {
    data: T | null;
    error: ApiError | null;
    /** True only while the very first load is in flight. */
    isLoading: boolean;
    /** True while a background refresh is in flight. */
    isRefreshing: boolean;
    updatedAt: Date | null;
    refresh: () => void;
};

const UNEXPECTED_ERROR_MESSAGE = 'Permintaan gagal karena kesalahan tak terduga.';

export function usePollingResource<T>(
    fetcher: (signal: AbortSignal) => Promise<T>,
    {
        intervalMs,
        cacheKey,
        enabled = true,
        initialData = null,
    }: PollingOptions,
): PollingResource<T> {
    const [data, setData] = useState<T | null>((initialData as T | null) ?? null);
    const [error, setError] = useState<ApiError | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(enabled);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [nonce, setNonce] = useState(0);

    // Kept in a ref so an inline fetcher does not restart the timer on every
    // render of the calling component.
    const fetcherRef = useRef(fetcher);
    const previousCacheKey = useRef(cacheKey);

    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    useEffect(() => {
        if (previousCacheKey.current === cacheKey) {
            return;
        }

        previousCacheKey.current = cacheKey;
        setData(null);
        setError(null);
        setUpdatedAt(null);
    }, [cacheKey]);

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);

            return;
        }

        const controller = new AbortController();
        let isActive = true;

        const run = async (isBackground: boolean): Promise<void> => {
            if (isActive === false) {
                return;
            }

            if (isBackground) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            try {
                const result = await fetcherRef.current(controller.signal);

                if (!isActive) {
                    return;
                }

                setData(result);
                setError(null);
                setUpdatedAt(new Date());
            } catch (caught) {
                if (!isActive || controller.signal.aborted) {
                    return;
                }

                setError(
                    caught instanceof ApiError
                        ? caught
                        : new ApiError(UNEXPECTED_ERROR_MESSAGE, 0),
                );
            } finally {
                if (isActive) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                }
            }
        };

        const timer = window.setInterval(() => {
            // Do not hammer the API while the operator is on another tab.
            if (document.hidden) {
                return;
            }

            void run(true);
        }, intervalMs);

        const handleVisibilityChange = (): void => {
            if (!document.hidden) {
                void run(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        void run(false);

        return () => {
            isActive = false;
            controller.abort();
            window.clearInterval(timer);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [cacheKey, enabled, intervalMs, nonce]);

    const refresh = useCallback(() => {
        setNonce((value) => value + 1);
    }, []);

    return { data, error, isLoading, isRefreshing, updatedAt, refresh };
}
