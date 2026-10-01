/**
 * Reusable HTTP client for the CATTLEYE REST API.
 *
 * Components and hooks must call a service from this folder instead of using
 * `fetch` directly, so the base URL, request headers, error shape and the
 * JSON envelope are handled in exactly one place.
 */

export type ApiEnvelope<T> = {
    data: T;
    message?: string;
};

export type QueryParams = Record<
    string,
    string | number | boolean | null | undefined
>;

export type RequestOptions = {
    params?: QueryParams;
    signal?: AbortSignal;
};

export class ApiError extends Error {
    readonly status: number;

    readonly errors: Record<string, string[]>;

    constructor(
        message: string,
        status: number,
        errors: Record<string, string[]> = {},
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }

    /** The server could not be reached at all (offline, DNS, connection refused). */
    get isNetworkError(): boolean {
        return this.status === 0;
    }
}

const NETWORK_ERROR_MESSAGE = 'Tidak dapat terhubung ke server CATTLEYE.';
const INVALID_RESPONSE_MESSAGE = 'Respons API tidak valid.';

/**
 * Laravel serves both the Inertia pages and `/api`, so requests are
 * same-origin by default. Set VITE_API_URL only when the API is deployed on a
 * different host, and never hardcode a URL anywhere else.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

function buildUrl(path: string, params?: QueryParams): string {
    const path_ = path.startsWith('/') ? path : `/${path}`;
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params ?? {})) {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    }

    const query = search.toString();

    return `${BASE_URL}/api${path_}${query ? `?${query}` : ''}`;
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
    return typeof value === 'object' && value !== null && 'data' in value;
}

function toApiError(response: Response, payload: unknown): ApiError {
    if (typeof payload === 'object' && payload !== null) {
        const { message, errors } = payload as {
            message?: string;
            errors?: Record<string, string[]>;
        };

        return new ApiError(
            message ?? `Permintaan gagal (HTTP ${response.status}).`,
            response.status,
            errors ?? {},
        );
    }

    return new ApiError(
        `Permintaan gagal (HTTP ${response.status}).`,
        response.status,
    );
}

/** Performs a GET request and returns the `data` field of the API envelope. */
async function get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    let response: Response;

    try {
        response = await fetch(buildUrl(path, options.params), {
            signal: options.signal,
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }

        throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
    }

    let payload: unknown = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw toApiError(response, payload);
    }

    if (!isEnvelope(payload)) {
        throw new ApiError(INVALID_RESPONSE_MESSAGE, response.status);
    }

    return payload.data as T;
}

export const apiClient = { get };
