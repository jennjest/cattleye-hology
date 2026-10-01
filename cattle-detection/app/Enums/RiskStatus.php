<?php

namespace App\Enums;

use App\Models\RiskAssessment;

/**
 * Risk labels produced by the sensor fusion algorithm.
 *
 * These values mirror the labels emitted by the Raspberry Pi
 * (`cattleye/main.py`). The fusion logic itself lives on the edge computer,
 * the backend only stores and presents the result.
 *
 * @see RiskAssessment
 */
enum RiskStatus: string
{
    case Normal = 'Normal';

    case Waspada = 'Waspada';

    case BerisikoTinggi = 'Berisiko Tinggi';

    /**
     * Emitted by the edge computer when every fusion input was missing or
     * stale. Kept distinct from Normal so the dashboard can tell "no data"
     * apart from "healthy".
     */
    case TidakAdaData = 'Tidak Ada Data';

    /**
     * Position in the risk order: Normal < Waspada < Berisiko Tinggi.
     *
     * The labels are Indonesian words, so they cannot be compared as strings:
     * "Waspada" sorts *after* "Berisiko Tinggi" alphabetically, which would
     * invert every threshold check. "Tidak Ada Data" is not a risk band and
     * takes no position.
     */
    public function rank(): int
    {
        return match ($this) {
            self::Normal => 0,
            self::Waspada => 1,
            self::BerisikoTinggi => 2,
            self::TidakAdaData => -1,
        };
    }

    /**
     * Whether this status should be treated as at least as serious as the
     * threshold. "Tidak Ada Data" never qualifies on either side: losing the feed
     * is an infrastructure problem, not a cow anyone can act on.
     */
    public function isAtLeast(self $threshold): bool
    {
        if ($this === self::TidakAdaData || $threshold === self::TidakAdaData) {
            return false;
        }

        return $this->rank() >= $threshold->rank();
    }
}
