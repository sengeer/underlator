/**
 * @module EnsureProviderSettingsStateTests
 */

import { describe, expect, it } from 'vitest';
import {
  PROVIDER_CATALOG,
  PROVIDER_ID_ALIASES,
  PROVIDER_NAME_ALIASES,
  DEFAULT_PROVIDER,
} from './constants/provider-settings-slice';
import { ensureProviderSettingsState } from './ensure-provider-settings-state';

describe('ensureProviderSettingsState', () => {
  it('ремапит алиас display-ключа и id из constants, сохраняя url/model', () => {
    const [aliasName] = Object.keys(PROVIDER_NAME_ALIASES);
    const [aliasId, canonicalId] = Object.entries(PROVIDER_ID_ALIASES)[0]!;
    const target = PROVIDER_NAME_ALIASES[aliasName]!;

    const ensured = ensureProviderSettingsState({
      provider: aliasName,
      settings: {
        [aliasName]: {
          id: aliasId,
          url: 'http://10.0.0.5:11434',
          model: 'qwen2.5:7b',
          typeUse: 'chat',
        },
      },
      rag: {
        model: 'nomic-embed-text',
        topK: 5,
        similarityThreshold: 0.5,
        chunkSize: 512,
      },
    });

    expect(ensured.provider).toBe(target);
    expect(ensured.settings[target]).toEqual({
      id: canonicalId,
      url: 'http://10.0.0.5:11434',
      model: 'qwen2.5:7b',
      typeUse: 'chat',
    });
    expect(ensured.settings).not.toHaveProperty(aliasName);
  });

  it('предпочитает канонический бакет при наличии и канона, и алиаса', () => {
    const [aliasName] = Object.keys(PROVIDER_NAME_ALIASES);
    const target = PROVIDER_NAME_ALIASES[aliasName]!;
    const defaults = PROVIDER_CATALOG[target];

    const ensured = ensureProviderSettingsState({
      provider: aliasName,
      settings: {
        [target]: {
          id: defaults.id,
          url: 'http://127.0.0.1:11434',
          model: 'llama3.1',
          typeUse: 'instruction',
        },
        [aliasName]: {
          id: Object.keys(PROVIDER_ID_ALIASES)[0],
          url: 'http://alias-host:11434',
          model: 'old-model',
          typeUse: 'instruction',
        },
      },
    });

    expect(ensured.provider).toBe(DEFAULT_PROVIDER);
    expect(ensured.settings[target]?.url).toBe('http://127.0.0.1:11434');
    expect(ensured.settings[target]?.model).toBe('llama3.1');
    expect(ensured.settings[target]?.id).toBe(defaults.id);
  });

  it('подставляет defaults каталога для пустого снимка', () => {
    const ensured = ensureProviderSettingsState({});
    const defaults = PROVIDER_CATALOG[DEFAULT_PROVIDER];

    expect(ensured.provider).toBe(DEFAULT_PROVIDER);
    expect(ensured.settings[DEFAULT_PROVIDER]).toEqual({
      id: defaults.id,
      url: defaults.url,
      model: defaults.model,
      typeUse: defaults.typeUse,
    });
  });
});
