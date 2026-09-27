/**
 * @module EnsureProviderSettingsState
 * Приводит произвольный снимок providerSettings к каноническому каталогу.
 * Имена/id/defaults берутся только из constants; модуль не знает конкретных вендоров.
 */

import {
  DEFAULT_RAG_MODEL,
  DEFAULT_RAG_TOP_K,
  DEFAULT_RAG_SIMILARITY_THRESHOLD,
  DEFAULT_RAG_CHUNK_SIZE,
  getEmbeddingModelDimension,
} from '../../lib/constants';
import {
  PROVIDER_CATALOG,
  defaultSettingsFor,
  resolveProviderId,
  resolveProviderName,
} from './constants/provider-settings-slice';
import type { ProviderSettingsState } from './types/provider-settings-slice';

/**
 * Собирает канонический `ProviderSettingsState` из произвольного persist/runtime снимка.
 *
 * - display-ключ провайдера резолвится через каталог / алиасы constants;
 * - settings-бакеты с алиасными ключами сливаются в канонический бакет;
 * - id резолвится через алиасы id; url/model/typeUse сохраняются при наличии.
 */
export function ensureProviderSettingsState(
  raw: unknown
): ProviderSettingsState {
  const state = (raw ?? {}) as Partial<ProviderSettingsState> & {
    settings?: Record<string, ProviderSettings | undefined>;
  };

  const provider = resolveProviderName(state.provider);
  const settingsBags = state.settings ?? {};

  const canonicalSettings = {} as ProviderSettingsState['settings'];

  for (const catalogName of Object.keys(PROVIDER_CATALOG) as ProviderType[]) {
    const defaults = defaultSettingsFor(catalogName);
    let merged: ProviderSettings = { ...defaults };

    const applyBag = (bag: ProviderSettings) => {
      merged = {
        id: resolveProviderId(bag.id ?? merged.id, catalogName),
        url: bag.url || merged.url,
        model: bag.model || merged.model,
        typeUse: bag.typeUse || merged.typeUse,
      };
    };

    // Сначала алиасные бакеты, затем канонический — он перекрывает.
    for (const [bagKey, bag] of Object.entries(settingsBags)) {
      if (!bag || bagKey === catalogName) continue;
      if (resolveProviderName(bagKey) !== catalogName) continue;
      applyBag(bag);
    }
    const canonicalBag = settingsBags[catalogName];
    if (canonicalBag) {
      applyBag(canonicalBag);
    }

    merged.id = resolveProviderId(merged.id, catalogName);
    canonicalSettings[catalogName] = merged;
  }

  const ragModel = state.rag?.model || DEFAULT_RAG_MODEL;

  return {
    provider,
    settings: canonicalSettings,
    rag: {
      model: ragModel,
      vectorSize: state.rag?.vectorSize ?? getEmbeddingModelDimension(ragModel),
      topK: state.rag?.topK ?? DEFAULT_RAG_TOP_K,
      similarityThreshold:
        state.rag?.similarityThreshold ?? DEFAULT_RAG_SIMILARITY_THRESHOLD,
      chunkSize: state.rag?.chunkSize ?? DEFAULT_RAG_CHUNK_SIZE,
    },
  };
}
