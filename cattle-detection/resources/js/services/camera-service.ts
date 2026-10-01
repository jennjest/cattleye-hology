import { apiClient } from '@/services/api-client';
import type { CameraStatus } from '@/types/camera';

/**
 * Access to the Raspberry Pi's FastAPI server (cattleye/main.py).
 *
 * The MJPEG stream itself is loaded straight from the Pi by the browser, so
 * this service only fetches the feed URL and the Pi's current fusion state.
 */
export const cameraService = {
    /** Feed URL plus `latest_state`; `reachable` is false when the Pi is down. */
    status: (signal?: AbortSignal): Promise<CameraStatus> =>
        apiClient.get<CameraStatus>('/edge/camera', { signal }),
};
