<?php

namespace App\Http\Requests;

use App\Concerns\CowValidationRules;
use App\Models\Cow;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for editing a cow.
 *
 * The uniqueness check is scoped to the cow being edited, so re-saving a cow
 * without touching its code does not fail against itself.
 */
class UpdateCowRequest extends FormRequest
{
    use CowValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->hasVerifiedEmail() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // route('cow') is typed as object|string because a route parameter can
        // legitimately be either. Route model binding guarantees a Cow here, so
        // resolve() is what makes that guarantee explicit instead of relying on
        // ?->id, which PHPStan cannot verify.
        $cow = $this->route('cow');
        $cowId = $cow instanceof Cow ? $cow->id : $cow;

        return [
            'code' => [
                ...$this->cowCodeRules(),
                Rule::unique('cows', 'code')->ignore($cowId),
            ],
            'name' => $this->cowNameRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...$this->cowMessages(),
            'code.unique' => 'Kode sapi sudah dipakai sapi lain.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return $this->cowAttributes();
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => mb_strtolower(trim((string) $this->input('code')))]);
        }

        if ($this->has('name')) {
            $this->merge(['name' => trim((string) $this->input('name'))]);
        }
    }
}
