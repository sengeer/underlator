/**
 * @module ProviderSettingsSlice
 * Redux slice для управления настройками провайдеров LLM.
 * Сохранение и восстановление состояния выполняется автоматически через redux-persist.
 * Поддерживает переключение между провайдерами и обновление их параметров.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  DEFAULT_MODEL,
  DEFAULT_URL,
  DEFAULT_RAG_MODEL,
  DEFAULT_RAG_TOP_K,
  DEFAULT_RAG_SIMILARITY_THRESHOLD,
  DEFAULT_RAG_CHUNK_SIZE,
  getEmbeddingModelDimension,
} from '../../lib/constants';
import { SECTION_TYPEUSE_MAPPING } from './constants/provider-settings-slice';
import {
  ProviderSettingsState,
  State,
  RagSettings,
} from './types/provider-settings-slice';

/**
 * Начальное состояние настроек провайдеров.
 * Используется при первом запуске приложения или при отсутствии сохраненных данных.
 * Восстановление сохраненного состояния выполняется автоматически через redux-persist.
 */
const initialState: ProviderSettingsState = {
  provider: 'Embedded Ollama',
  settings: {
    Ollama: {
      id: 'ollama',
      url: DEFAULT_URL,
      model: DEFAULT_MODEL,
      typeUse: 'instruction',
    },
    'Embedded Ollama': {
      id: 'embedded-ollama',
      url: DEFAULT_URL,
      model: DEFAULT_MODEL,
      typeUse: 'instruction',
    },
  },
  rag: {
    model: DEFAULT_RAG_MODEL,
    vectorSize: getEmbeddingModelDimension(DEFAULT_RAG_MODEL),
    topK: DEFAULT_RAG_TOP_K,
    similarityThreshold: DEFAULT_RAG_SIMILARITY_THRESHOLD,
    chunkSize: DEFAULT_RAG_CHUNK_SIZE,
  },
};

/**
 * Redux slice для управления настройками провайдеров.
 * Содержит reducers для переключения провайдеров и обновления их настроек.
 * Сохранение состояния выполняется автоматически через redux-persist при каждом изменении.
 */
export const providerSettingsSlice = createSlice({
  name: 'providerSettings',
  initialState,
  reducers: {
    /**
     * Устанавливает активный провайдер.
     * Переключает текущий провайдер для генерации текста.
     *
     * @param state - Текущее состояние настроек провайдеров.
     * @param action - Действие с типом провайдера для установки.
     */
    setProvider(state, action: PayloadAction<ProviderType>) {
      state.provider = action.payload;
    },
    /**
     * Обновляет настройки конкретного провайдера.
     * Мержит новые настройки с существующими для указанного провайдера.
     *
     * @param state - Текущее состояние настроек провайдеров.
     * @param action - Действие с провайдером и новыми настройками.
     */
    updateProviderSettings(
      state,
      action: PayloadAction<{
        provider: ProviderType;
        settings: Partial<ProviderSettings>;
      }>
    ) {
      const { provider, settings } = action.payload;
      if (!state.settings[provider]) {
        state.settings[provider] = {
          id: provider,
          url: DEFAULT_URL,
          model: DEFAULT_MODEL,
          typeUse: 'instruction',
        };
      }
      state.settings[provider] = { ...state.settings[provider], ...settings };
    },
    /**
     * Устанавливает тип использования для провайдера.
     * Обновляет режим работы модели (instruction/translation).
     *
     * @param state - Текущее состояние настроек провайдеров.
     * @param action - Действие с провайдером и типом использования.
     */
    setTypeUse(
      state,
      action: PayloadAction<{
        provider: ProviderType;
        typeUse: TypeUse;
      }>
    ) {
      const { provider, typeUse } = action.payload;
      if (state.settings[provider]) {
        state.settings[provider]!.typeUse = typeUse;
      }
    },
    /**
     * Автоматически переключает тип использования на основе активной секции.
     * Использует маппинг SECTION_TYPEUSE_MAPPING для определения правильного режима.
     *
     * @param state - Текущее состояние настроек провайдеров.
     * @param action - Действие с названием секции для переключения.
     */
    setTypeUseBySection(
      state,
      action: PayloadAction<{
        sectionName: string;
      }>
    ) {
      const { sectionName } = action.payload;
      const targetTypeUse =
        SECTION_TYPEUSE_MAPPING[sectionName] || 'instruction';

      if (targetTypeUse && state.settings[state.provider]) {
        state.settings[state.provider]!.typeUse = targetTypeUse;
      }
    },

    /**
     * Обновляет глобальные настройки RAG.
     * Позволяет синхронизировать выбранную модель эмбеддингов и числовые параметры.
     *
     * @param state - Текущее состояние настроек.
     * @param action - Действие с частичным набором полей RAG.
     */
    updateRagSettings(state, action: PayloadAction<Partial<RagSettings>>) {
      // Объединяет существующие настройки с новыми, сохраняя все поля
      const newModel =
        action.payload.model !== undefined
          ? action.payload.model
          : state.rag.model || DEFAULT_RAG_MODEL;
      const newVectorSize =
        action.payload.vectorSize !== undefined
          ? action.payload.vectorSize
          : action.payload.model !== undefined
            ? getEmbeddingModelDimension(action.payload.model) ||
              state.rag.vectorSize
            : state.rag.vectorSize ||
              getEmbeddingModelDimension(state.rag.model || DEFAULT_RAG_MODEL);

      // Объединяет существующие настройки с новыми, используя значения по умолчанию для отсутствующих полей
      state.rag = {
        model: newModel,
        vectorSize: newVectorSize,
        topK:
          action.payload.topK !== undefined
            ? action.payload.topK
            : (state.rag.topK ?? DEFAULT_RAG_TOP_K),
        similarityThreshold:
          action.payload.similarityThreshold !== undefined
            ? action.payload.similarityThreshold
            : (state.rag.similarityThreshold ??
              DEFAULT_RAG_SIMILARITY_THRESHOLD),
        chunkSize:
          action.payload.chunkSize !== undefined
            ? action.payload.chunkSize
            : (state.rag.chunkSize ?? DEFAULT_RAG_CHUNK_SIZE),
      };
    },
  },
});

export const {
  setProvider,
  updateProviderSettings,
  setTypeUse,
  setTypeUseBySection,
  updateRagSettings,
} = providerSettingsSlice.actions;

/**
 * Селектор для получения всех настроек провайдеров.
 * Возвращает полное состояние настроек провайдеров из Redux store.
 *
 * @param state - Корневое состояние приложения.
 * @returns Состояние настроек провайдеров.
 */
export const selectProviderSettings = (state: State) => state.providerSettings;

/**
 * Селектор для получения настроек активного провайдера.
 * Возвращает активный провайдер и его настройки для удобного использования в компонентах.
 *
 * @param state - Корневое состояние приложения.
 * @returns Объект с активным провайдером и его настройками.
 */
export const selectActiveProviderSettings = (state: State) => {
  const { provider, settings, rag } = state.providerSettings;
  const defaultSettings: ProviderSettings = {
    id: 'embedded-ollama',
    url: DEFAULT_URL,
    model: DEFAULT_MODEL,
    typeUse: 'instruction',
  };
  return {
    provider,
    settings: settings[provider] || defaultSettings,
    rag: rag,
  };
};

export default providerSettingsSlice.reducer;
