/**
 * @module TauriTransport
 * Рабочий invoke/listen против `underlator-tauri`.
 */

import {
  DEFAULT_PROVIDER_ID,
  DEFAULT_PROVIDER_URL,
  TAURI_COMMANDS,
  TAURI_EVENTS,
} from '../constants/tauri-transport';
import type {
  AddMessageRequest,
  BackendClient,
  CatalogApi,
  CatalogFilters,
  ChatApi,
  CreateChatRequest,
  DeleteChatRequest,
  GenerateProgress,
  GenerateRequest,
  GetCatalogRequest,
  GetChatRequest,
  GetModelInfoRequest,
  InstallProgress,
  InstallRequest,
  ListChatsRequest,
  ListModelsRequest,
  ModelApi,
  ProviderConfig,
  RemoveRequest,
  UpdateChatRequest,
} from '../types/backend-client';
import type {
  TauriBridge,
  TauriGlobal,
  TauriInternals,
} from '../types/tauri-transport';
import { BackendError, backendErrorFromBody } from '../utils/errors';

export type { TauriBridge };

function unsupported(message: string): BackendError {
  return new BackendError('unsupported', message);
}

/**
 * Разбирает classified host error `{ class, message }` из reject invoke.
 *
 * @param error - Значение reject invoke / listen.
 * @returns Нормализованный BackendError.
 */
export function parseTauriHostError(error: unknown): BackendError {
  if (error instanceof BackendError) {
    return error;
  }
  if (typeof error === 'string') {
    try {
      return backendErrorFromBody(JSON.parse(error), error);
    } catch {
      return unsupported(error);
    }
  }
  if (error && typeof error === 'object') {
    const record = error as {
      class?: unknown;
      message?: unknown;
      error?: unknown;
    };
    if (typeof record.class === 'string') {
      return backendErrorFromBody(
        record,
        String(record.message ?? 'Tauri error')
      );
    }
    if (typeof record.error === 'string') {
      try {
        return backendErrorFromBody(JSON.parse(record.error), record.error);
      } catch {
        /* fall through */
      }
    }
    if (typeof record.message === 'string' && record.message.length > 0) {
      try {
        const nested = JSON.parse(record.message);
        if (nested && typeof nested === 'object' && 'class' in nested) {
          return backendErrorFromBody(nested, record.message);
        }
      } catch {
        /* plain message */
      }
      return unsupported(record.message);
    }
  }
  return unsupported(error instanceof Error ? error.message : String(error));
}

/**
 * Оборачивает DTO в `{ request }` для именованного аргумента host.
 *
 * @param request - Тело запроса MVP.
 * @returns Объект `{ request }` для invoke.
 */
export function wrapRequest(request: unknown): { request: unknown } {
  return { request };
}

function readTauriGlobals(): {
  internals?: TauriInternals;
  tauri?: TauriGlobal;
} {
  if (typeof window === 'undefined') {
    return {};
  }
  const win = window as Window & {
    __TAURI_INTERNALS__?: TauriInternals;
    __TAURI__?: TauriGlobal;
  };
  return {
    internals: win.__TAURI_INTERNALS__,
    tauri: win.__TAURI__,
  };
}

/**
 * Default-мост: ищет Tauri 2 runtime. Нет invoke — явная ошибка.
 *
 * @returns TauriBridge поверх window globals.
 */
export function createDefaultTauriBridge(): TauriBridge {
  return {
    invoke: async <T>(command: string, args?: unknown): Promise<T> => {
      const { internals, tauri } = readTauriGlobals();
      const invoke = internals?.invoke ?? tauri?.core?.invoke ?? undefined;
      if (typeof invoke !== 'function') {
        throw unsupported(
          "Tauri runtime недоступен: команда не реализована host'ом"
        );
      }
      try {
        return (await invoke(command, args)) as T;
      } catch (error) {
        throw parseTauriHostError(error);
      }
    },
    listen: async (event, handler) => {
      const { tauri } = readTauriGlobals();
      const listen = tauri?.event?.listen;
      if (typeof listen !== 'function') {
        throw unsupported(
          "Tauri runtime недоступен: события не реализованы host'ом"
        );
      }
      return listen(event, (payload) => {
        handler(payload?.payload ?? payload);
      });
    },
  };
}

const COMMAND = {
  generate: TAURI_COMMANDS[0],
  stop: TAURI_COMMANDS[1],
  install: TAURI_COMMANDS[2],
  remove: TAURI_COMMANDS[3],
  list: TAURI_COMMANDS[4],
  catalogGet: TAURI_COMMANDS[5],
  catalogSearch: TAURI_COMMANDS[6],
  catalogGetModelInfo: TAURI_COMMANDS[7],
  chatCreate: TAURI_COMMANDS[8],
  chatGet: TAURI_COMMANDS[9],
  chatUpdate: TAURI_COMMANDS[10],
  chatDelete: TAURI_COMMANDS[11],
  chatList: TAURI_COMMANDS[12],
  chatAddMessage: TAURI_COMMANDS[13],
} as const;

/**
 * Таблица имён команд и событий для unit-теста карты ядра.
 */
export const TAURI_NAME_MAP = {
  commands: COMMAND,
  events: {
    generateProgress: TAURI_EVENTS[0],
    installProgress: TAURI_EVENTS[1],
  },
} as const;

/**
 * Транспорт Tauri: invoke + listen, без silent fallback на Electron/HTTP.
 */
export class TauriTransport implements BackendClient {
  /** Фасад model. */
  readonly model: ModelApi;
  /** Фасад catalog. */
  readonly catalog: CatalogApi;
  /** Фасад chat. */
  readonly chat: ChatApi;
  private readonly bridge: TauriBridge;

  /**
   * @param bridge - Порт runtime (по умолчанию window globals).
   */
  constructor(bridge: TauriBridge = createDefaultTauriBridge()) {
    this.bridge = bridge;
    this.model = {
      generate: (request, config) => this.generate(request, config),
      stop: () => this.bridge.invoke(COMMAND.stop),
      install: (request) =>
        this.bridge.invoke(COMMAND.install, wrapRequest(request)),
      remove: (request) =>
        this.bridge.invoke(COMMAND.remove, wrapRequest(request)),
      list: (request: ListModelsRequest = {}) =>
        this.bridge.invoke(COMMAND.list, wrapRequest(request)),
      onGenerateProgress: (callback) =>
        this.subscribe(TAURI_EVENTS[0], callback),
      onInstallProgress: (callback) =>
        this.subscribe(TAURI_EVENTS[1], callback),
    };
    this.catalog = {
      get: (params: GetCatalogRequest = {}) =>
        this.bridge.invoke(COMMAND.catalogGet, wrapRequest(params)),
      search: (filters: CatalogFilters) =>
        this.bridge.invoke(COMMAND.catalogSearch, wrapRequest(filters)),
      getModelInfo: (params: GetModelInfoRequest) =>
        this.bridge.invoke(COMMAND.catalogGetModelInfo, wrapRequest(params)),
    };
    this.chat = {
      create: (request: CreateChatRequest) =>
        this.bridge.invoke(COMMAND.chatCreate, wrapRequest(request)),
      get: (request: GetChatRequest) =>
        this.bridge.invoke(COMMAND.chatGet, wrapRequest(request)),
      update: (request: UpdateChatRequest) =>
        this.bridge.invoke(COMMAND.chatUpdate, wrapRequest(request)),
      delete: (request: DeleteChatRequest) =>
        this.bridge.invoke(COMMAND.chatDelete, wrapRequest(request)),
      list: (request: ListChatsRequest = {}) =>
        this.bridge.invoke(COMMAND.chatList, wrapRequest(request)),
      addMessage: (request: AddMessageRequest) =>
        this.bridge.invoke(COMMAND.chatAddMessage, wrapRequest(request)),
    };
  }

  private async generate(
    request: GenerateRequest,
    config?: Partial<ProviderConfig>
  ): Promise<string> {
    return this.bridge.invoke(
      COMMAND.generate,
      wrapRequest({
        ...request,
        id: config?.id ?? DEFAULT_PROVIDER_ID,
        url: config?.url ?? DEFAULT_PROVIDER_URL,
      })
    );
  }

  private subscribe<T>(
    event: string,
    callback: (payload: T) => void
  ): () => void {
    const unlistenPromise = this.bridge.listen(event, (payload) => {
      callback(payload as T);
    });
    unlistenPromise.catch(() => {
      /* ошибка listen всплывёт при вызове операции */
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }
}

export type { GenerateProgress, InstallProgress, InstallRequest };
