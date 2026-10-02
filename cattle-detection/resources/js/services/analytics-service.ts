import { apiClient } from '@/services/api-client';

export type AnalyticsSummary = {
    window: {
        days: number;
        from: string;
        to: string;
    };
    /** One entry per day that has telemetry; missing days are absent. */
    daily: {
        date: string;
        avg_temperature: number | null;
        avg_risk_score: number | null;
    }[];
    /** Two-hour buckets of the last day, 12 entries, `score` may be null. */
    hourly_activity: {
        hour: number;
        score: number | null;
    }[];
};

export const analyticsService = {
    /** Herd-wide trends for the given window, in days. */
    summary: (days: number, signal?: AbortSignal): Promise<AnalyticsSummary> =>
        apiClient.get<AnalyticsSummary>('/analytics/summary', {
            params: { days },
            signal,
        }),
};
