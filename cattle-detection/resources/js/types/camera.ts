/**
 * Live view of the edge computer.
 *
 * `GET /api/edge/camera` proxies nothing: it returns the URL of the MJPEG feed
 * produced by `cattleye/main.py` plus a normalised copy of the Pi's `latest_state`
 * (see app/Http/Resources/EdgeStateResource.php).
 *
 * Every block is nullable because the Pi publishes placeholders before its
 * camera and fusion threads have produced anything.
 */

import type { RiskStatusValue, VisionLabelValue } from './telemetry';

export type EdgeWearable = {
    temperature: number | null;
    ax: number | null;
    ay: number | null;
    az: number | null;
    gx: number | null;
    gy: number | null;
    gz: number | null;
    /** ISO 8601; null while the wearable has not published yet. */
    recorded_at: string | null;
};

export type EdgeActivity = {
    /** Standard deviation of the accelerometer magnitude, in g. */
    std_g: number | null;
    /** Ratio against the learned baseline; < 1 means the cow is resting. */
    ratio: number | null;
    /** Activity score on the same 0-100 scale as the risk score. */
    score: number | null;
    baseline: number | null;
    baseline_ready: boolean;
    samples: number | null;
};

export type EdgeVision = {
    label: VisionLabelValue;
    confidence: number | null;
    /** Raw PMK probability, which the fusion rules weight directly. */
    p_pmk: number | null;
    recorded_at: string | null;
};

export type EdgeRisk = {
    score: number | null;
    status: RiskStatusValue;
    reasons: string[];
    /** Fusion inputs that were unavailable or stale, e.g. ["aktivitas"]. */
    missing: string[];
    inputs: {
        suhu?: number | null;
        aktivitas?: number | null;
        visual?: number | null;
    };
    recorded_at: string | null;
};

export type EdgeState = {
    wearable: EdgeWearable | null;
    activity: EdgeActivity | null;
    vision: EdgeVision | null;
    risk: EdgeRisk | null;
};

export type CameraStatus = {
    /** Absolute MJPEG URL to load directly into an <img> element. */
    stream_url: string;
    /** False when the Pi did not answer; the feed cannot work either then. */
    reachable: boolean;
    state: EdgeState;
};
