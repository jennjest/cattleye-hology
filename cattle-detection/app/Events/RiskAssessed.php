<?php

namespace App\Events;

use App\Models\Cow;
use App\Models\RiskAssessment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Raised when the fusion pipeline stores a new risk assessment for a cow.
 *
 * Dispatched inside the ingestion transaction with `afterCommit()`, so an alert
 * can never describe a row that was rolled back.
 */
class RiskAssessed
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly Cow $cow,
        public readonly RiskAssessment $assessment,
    ) {}
}
