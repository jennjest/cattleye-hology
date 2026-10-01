<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateDeviceTokenCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'cattleye:token {--show : Display the token that is currently configured}';

    /**
     * @var string
     */
    protected $description = 'Generate a shared secret for the Raspberry Pi ingestion endpoints';

    public function handle(): int
    {
        if ($this->option('show')) {
            $configured = config('cattleye.device_token');

            $this->line($configured
                ? 'CATTLEYE_DEVICE_TOKEN is configured.'
                : 'CATTLEYE_DEVICE_TOKEN is not set.');

            return self::SUCCESS;
        }

        $this->comment('Add this to your .env file (do not commit it):');
        $this->line('');
        $this->line('CATTLEYE_DEVICE_TOKEN='.Str::random(64));
        $this->line('');

        return self::SUCCESS;
    }
}
