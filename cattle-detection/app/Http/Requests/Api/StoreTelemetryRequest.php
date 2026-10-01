<?php

namespace App\Http\Requests\Api;

use App\Enums\RiskStatus;
use App\Enums\VisionLabel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the combined telemetry payload posted by the Raspberry Pi.
 *
 * `cow_id` carries the cow code (for example "cow01") exactly as the edge
 * computer sends it, not the numeric primary key.
 *
 * Vision and risk blocks are optional because the Pi runs the MQTT, camera and
 * fusion threads independently, so a wearable message may arrive without them.
 * They are still accepted here for devices that post a single combined payload.
 */
class StoreTelemetryRequest extends FormRequest
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

            'recorded_at' => ['nullable', 'date'],

            // MLX90614 body temperature. Nullable because the sensor may fail.
            'temperature' => ['nullable', 'numeric', 'between:-50,150'],

            // MPU6050 accelerometer axes (g) and gyroscope axes.
            // TODO: Tighten these bounds once the Pi reports confirmed units.
            'ax' => ['nullable', 'numeric', 'between:-1000,1000'],
            'ay' => ['nullable', 'numeric', 'between:-1000,1000'],
            'az' => ['nullable', 'numeric', 'between:-1000,1000'],
            'gx' => ['nullable', 'numeric', 'between:-1000,1000'],
            'gy' => ['nullable', 'numeric', 'between:-1000,1000'],
            'gz' => ['nullable', 'numeric', 'between:-1000,1000'],

            // IMU activity window. Computed on the Pi, stored verbatim for auditing.
            'activity' => ['nullable', 'array'],
            'activity.std_g' => ['nullable', 'numeric', 'min:0'],
            'activity.ratio' => ['nullable', 'numeric', 'min:0'],
            'activity.score' => ['nullable', 'numeric', 'between:0,100'],
            'activity.baseline' => ['nullable', 'numeric', 'min:0'],
            'activity.baseline_ready' => ['nullable', 'boolean'],
            'activity.samples' => ['nullable', 'integer', 'min:0'],

            'vision_p_pmk' => ['nullable', 'numeric', 'between:0,1'],
            'vision_label' => ['nullable', Rule::enum(VisionLabel::class), 'required_with:vision_confidence'],
            'vision_confidence' => ['nullable', 'numeric', 'between:0,1', 'required_with:vision_label'],
            'vision_recorded_at' => ['nullable', 'date'],

            'risk_score' => ['nullable', 'numeric', 'between:0,100', 'required_with:risk_status'],
            'risk_status' => ['nullable', Rule::enum(RiskStatus::class), 'required_with:risk_score'],
            'risk_reasons' => ['nullable', 'array', 'max:10'],
            'risk_reasons.*' => ['string', 'max:255'],
            'risk_missing' => ['nullable', 'array', 'max:5'],
            'risk_missing.*' => ['string', 'max:50'],
            'risk_inputs' => ['nullable', 'array'],
            'risk_inputs.suhu' => ['nullable', 'numeric'],
            'risk_inputs.aktivitas' => ['nullable', 'numeric'],
            'risk_inputs.visual' => ['nullable', 'numeric'],
            'risk_recorded_at' => ['nullable', 'date'],
        ];
    }

    /**
     * A vision confidence without a label, or a risk score without a status,
     * cannot be stored because both tables require those columns.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vision_label.required_with' => 'A vision_label is required when vision_confidence is sent.',
            'risk_status.required_with' => 'A risk_status is required when risk_score is sent.',
            'vision_confidence.required_with' => 'A vision_confidence is required when vision_label is sent.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'cow_id' => 'cow code',
            'vision_label' => 'vision label',
            'vision_confidence' => 'vision confidence',
            'vision_p_pmk' => 'vision p_pmk',
            'risk_score' => 'risk score',
            'risk_status' => 'risk status',
        ];
    }
}
