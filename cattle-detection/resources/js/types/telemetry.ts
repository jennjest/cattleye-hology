/**
 * Shapes returned by the CATTLEYE read API.
 *
 * These mirror the API resources on the Laravel side
 * (app/Http/Resources) so a payload change breaks `tsc` instead of silently
 * rendering undefined in the dashboard. Every nullable field is optional in
 * nature: the edge computer may never have reported that sensor yet, and the
 * UI must show "N/A" rather than a zero.
 */

export const RISK_STATUSES = [
    'Normal',
    'Waspada',
    'Berisiko Tinggi',
    'Tidak Ada Data',
] as const;

export type RiskStatusValue = (typeof RISK_STATUSES)[number];

export const VISION_LABELS = ['Normal', 'PMK', 'Unknown'] as const;

export type VisionLabelValue = (typeof VISION_LABELS)[number];

/** Status the Raspberry Pi sends when it has nothing fresh to report. */
export const NO_DATA_STATUS: RiskStatusValue = 'Tidak Ada Data';

/**
 * Activity window reported by the edge fusion loop.
 *
 * Only `baseline_ready` and `score` are relied on for the UI; the rest is passed
 * through for diagnostics. Every field is optional because the Pi adds keys over
 * time and older payloads must keep rendering.
 */
export type ActivityWindow = {
    score?: number | null;
    ratio?: number | null;
    baseline?: number | null;
    baseline_ready?: boolean | null;
    window_seconds?: number | null;
    samples?: number | null;
};

export type SensorReading = {
    id: number;
    temperature: number | null;
    ax: number | null;
    ay: number | null;
    az: number | null;
    gx: number | null;
    gy: number | null;
    gz: number | null;
    activity?: ActivityWindow | null;
    recorded_at: string;
};

export type VisionPrediction = {
    id: number;
    label: VisionLabelValue;
    confidence: number;
    /** Disease probability produced by the classification model, if reported. */
    p_pmk?: number | null;
    recorded_at: string;
};

export type RiskAssessment = {
    id: number;
    score: number;
    status: RiskStatusValue;
    reasons: string[];
    /** Inputs that were unavailable to the fusion rule. */
    missing?: string[];
    recorded_at: string;
};

export type Cow = {
    id: number;
    code: string;
    name: string;
};

export type CowLatestTelemetry = {
    sensor_reading: SensorReading | null;
    vision_prediction: VisionPrediction | null;
    risk_assessment: RiskAssessment | null;
};

/** A cow plus its newest telemetry, as returned by `GET /api/cows`. */
export type CowSummary = Cow & {
    latest: CowLatestTelemetry;
};

/** Newest telemetry of a single cow, as returned by `GET /api/cows/{cow}/latest`. */
export type CowSnapshot = CowLatestTelemetry & {
    cow: Cow;
    is_stale: boolean;
};

export type HistoryWindow = {
    hours: number;
    from: string;
    to: string;
};

export type TemperaturePoint = {
    recorded_at: string;
    value: number | null;
};

export type RiskScorePoint = {
    recorded_at: string;
    value: number;
    status: RiskStatusValue;
};

export type VisionPoint = {
    recorded_at: string;
    label: VisionLabelValue;
    confidence: number;
};

/** Chart-ready history, as returned by `GET /api/cows/{cow}/history`. */
export type CowHistory = {
    cow: Cow;
    window: HistoryWindow;
    temperature: TemperaturePoint[];
    risk_score: RiskScorePoint[];
    vision: VisionPoint[];
};

export function latestRecordedAt(latest: CowLatestTelemetry): string | null {
    const timestamps = [
        latest.sensor_reading?.recorded_at,
        latest.vision_prediction?.recorded_at,
        latest.risk_assessment?.recorded_at,
    ].filter((value): value is string => typeof value === 'string');

    if (timestamps.length === 0) {
        return null;
    }

    return timestamps.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}
