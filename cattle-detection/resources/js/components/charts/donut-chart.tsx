import { useId } from 'react';

export type DonutSegment = {
    label: string;
    value: number;
    color: string;
};

type Props = {
    segments: DonutSegment[];
    /** Rendered in the middle of the ring, e.g. the herd size. */
    caption?: string;
    description: string;
    size?: number;
    thickness?: number;
    className?: string;
};

/**
 * Proportion ring used by the Analitik page.
 *
 * Drawn as plain SVG with `stroke-dasharray` so the project keeps its "no
 * charting dependency" rule. Empty segments are skipped, and a herd with no
 * data renders an empty track instead of a misleading full ring.
 */
export default function DonutChart({
    segments,
    caption,
    description,
    size = 192,
    thickness = 18,
    className,
}: Props) {
    const titleId = useId();
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    return (
        <div
            className={`relative flex items-center justify-center ${className ?? ''}`}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                role="img"
                aria-labelledby={titleId}
                className="-rotate-90"
            >
                <title id={titleId}>{description}</title>

                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={thickness}
                    className="stroke-gray-100 dark:stroke-slate-700"
                />

                {total > 0
                    ? segments.map((segment) => {
                          const length =
                              (segment.value / total) * circumference;
                          const dash = `${Math.max(0, length - 2)} ${circumference}`;

                          // Each segment continues where the previous one ended.
                          const rotation = (offset / circumference) * 360;

                          offset += length;

                          return (
                              <circle
                                  key={segment.label}
                                  cx={size / 2}
                                  cy={size / 2}
                                  r={radius}
                                  fill="none"
                                  stroke={segment.color}
                                  strokeWidth={thickness}
                                  strokeDasharray={dash}
                                  strokeDashoffset={0}
                                  transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                              />
                          );
                      })
                    : null}
            </svg>

            {caption ? (
                <span className="pointer-events-none absolute text-center text-lg font-bold text-gray-800 dark:text-white">
                    {caption}
                </span>
            ) : null}
        </div>
    );
}
