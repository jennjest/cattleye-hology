<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation for creating a user account.
 *
 * Email is normalised to lower case: without it "Sari@example.com" and
 * "sari@example.com" would be two accounts, and only one of them would receive
 * risk alerts because the comparison is done on the stored string.
 */
class StoreUserRequest extends FormRequest
{
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
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],
            // Minimum length matches the login form so an account created here
            // cannot be unable to sign in later.
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'email' => 'email',
            'password' => 'kata sandi',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'email' => mb_strtolower(trim((string) $this->input('email'))),
        ]);
    }
}
