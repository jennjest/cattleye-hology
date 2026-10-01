<?php

namespace App\Http\Requests\Api;

use App\Enums\VisionLabel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a standalone computer vision result posted by the edge computer.
 *
 * `cow_id` carries the cow code (for example "cow01"), not the numeric key.
 */
class StoreVisionDataRequest extends FormRequest
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
            'label' => ['required', Rule::enum(VisionLabel::class)],
            'confidence' => ['required', 'numeric', 'between:0,1'],
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
