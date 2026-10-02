import { useCallback, useEffect, useState } from 'react';

export type MjpegStream = {
    /** Feed URL including the restart nonce, or null when unknown yet. */
    src: string | null;
    hasFrame: boolean;
    failed: boolean;
    /** `onLoad` / `onError` handlers for the `<img>` element. */
    markFrame: () => void;
    markFailed: () => void;
    /** Bumps the nonce and clears the flags, forcing the browser to reconnect. */
    restart: () => void;
};

/**
 * Bookkeeping for the Pi's MJPEG feed.
 *
 * An `<img src="...multipart">` stays open forever, so `onload` fires as soon as
 * the first frame decodes and is the only usable "stream is up" signal. The
 * element must also not be re-created while polling, hence the nonce: a changed
 * `src` is what actually restarts the connection.
 */
export function useMjpegStream(streamUrl: string | null): MjpegStream {
    const [nonce, setNonce] = useState(0);
    const [hasFrame, setHasFrame] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setHasFrame(false);
        setFailed(false);
    }, [streamUrl]);

    const restart = useCallback(() => {
        setNonce((value) => value + 1);
        setHasFrame(false);
        setFailed(false);
    }, []);

    const markFrame = useCallback(() => {
        setHasFrame(true);
        setFailed(false);
    }, []);

    const markFailed = useCallback(() => {
        setFailed(true);
        setHasFrame(false);
    }, []);

    return {
        src:
            streamUrl === null
                ? null
                : `${streamUrl}${streamUrl.includes('?') ? '&' : '?'}_=${nonce}`,
        hasFrame,
        failed,
        markFrame,
        markFailed,
        restart,
    };
}
