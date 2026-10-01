<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for editing a user account by an administrator.
 *
 * Only the identity fields can be changed here. Password and email verification
 * are deliberately absent: an admin resetting someone's password without telling
 * them is how accounts get locked out, and marking an email verified on someone
 * else's behalf is how unverified accounts get alerts.
 */
class UpdateUserRequest extends FormRequest
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
        // route('user') is typed as object|string because a route parameter can
        // legitimately be either. Route model binding guarantees a User here, so
        // resolve() is what makes that guarantee explicit instead of relying on
        // ?->id, which PHPStan cannot verify.
        $user = $this->route('user');
        $userId = $user instanceof User ? $user->id : $user;

        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
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
