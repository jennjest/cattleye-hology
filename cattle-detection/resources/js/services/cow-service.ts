import { apiClient } from '@/services/api-client';
import type {
    CowHistory,
    CowSnapshot,
    CowSummary,
} from '@/types/telemetry';

/**
 * Read side of the CATTLEYE API used by the dashboard.
 *
 * Components never call `apiClient` directly for cow data: they use this
 * service so the endpoint paths and query parameters live in one file. Adding
 * a new endpoint means adding one method here.
 */

export type HistoryParams = {
    hours?: number;
    limit?: number;
};

export const cowService = {
    /** Every cow with its newest telemetry, in a single request. */
    list: (signal?: AbortSignal): Promise<CowSummary[]> =>
        apiClient.get<CowSummary[]>('/cows', { signal }),

    /** Newest reading, prediction and risk assessment of one cow. */
    latest: (cow: number | string, signal?: AbortSignal): Promise<CowSnapshot> =>
        apiClient.get<CowSnapshot>(`/cows/${cow}/latest`, { signal }),

    /** Chart-ready history of one cow for the requested window. */
    history: (
        cow: number | string,
        params: HistoryParams = {},
        signal?: AbortSignal,
    ): Promise<CowHistory> =>
        apiClient.get<CowHistory>(`/cows/${cow}/history`, { params, signal }),
};
