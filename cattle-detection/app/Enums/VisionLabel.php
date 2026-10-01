<?php

namespace App\Enums;

use App\Models\VisionPrediction;

/**
 * Labels produced by the computer vision model on the edge computer.
 *
 * The TFLite model used by CATTLEYE classifies two classes (Normal, PMK);
 * Unknown is the placeholder the Raspberry Pi uses before the first
 * successful inference.
 *
 * @see VisionPrediction
 */
enum VisionLabel: string
{
    case Normal = 'Normal';

    case Pmk = 'PMK';

    case Unknown = 'Unknown';
}
