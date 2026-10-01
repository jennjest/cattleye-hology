<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Device Token
    |--------------------------------------------------------------------------
    |
    | Shared secret used by the Raspberry Pi to authenticate against the
    | ingestion endpoints (POST /api/sensor-data, /api/vision-data and
    | /api/risk-assessments). Never commit this value.
    |
    | Generate a new one with: php artisan cattleye:token
    |
    */

    'device_token' => env('CATTLEYE_DEVICE_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | Stale Data Threshold
    |--------------------------------------------------------------------------
    |
    | Number of seconds after which the latest reading is considered stale.
    | The wearable publishes every second, so a larger gap means the edge
    | computer stopped reporting. Used to flag "last update" in the dashboard.
    |
    */

    'stale_after_seconds' => (int) env('CATTLEYE_STALE_AFTER_SECONDS', 30),

    /*
    |--------------------------------------------------------------------------
    | Default History Window
    |--------------------------------------------------------------------------
    |
    | Default number of hours returned by GET /api/cows/{cow}/history when the
    | request does not specify a window.
    |
    */

    'history_default_hours' => 24,

    'history_max_hours' => 24 * 7,

    /*
    |--------------------------------------------------------------------------
    | Edge Computer (Raspberry Pi)
    |--------------------------------------------------------------------------
    |
    | Address of the FastAPI server started by cattleye/main.py. It serves the
    | MJPEG camera feed (GET /api/video_feed) and the fusion state
    | (GET /api/data) that the dashboard reads for the live view.
    |
    | main.py binds to 0.0.0.0:8000, so use the Pi's LAN address here rather
    | than localhost.
    |
    */

    'edge' => [
        'base_url' => rtrim((string) env('CATTLEYE_EDGE_URL', 'http://192.168.1.212:8000'), '/'),
        'stream_path' => '/api/video_feed',
        'state_path' => '/api/data',

        // The tunables the Pi is currently running with, read by the settings
        // page so a saved value is never mistaken for a live one.
        'settings_path' => '/api/settings',

        // The Pi may be offline; never let a camera probe block a page render.
        'timeout' => (int) env('CATTLEYE_EDGE_TIMEOUT', 3),

        // Several open dashboards poll the same Pi, so cache its state briefly.
        'cache_seconds' => (int) env('CATTLEYE_EDGE_CACHE_SECONDS', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | Alert Notifications
    |--------------------------------------------------------------------------
    |
    | The dashboard is only useful if somebody is told when a cow crosses into a
    | risky state. Alerts are dispatched from the ingestion pipeline, queued, and
    | rate limited per cow so a cow that stays unwell does not spam the channel.
    |
    | Drivers:
    |   log       write the alert to the application log (default, always safe)
    |   telegram  Telegram Bot API
    |   whatsapp  generic JSON webhook, e.g. Fonnte or a WhatsApp gateway
    |
    | Verify the setup with: php artisan cattleye:notify-test
    |
    */

    'notifications' => [
        'driver' => env('CATTLEYE_NOTIFY_DRIVER', 'log'),

        // Risk statuses at or above this level raise an alert.
        'alert_status' => env('CATTLEYE_ALERT_STATUS', 'Berisiko Tinggi'),

        // Minimum minutes between two alerts for the same cow.
        'cooldown_minutes' => (int) env('CATTLEYE_ALERT_COOLDOWN_MINUTES', 30),

        'telegram' => [
            'bot_token' => env('TELEGRAM_BOT_TOKEN'),
            'chat_id' => env('TELEGRAM_CHAT_ID'),
        ],

        'whatsapp' => [
            'webhook_url' => env('CATTLEYE_WHATSAPP_WEBHOOK_URL'),
            'recipient' => env('CATTLEYE_WHATSAPP_RECIPIENT'),
        ],
    ],

];
