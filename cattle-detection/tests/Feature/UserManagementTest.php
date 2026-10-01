<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get(route('users.index'))->assertRedirect(route('login'));
    }

    public function test_it_lists_users_without_password_hashes(): void
    {
        $user = User::factory()->create(['name' => 'Sari', 'email' => 'sari@example.com']);
        User::factory()->create(['name' => 'Budi']);

        $this->actingAs($user)
            ->get(route('users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/users')
                ->where('currentUserId', $user->id)
                ->has('users', 2)
                ->where('users.0.name', 'Budi')
                ->where('users.1.email', 'sari@example.com')
                ->missing('users.0.password')
            );
    }

    public function test_an_unverified_account_is_listed_without_a_verification_date(): void
    {
        User::factory()->unverified()->create(['name' => 'Belum']);
        User::factory()->create(['name' => 'Sudah']);

        // Viewing as a verified account: the list has to be able to show the
        // difference, otherwise an unalerted account looks identical to an
        // alerting one.
        $this->actingAs(User::factory()->create(['name' => 'Admin']))
            ->get(route('users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('users.0.name', 'Admin')
                ->where('users.1.name', 'Belum')
                ->where('users.1.email_verified_at', null)
                ->where('users.2.name', 'Sudah')
                ->where('users.2.email_verified_at', fn ($value): bool => is_string($value))
            );
    }

    public function test_it_creates_a_user_with_a_hashed_password(): void
    {
        $response = $this->actingAs(User::factory()->create())
            ->post(route('users.store'), [
                'name' => '  Sari  ',
                'email' => 'Sari@Example.com',
                'password' => 'rahasia123',
                'password_confirmation' => 'rahasia123',
            ]);

        $response->assertRedirect(route('users.index'));

        $created = User::firstWhere('email', 'sari@example.com');

        $this->assertNotNull($created);
        $this->assertSame('Sari', $created->name);

        // The hashed cast on the model is what keeps the plaintext out of the
        // users table; assert it so a future cast removal is caught here.
        $this->assertNotSame('rahasia123', $created->password);
        $this->assertTrue(Hash::check('rahasia123', $created->password));
    }

    public function test_creating_a_user_requires_a_confirmed_password(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('users.store'), [
                'name' => 'Sari',
                'email' => 'sari@example.com',
                'password' => 'rahasia123',
                'password_confirmation' => 'berbeda123',
            ])
            ->assertSessionHasErrors('password');

        $this->assertNull(User::firstWhere('email', 'sari@example.com'));
    }

    public function test_the_email_must_be_unique(): void
    {
        User::factory()->create(['email' => 'sari@example.com']);

        $this->actingAs(User::factory()->create())
            ->post(route('users.store'), [
                'name' => 'Sari',
                'email' => 'sari@example.com',
                'password' => 'rahasia123',
                'password_confirmation' => 'rahasia123',
            ])
            ->assertSessionHasErrors('email');
    }

    public function test_it_updates_a_user_identity_without_touching_the_password(): void
    {
        $user = User::factory()->create(['name' => 'Sari', 'email' => 'sari@example.com']);
        $hash = $user->password;

        $this->actingAs(User::factory()->create())
            ->put(route('users.update', $user), [
                'name' => 'Sari II',
                'email' => 'sari2@example.com',
                'password' => 'diabaikan123',
            ])
            ->assertRedirect(route('users.index'));

        $user->refresh();

        $this->assertSame('Sari II', $user->name);
        $this->assertSame('sari2@example.com', $user->email);
        $this->assertSame($hash, $user->password);
    }

    public function test_a_user_keeps_its_own_email_on_update(): void
    {
        $user = User::factory()->create(['email' => 'sari@example.com']);

        $this->actingAs(User::factory()->create())
            ->put(route('users.update', $user), [
                'name' => 'Sari',
                'email' => 'sari@example.com',
            ])
            ->assertSessionHasNoErrors();
    }

    public function test_two_users_cannot_share_an_email(): void
    {
        User::factory()->create(['email' => 'sari@example.com']);
        $other = User::factory()->create(['email' => 'budi@example.com']);

        $this->actingAs(User::factory()->create())
            ->put(route('users.update', $other), [
                'name' => 'Budi',
                'email' => 'sari@example.com',
            ])
            ->assertSessionHasErrors('email');
    }

    public function test_it_deletes_another_user(): void
    {
        $user = User::factory()->create(['email' => 'budi@example.com']);

        $this->actingAs(User::factory()->create())
            ->delete(route('users.destroy', $user))
            ->assertRedirect(route('users.index'));

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_a_user_cannot_delete_their_own_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('users.destroy', $user))
            ->assertRedirect(route('users.index'));

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_the_last_account_cannot_be_deleted(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('users.destroy', $user))
            ->assertRedirect(route('users.index'));

        $this->assertSame(1, User::query()->count());
    }

    public function test_unverified_users_cannot_manage_accounts(): void
    {
        $unverified = User::factory()->unverified()->create();

        $this->actingAs($unverified)
            ->get(route('users.index'))
            ->assertRedirect(route('verification.notice'));

        $this->actingAs($unverified)
            ->post(route('users.store'), [
                'name' => 'Sari',
                'email' => 'sari@example.com',
                'password' => 'rahasia123',
                'password_confirmation' => 'rahasia123',
            ])
            ->assertRedirect(route('verification.notice'));
    }
}
