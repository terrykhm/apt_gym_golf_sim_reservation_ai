/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional API origin, e.g. `http://192.168.1.10:8787`. Empty = same-origin `/api`. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
