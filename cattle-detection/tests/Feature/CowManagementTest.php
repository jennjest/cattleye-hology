<?php

namespace Tests\Feature;

use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\SensorReading;
use App\Models\User;
use App\Models\VisionPrediction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CowManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_manage_cows(): void
    {
        $cow = Cow::factory()->create();

        $this->post(route('cows.store'), ['code' => 'cow02', 'name' => 'Sari'])->assertRedirect(route('login'));
        $this->put(route('cows.update', $cow), ['code' => 'changed', 'name' => 'Sari'])->assertRedirect(route('login'));
        $this->delete(route('cows.destroy', $cow))->assertRedirect(route('login'));

        $this->assertDatabaseHas('cows', ['id' => $cow->id]);
    }

    public function test_it_renders_the_index_page(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('cows.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('cows/index'));
    }

    public function test_a_user_can_create_a_cow(): void
    {
        $response = $this->actingAs(User::factory()->create())
            ->post(route('cows.store'), ['code' => 'Cow_02', 'name' => '  Sari  ']);

        $cow = Cow::firstWhere('code', 'cow_02');

        $this->assertNotNull($cow);
        $response->assertRedirect(route('cows.show', $cow));

        // The code is normalised so the Pi key stays stable regardless of the
        // casing an operator types.
        $this->assertSame('Sari', $cow->name);
    }

    public function test_creating_a_cow_requires_a_code_and_name(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('cows.store'), ['code' => '', 'name' => ''])
            ->assertSessionHasErrors(['code', 'name']);

        $this->assertSame(0, Cow::count());
    }

    public function test_the_code_must_be_url_safe(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('cows.store'), ['code' => 'sapicitedua/../../etc', 'name' => 'Sari'])
            ->assertSessionHasErrors('code');

        $this->assertSame(0, Cow::count());
    }

    public function test_the_code_must_be_unique(): void
    {
        Cow::factory()->create(['code' => 'cow01']);

        $this->actingAs(User::factory()->create())
            ->post(route('cows.store'), ['code' => 'cow01', 'name' => 'Sari'])
            ->assertSessionHasErrors('code');
    }

    public function test_a_user_can_update_a_cow(): void
    {
        $cow = Cow::factory()->create(['code' => 'cow01', 'name' => 'Sari']);

        $this->actingAs(User::factory()->create())
            ->put(route('cows.update', $cow), ['code' => 'cow01b', 'name' => 'Sari II'])
            ->assertRedirect(route('cows.show', $cow));

        $this->assertDatabaseHas('cows', ['id' => $cow->id, 'code' => 'cow01b', 'name' => 'Sari II']);
    }

    public function test_a_cow_keeps_its_own_code_on_update(): void
    {
        $cow = Cow::factory()->create(['code' => 'cow01']);

        $this->actingAs(User::factory()->create())
            ->put(route('cows.update', $cow), ['code' => 'cow01', 'name' => 'Sari'])
            ->assertSessionHasNoErrors();
    }

    public function test_two_cows_cannot_share_a_code(): void
    {
        Cow::factory()->create(['code' => 'cow01']);
        $other = Cow::factory()->create(['code' => 'cow02']);

        $this->actingAs(User::factory()->create())
            ->put(route('cows.update', $other), ['code' => 'cow01', 'name' => 'Sari'])
            ->assertSessionHasErrors('code');
    }

    public function test_updating_a_missing_cow_returns_404(): void
    {
        $this->actingAs(User::factory()->create())
            ->put(route('cows.update', 9999), ['code' => 'cow99', 'name' => 'Sari'])
            ->assertNotFound();
    }

    public function test_deleting_a_cow_also_removes_its_telemetry(): void
    {
        $cow = Cow::factory()->create(['code' => 'cow01']);

        SensorReading::factory()->for($cow)->count(2)->create();
        VisionPrediction::factory()->for($cow)->create();
        RiskAssessment::factory()->for($cow)->create();

        $this->actingAs(User::factory()->create())
            ->delete(route('cows.destroy', $cow))
            ->assertRedirect(route('cows.index'));

        $this->assertDatabaseMissing('cows', ['id' => $cow->id]);
        $this->assertDatabaseMissing('sensor_readings', ['cow_id' => $cow->id]);
        $this->assertDatabaseMissing('vision_predictions', ['cow_id' => $cow->id]);
        $this->assertDatabaseMissing('risk_assessments', ['cow_id' => $cow->id]);
    }

    public function test_deleting_a_cow_without_telemetry_still_works(): void
    {
        $cow = Cow::factory()->create();

        $this->actingAs(User::factory()->create())
            ->delete(route('cows.destroy', $cow))
            ->assertRedirect(route('cows.index'));

        $this->assertDatabaseMissing('cows', ['id' => $cow->id]);
    }
}
