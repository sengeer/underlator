/// <reference types="vite/client" />

/**
 * Переменные окружения Vite для выбора backend-транспорта.
 * Пустой `VITE_BACKEND_MODE` означает runtime detect, а не HTTP.
 */
interface ImportMetaEnv {
  /** Явный режим: `http` | `electron` | `tauri`. Пусто = detect. */
  readonly VITE_BACKEND_MODE?: string;
  /** Base URL server (пусто = same-origin `/api/...`). */
  readonly VITE_BACKEND_URL?: string;
  /** Опциональный Bearer-токен для `/api/*`. */
  readonly VITE_BACKEND_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
