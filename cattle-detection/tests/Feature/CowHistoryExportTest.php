<?php

namespace Tests\Feature;

use App\Models\Cow;
use App\Models\RiskAssessment;
use App\Models\SensorReading;
use App\Models\User;
use App\Models\VisionPrediction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CowHistoryExportTest extends TestCase
{
    use RefreshDatabase;

    private Cow $cow;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cow = Cow::factory()->withCode('cow01')->create();
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function csvRows(string $body): array
    {
        $rows = array_map('str_getcsv', array_filter(explode("\n", trim($body))));

        return array_values($rows);
    }

    public function test_it_requires_authentication(): void
    {
        $this->get(route('cows.export', $this->cow))->assertRedirect(route('login'));
    }

    public function test_it_rejects_an_unknown_cow(): void
    {
        $this->actingAs($this->user())
            ->get('/cows/999999/export')
            ->assertNotFound();
    }

    public function test_it_validates_the_time_window(): void
    {
        $this->actingAs($this->user())
            ->getJson(route('cows.export', ['cow' => $this->cow, 'hours' => 9999]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('hours');
    }

    public function test_it_names_the_file_after_the_cow_and_window(): void
    {
        $this->actingAs($this->user())
            ->get(route('cows.export', $this->cow))
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8')
            ->assertDownload(sprintf('cattleye-cow01-%s.csv', Carbon::now()->toDateString()));
    }

    public function test_it_writes_one_header_and_no_rows_for_a_silent_cow(): void
    {
        $response = $this->actingAs($this->user())->get(route('cows.export', $this->cow));

        $response->assertOk();

        $rows = $this->csvRows($response->streamedContent() ?: '');

        $this->assertSame(
            ['recorded_at', 'stream', 'value', 'status', 'label', 'confidence', 'reasons'],
            $rows[0],
        );
        $this->assertCount(1, $rows);
    }

    /**
     * The three streams are written in long format rather than joined, because
     * temperature, vision and fusion rows do not share a timestamp.
     */
    public function test_it_exports_every_stream_in_long_format(): void
    {
        SensorReading::factory()->for($this->cow)->create([
            'temperature' => 38.4,
            'recorded_at' => now()->subMinutes(30),
        ]);
        VisionPrediction::factory()->for($this->cow)->create([
            'label' => 'PMK',
            'confidence' => 0.88,
            'recorded_at' => now()->subMinutes(20),
        ]);
        RiskAssessment::factory()->for($this->cow)->create([
            'score' => 71.2,
            'status' => 'Berisiko Tinggi',
            'reasons' => ['Suhu tinggi (derajat 0.74)', 'Visual PMK (derajat 0.88)'],
            'recorded_at' => now()->subMinutes(10),
        ]);

        $response = $this->actingAs($this->user())->get(route('cows.export', $this->cow));
        $response->assertOk();

        $rows = $this->csvRows($response->streamedContent() ?: '');
        $rows = array_slice($rows, 1);

        $this->assertCount(3, $rows);

        $this->assertSame(['temperature', '38.4'], array_slice($rows[0], 1, 2));

        $this->assertSame(['vision', ''], array_slice($rows[1], 1, 2));
        $this->assertSame('PMK', $rows[1][4]);
        $this->assertEquals(0.88, (float) $rows[1][5]);

        $this->assertSame(['risk', '71.2'], array_slice($rows[2], 1, 2));
        $this->assertEquals(71.2, (float) $rows[2][2]);
        $this->assertSame('Berisiko Tinggi', $rows[2][3]);
        $this->assertSame('Suhu tinggi (derajat 0.74) | Visual PMK (derajat 0.88)', $rows[2][6]);
    }

    public function test_it_only_includes_rows_inside_the_requested_window(): void
    {
        SensorReading::factory()->for($this->cow)->create([
            'temperature' => 39.9,
            'recorded_at' => now()->subDays(3),
        ]);
        SensorReading::factory()->for($this->cow)->create([
            'temperature' => 38.1,
            'recorded_at' => now()->subHours(2),
        ]);

        $response = $this->actingAs($this->user())
            ->get(route('cows.export', ['cow' => $this->cow, 'hours' => 6]));

        $rows = array_slice($this->csvRows($response->streamedContent() ?: ''), 1);

        $this->assertCount(1, $rows);
        $this->assertEquals(38.1, (float) $rows[0][2]);
    }

    public function test_it_does_not_leak_another_cows_data(): void
    {
        $other = Cow::factory()->withCode('cow02')->create();
        SensorReading::factory()->for($other)->create([
            'temperature' => 41.2,
            'recorded_at' => now()->subMinutes(5),
        ]);

        $response = $this->actingAs($this->user())->get(route('cows.export', $this->cow));
        $rows = array_slice($this->csvRows($response->streamedContent() ?: ''), 1);

        $this->assertSame([], $rows);
    }

    private function user(): User
    {
        return User::factory()->create();
    }
}
