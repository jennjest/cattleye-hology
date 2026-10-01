<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates the edge computer (Raspberry Pi) on the ingestion endpoints.
 *
 * The device sends the shared secret as a bearer token. Authentication fails
 * closed: when no token is configured the endpoints are unavailable instead of
 * silently open.
 */
class AuthenticateDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('cattleye.device_token');

        if (! is_string($expected) || $expected === '') {
            return response()->json([
                'message' => 'Device authentication is not configured on the server.',
            ], 503);
        }

        $token = $request->bearerToken() ?? $request->header('X-CATTLEYE-Token');

        if (! is_string($token) || ! hash_equals($expected, $token)) {
            return response()->json([
                'message' => 'Invalid device token.',
            ], 401);
        }

        return $next($request);
    }
}
