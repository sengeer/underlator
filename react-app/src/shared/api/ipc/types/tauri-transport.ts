/**
 * @module TauriTransportTypes
 * Типы узкого порта runtime Tauri 2 без `@tauri-apps/api`.
 */

/** Узкий порт invoke/listen для TauriTransport. */
export interface TauriBridge {
  /**
   * Вызов именованной команды host.
   *
   * @param command - Имя команды (`model_generate`, …).
   * @param args - Именованные аргументы host (`{ request }`).
   * @returns Результат команды как DTO.
   */
  invoke<T>(command: string, args?: unknown): Promise<T>;
  /**
   * Подписка на событие host.
   *
   * @param event - Имя события (`model:generate-progress`, …).
   * @param handler - Обработчик payload.
   * @returns Функция отписки.
   */
  listen(
    event: string,
    handler: (payload: unknown) => void
  ): Promise<() => void>;
}

/**
 * Форма `__TAURI_INTERNALS__` (Tauri 2) для invoke и callback-реестра.
 * Поля опциональны: runtime может быть частично недоступен.
 */
export interface TauriInternals {
  /**
   * Вызов команды host.
   *
   * @param command - Имя команды.
   * @param args - Аргументы invoke.
   * @returns Результат команды.
   */
  invoke?: (command: string, args?: unknown) => Promise<unknown>;
  /**
   * Регистрирует JS-callback и возвращает его id.
   *
   * @param callback - Обработчик payload.
   * @param once - Снять callback после первого вызова.
   * @returns Числовой id callback.
   */
  transformCallback?: (
    callback: (payload: unknown) => void,
    once?: boolean
  ) => number;
  /**
   * Снимает callback по id.
   *
   * @param id - Идентификатор из `transformCallback`.
   * @returns Ничего.
   */
  unregisterCallback?: (id: number) => void;
}

/**
 * Форма `__TAURI__` (публичный global API).
 * Используется как fallback, если internals недоступны.
 */
export interface TauriGlobal {
  /** Ядро: invoke. */
  core?: {
    /**
     * Вызов команды host.
     *
     * @param command - Имя команды.
     * @param args - Аргументы invoke.
     * @returns Результат команды.
     */
    invoke?: (command: string, args?: unknown) => Promise<unknown>;
  };
  /** События: listen. */
  event?: {
    /**
     * Подписка на событие host.
     *
     * @param event - Имя события.
     * @param handler - Обработчик с опциональным `payload`.
     * @returns Функция отписки.
     */
    listen?: (
      event: string,
      handler: (event: { payload?: unknown }) => void
    ) => Promise<() => void>;
  };
}
