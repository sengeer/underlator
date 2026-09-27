/**
 * @module ProviderSettingsSliceConstants
 * Единый каталог параметров LLM-провайдеров для settings / persist / UI.
 */

import { DEFAULT_MODEL, DEFAULT_URL } from '../../../lib/constants';

/**
 * Параметры одного провайдера в каталоге.
 */
export interface ProviderCatalogEntry {
  /** Канонический display-ключ (`ProviderType`). */
  name: ProviderType;
  /** Wire-id для BackendClient / core. */
  id: string;
  /** Base URL по умолчанию. */
  url: string;
  /** Модель по умолчанию. */
  model: string;
  /** Режим использования по умолчанию. */
  typeUse: TypeUse;
}

/**
 * Каталог поддерживаемых провайдеров (MVP и будущие пункты).
 * Добавление провайдера = новая запись здесь (+ тип `ProviderType`).
 */
export const PROVIDER_CATALOG: Readonly<
  Record<ProviderType, ProviderCatalogEntry>
> = {
  Ollama: {
    name: 'Ollama',
    id: 'ollama',
    url: DEFAULT_URL,
    model: DEFAULT_MODEL,
    typeUse: 'instruction',
  },
};

/**
 * Провайдер по умолчанию (первый канонический ключ каталога).
 */
export const DEFAULT_PROVIDER: ProviderType = 'Ollama';

/**
 * Алиасы display-ключей → канонический `ProviderType`.
 * Persist/UI могут принести устаревший ключ; резолв только через эту карту.
 */
export const PROVIDER_NAME_ALIASES: Readonly<Record<string, ProviderType>> = {
  'Embedded Ollama': 'Ollama',
};

/**
 * Алиасы wire-id → канонический id из каталога.
 */
export const PROVIDER_ID_ALIASES: Readonly<Record<string, string>> = {
  'embedded-ollama': 'ollama',
};

/**
 * Маппинг секций приложения к соответствующим режимам typeUse.
 * Определяет, какой режим использования модели должен быть активен для каждой секции.
 */
export const SECTION_TYPEUSE_MAPPING: Record<string, TypeUse> = {
  textTranslationSection: 'translation',
  pdfTranslationSection: 'contextualTranslation',
  chatSection: 'chat',
};

/**
 * Список канонических display-имён для селектора UI.
 */
export function providerSelectorEntries(): Record<string, ProviderType> {
  const entries: Record<string, ProviderType> = {};
  for (const name of Object.keys(PROVIDER_CATALOG) as ProviderType[]) {
    entries[name] = name;
  }
  return entries;
}

/**
 * Дефолтные `ProviderSettings` для канонического провайдера.
 */
export function defaultSettingsFor(provider: ProviderType): ProviderSettings {
  const entry = PROVIDER_CATALOG[provider];
  return {
    id: entry.id,
    url: entry.url,
    model: entry.model,
    typeUse: entry.typeUse,
  };
}

/**
 * Резолвит произвольный display-ключ в канонический `ProviderType`.
 * Неизвестный ключ → {@link DEFAULT_PROVIDER}.
 */
export function resolveProviderName(raw: unknown): ProviderType {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return DEFAULT_PROVIDER;
  }
  if (raw in PROVIDER_CATALOG) {
    return raw as ProviderType;
  }
  return PROVIDER_NAME_ALIASES[raw] ?? DEFAULT_PROVIDER;
}

/**
 * Резолвит wire-id в канонический id целевого провайдера.
 */
export function resolveProviderId(
  raw: unknown,
  provider: ProviderType
): string {
  const canonical = PROVIDER_CATALOG[provider].id;
  if (typeof raw !== 'string' || raw.trim() === '') {
    return canonical;
  }
  if (raw === canonical) {
    return canonical;
  }
  return PROVIDER_ID_ALIASES[raw] ?? canonical;
}
