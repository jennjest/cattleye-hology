<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the query string of GET /api/cows/{cow}/history.
 */
class CowHistoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
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
            'hours' => ['nullable', 'integer', 'min:1', 'max:'.config('cattleye.history_max_hours')],
            'limit' => ['nullable', 'integer', 'min:1', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'hours' => 'time window',
        ];
    }
}
