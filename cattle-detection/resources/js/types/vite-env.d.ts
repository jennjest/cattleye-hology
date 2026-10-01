/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME?: string;

    /** Base URL of the Laravel API. Leave empty for same-origin requests. */
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
