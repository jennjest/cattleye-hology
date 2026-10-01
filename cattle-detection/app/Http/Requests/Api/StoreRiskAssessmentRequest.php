<?php

namespace App\Http\Requests\Api;

use App\Enums\RiskStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a standalone sensor fusion result posted by the edge computer.
 *
 * The fusion algorithm stays on the Raspberry Pi; the backend stores the score,
 * status and reasons it reports.
 *
 * `cow_id` carries the cow code (for example "cow01"), not the numeric key.
 */
class StoreRiskAssessmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization is handled by the "device" middleware on the route.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cow_id' => ['required', 'string', 'max:32', 'exists:cows,code'],
            'score' => ['required', 'numeric', 'between:0,100'],
            'status' => ['required', Rule::enum(RiskStatus::class)],
            'reasons' => ['nullable', 'array', 'max:10'],
            'reasons.*' => ['string', 'max:255'],
            'recorded_at' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'cow_id' => 'cow code',
        ];
    }
}
