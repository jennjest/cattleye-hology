<?php

namespace App\Http\Requests\Api;

use App\Enums\RiskStatus;
use App\Enums\VisionLabel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the full edge snapshot published by the Raspberry Pi.
 *
 * The payload mirrors the `latest_state` dictionary returned by
 * `GET /api/data` in `cattleye/main.py`:
 *
 *   {
 *     "cow_id": "cow01",
 *     "wearable": {"temperature": 38.4, "ax": ..., "timestamp": 1759286400.0},
 *     "activity": {"std_g": ..., "ratio": ..., "score": ..., "baseline": ...},
 *     "vision":   {"label": "Normal", "confidence": 0.94, "p_pmk": 0.02},
 *     "risk":     {"score": 12.0, "status": "Normal", "reasons": [],
 *                  "missing": [], "inputs": {"suhu": 38.4, ...}}
 *   }
 *
 * Edge timestamps are unix seconds (floats), which is why the `*_at` rules below
 * accept either a number or a date string.
 */
class StoreEdgeStateRequest extends FormRequest
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

            // ---- wearable block (MLX90614 + MPU6050) ----
            'wearable' => ['required', 'array'],
            'wearable.temperature' => ['nullable', 'numeric', 'between:-50,150'],
            'wearable.ax' => ['nullable', 'numeric', 'between:-1000,1000'],
            'wearable.ay' => ['nullable', 'numeric', 'between:-1000,1000'],
            'wearable.az' => ['nullable', 'numeric', 'between:-1000,1000'],
            'wearable.gx' => ['nullable', 'numeric', 'between:-1000,1000'],
            'wearable.gy' => ['nullable', 'numeric', 'between:-1000,1000'],
            'wearable.gz' => ['nullable', 'numeric', 'between:-1000,1000'],
            'wearable.timestamp' => ['nullable', 'numeric'],

            // ---- activity block (IMU window computed on the Pi) ----
            'activity' => ['nullable', 'array'],
            'activity.std_g' => ['nullable', 'numeric', 'min:0'],
            'activity.ratio' => ['nullable', 'numeric', 'min:0'],
            'activity.score' => ['nullable', 'numeric', 'between:0,100'],
            'activity.baseline' => ['nullable', 'numeric', 'min:0'],
            'activity.baseline_ready' => ['nullable', 'boolean'],
            'activity.samples' => ['nullable', 'integer', 'min:0'],

            // ---- vision block (TFLite inference, optional) ----
            'vision' => ['nullable', 'array'],
            'vision.label' => ['nullable', Rule::enum(VisionLabel::class), 'required_with:vision.confidence'],
            'vision.confidence' => ['nullable', 'numeric', 'between:0,1', 'required_with:vision.label'],
            'vision.p_pmk' => ['nullable', 'numeric', 'between:0,1'],
            'vision.timestamp' => ['nullable', 'numeric'],

            // ---- risk block (sensor fusion result, optional) ----
            'risk' => ['nullable', 'array'],
            'risk.score' => ['nullable', 'numeric', 'between:0,100', 'required_with:risk.status'],
            'risk.status' => ['nullable', Rule::enum(RiskStatus::class), 'required_with:risk.score'],
            'risk.reasons' => ['nullable', 'array', 'max:10'],
            'risk.reasons.*' => ['string', 'max:255'],
            'risk.missing' => ['nullable', 'array', 'max:5'],
            'risk.missing.*' => ['string', 'max:50'],
            'risk.inputs' => ['nullable', 'array'],
            'risk.inputs.suhu' => ['nullable', 'numeric'],
            'risk.inputs.aktivitas' => ['nullable', 'numeric'],
            'risk.inputs.visual' => ['nullable', 'numeric'],
            'risk.timestamp' => ['nullable', 'numeric'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vision.label.required_with' => 'A vision label is required when vision confidence is sent.',
            'vision.confidence.required_with' => 'A vision confidence is required when a vision label is sent.',
            'risk.status.required_with' => 'A risk status is required when a risk score is sent.',
            'risk.score.required_with' => 'A risk score is required when a risk status is sent.',
            'cow_id.exists' => 'Unknown cow code.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'cow_id' => 'cow code',
            'wearable.temperature' => 'wearable temperature',
            'wearable.ax' => 'accelerometer x',
            'wearable.ay' => 'accelerometer y',
            'wearable.az' => 'accelerometer z',
            'vision.label' => 'vision label',
            'vision.confidence' => 'vision confidence',
            'vision.p_pmk' => 'vision p_pmk',
            'risk.score' => 'risk score',
            'risk.status' => 'risk status',
        ];
    }
}
