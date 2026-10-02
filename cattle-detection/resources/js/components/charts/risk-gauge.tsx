import { NOT_AVAILABLE } from '@/lib/format';

type Props = {
    /** 0-100, or null when no risk assessment has arrived yet. */
    score: number | null;
    description: string;
    className?: string;
};

const SIZE = 160;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Ring colour follows the same bands the Pi uses for its status thresholds. */
export function riskGaugeColor(score: number | null): string {
    if (score === null) {
        return '#CBD5E1';
    }

    if (score >= 75) {
        return '#D62828';
    }

    if (score >= 40) {
        return '#F4A261';
    }

    return '#2A9D8F';
}

/** Caption under the gauge, matching `drawRiskGauge()` in the mockup. */
export function riskGaugeCaption(score: number | null): string {
    if (score === null) {
        return 'Belum ada penilaian risiko';
    }

    if (score >= 75) {
        return 'PERINGATAN BAHAYA: Perlu Penanganan!';
    }

    if (score >= 40) {
        return 'Potensi Masalah Kesehatan Terdeteksi';
    }

    return 'Status Kesehatan Optimal';
}

/** Circular "AI Risk Score Index" of the Detail Ternak page. */
export default function RiskGauge({ score, description, className }: Props) {
    const clamped = score === null ? 0 : Math.max(0, Math.min(100, score));

    return (
        <div
            className={`relative flex items-center justify-center ${className ?? ''}`}
        >
            <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="img"
                aria-label={description}
            >
                <title>{description}</title>

                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE}
                    className="stroke-gray-100 dark:stroke-slate-700"
                />

                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    stroke={riskGaugeColor(score)}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
                    // Start the arc at 12 o'clock instead of 3 o'clock.
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
            </svg>

            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-gray-800 dark:text-white">
                    {score === null ? NOT_AVAILABLE : Math.round(score)}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                    / 100
                </span>
            </span>
        </div>
    );
}
