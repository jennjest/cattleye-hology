<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class PingTest extends TestCase
{
    public function test_it_returns_the_json_envelope(): void
    {
        $response = $this->getJson(route('api.ping'));

        $response->assertOk()
            ->assertJsonStructure(['data' => ['app', 'time'], 'message'])
            ->assertJsonPath('data.app', config('app.name'));
    }
}
