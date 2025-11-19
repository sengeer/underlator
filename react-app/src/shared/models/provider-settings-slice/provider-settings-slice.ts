/**
 * @module ProviderSettingsSlice
 * Redux slice для управления настройками провайдеров LLM.
 * Сохранение и восстановление состояния выполняется автоматически через redux-persist.
 * Поддерживает переключение между провайдерами и обновление их параметров.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_MODEL, DEFAULT_URL } from '../../lib/constants';
import { SECTION_TYPEUSE_MAPPING } from './constants/provider-settings-slice';
import { ProviderSettingsState, State } from './types/provider-settings-slice';

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
  },
});

export const {
  setProvider,
  updateProviderSettings,
  setTypeUse,
  setTypeUseBySection,
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
  const { provider, settings } = state.providerSettings;
  const defaultSettings: ProviderSettings = {
    id: 'embedded-ollama',
    url: DEFAULT_URL,
    model: DEFAULT_MODEL,
    typeUse: 'instruction',
  };
  return {
    provider,
    settings: settings[provider] || defaultSettings,
  };
};

export default providerSettingsSlice.reducer;
