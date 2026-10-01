<?php

namespace App\Http\Requests;

use App\Concerns\CowValidationRules;
use App\Models\Cow;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for creating a cow.
 *
 * The code is what the Pi and the MQTT topic use, so it is validated tightly and
 * normalised to lower case and trimmed: "Cow01" and "cow01" must not become two
 * different cows that the device never reports on.
 */
class StoreCowRequest extends FormRequest
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
        return [
            // Unique is checked here rather than left to the database so a
            // duplicate code comes back as a validation error the operator can
            // fix, instead of a 500 from the unique index.
            'code' => [...$this->cowCodeRules(), Rule::unique(Cow::class, 'code')],
            'name' => $this->cowNameRules(),
        ];
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
