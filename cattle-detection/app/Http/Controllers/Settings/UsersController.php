<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    /**
     * List the accounts that can receive risk alerts.
     *
     * Passwords and 2FA secrets are never selected: the page only needs to know
     * who exists and who has confirmed their address.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('settings/users', [
            'users' => User::query()
                ->select(['id', 'name', 'email', 'email_verified_at', 'created_at'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                    'created_at' => $user->created_at?->toIso8601String(),
                ]),
            'currentUserId' => $request->user()?->id,
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = User::create($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Akun {$user->email} dibuat. Notifikasi risiko belum dikirim ke akun ini sampai emailnya diverifikasi.",
        ]);

        return to_route('users.index');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $user->update($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Akun {$user->email} diperbarui.",
        ]);

        return to_route('users.index');
    }

    /**
     * Delete an account.
     *
     * Two cases are refused rather than silently handled:
     *  - the last remaining account, because that would lock everyone out;
     *  - your own account, because a user who deletes themselves mid-session ends
     *    up on an error page and has to find the login form again.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $currentId = $request->user()?->id;

        if ($user->id === $currentId) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Akun sendiri tidak bisa dihapus dari daftar ini.',
            ]);

            return to_route('users.index');
        }

        if (User::query()->count() <= 1) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Ini akun terakhir, tidak bisa dihapus.',
            ]);

            return to_route('users.index');
        }

        $email = $user->email;
        $user->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Akun {$email} dihapus.",
        ]);

        return to_route('users.index');
    }
}
