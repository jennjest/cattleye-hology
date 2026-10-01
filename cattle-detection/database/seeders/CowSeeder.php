<?php

namespace Database\Seeders;

use App\Models\Cow;
use Illuminate\Database\Seeder;

class CowSeeder extends Seeder
{
    /**
     * Cows monitored by CATTLEYE. The code matches the MQTT topic and the
     * `cow_id` field posted by the Raspberry Pi.
     */
    private const COWS = [
        ['code' => 'cow01', 'name' => 'Sapi 01'],
        ['code' => 'cow02', 'name' => 'Sapi 02'],
        ['code' => 'cow03', 'name' => 'Sapi 03'],
        ['code' => 'cow04', 'name' => 'Sapi 04'],
    ];

    public function run(): void
    {
        foreach (self::COWS as $cow) {
            Cow::query()->updateOrCreate(['code' => $cow['code']], $cow);
        }
    }
}
