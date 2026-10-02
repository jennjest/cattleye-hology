<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class NavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_root_redirects_to_the_dashboard(): void
    {
        $this->get('/')->assertRedirect(route('dashboard'));
    }

    /**
     * Pages that need no route parameter. The cow detail page is covered by
     * CowPageTest because it resolves a real cow.
     *
     * @return array<string, array{string}>
     */
    public static function protectedPages(): array
    {
        return [
            'dashboard' => ['dashboard'],
            'barn map' => ['barn-map.index'],
            'analytics' => ['analytics.index'],
            'detail' => ['detail.index'],
            'cows index' => ['cows.index'],
            'monitoring' => ['monitoring.index'],
            'history' => ['history.index'],
        ];
    }

    #[DataProvider('protectedPages')]
    public function test_guests_are_redirected_to_the_login_page(string $route): void
    {
        $this->get(route($route))->assertRedirect(route('login'));
    }

    #[DataProvider('protectedPages')]
    public function test_authenticated_users_can_visit_the_page(string $route): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route($route))->assertOk();
    }
}
