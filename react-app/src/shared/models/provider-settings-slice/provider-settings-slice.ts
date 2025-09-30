/**
 * @module ProviderSettingsSlice
 * Redux slice для управления настройками провайдеров LLM.
 * Обеспечивает сохранение и восстановление настроек провайдеров в localStorage.
 * Поддерживает переключение между провайдерами и обновление их параметров.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getStorageWrite,
  setStorageWrite,
} from '../../lib/utils/control-local-storage';
import {
  ProviderSettingsState,
  ProviderSettings,
  State,
} from './types/provider-settings-slice';

/**
 * Получает начальное состояние из localStorage.
 * Восстанавливает сохраненные настройки провайдеров или возвращает значения по умолчанию.
 * Обеспечивает персистентность настроек между сессиями приложения.
 * @returns Начальное состояние настроек провайдеров.
 */
function getInitialState(): ProviderSettingsState {
  const savedState = getStorageWrite('providerSettings');
  const defaultState: ProviderSettingsState = {
    provider: 'Embedded Ollama',
    settings: {
      Ollama: {
        url: 'http://127.0.0.1:11434',
        model: 'gemma:2b',
        typeUse: 'instruction',
        prompt: '',
      },
      'Embedded Ollama': {
        typeUse: 'instruction',
        model: 'qwen3:4b',
        prompt: '',
      },
    },
  };

  return savedState ? JSON.parse(savedState) : defaultState;
}

const initialState: ProviderSettingsState = getInitialState();

/**
 * Redux slice для управления настройками провайдеров.
 * Содержит reducers для переключения провайдеров и обновления их настроек.
 * Автоматически сохраняет изменения в localStorage для персистентности.
 */
export const providerSettingsSlice = createSlice({
  name: 'providerSettings',
  initialState,
  reducers: {
    /**
     * Устанавливает активный провайдер.
     * Переключает текущий провайдер для генерации текста.
     * @param state - Текущее состояние настроек провайдеров.
     * @param action - Действие с типом провайдера для установки.
     */
    setProvider(state, action: PayloadAction<ProviderType>) {
      state.provider = action.payload;
      setStorageWrite('providerSettings', JSON.stringify(state));
    },
    /**
     * Обновляет настройки конкретного провайдера.
     * Мержит новые настройки с существующими для указанного провайдера.
     * @param state - Текущее состояние настроек провайдеров.
     * @param action - Действие с провайдером и новыми настройками.
     */
    updateProviderSettings(
      state,
      action: PayloadAction<{
        provider: ProviderType;
        settings: ProviderSettings;
      }>
    ) {
      const { provider, settings } = action.payload;
      if (!state.settings[provider]) {
        state.settings[provider] = {};
      }
      state.settings[provider] = { ...state.settings[provider], ...settings };
      setStorageWrite('providerSettings', JSON.stringify(state));
    },
    /**
     * Устанавливает тип использования для провайдера.
     * Обновляет режим работы модели (instruction/translation).
     * @param state - Текущее состояние настроек провайдеров.
     * @param action - Действие с провайдером и типом использования.
     */
    setTypeUse(
      state,
      action: PayloadAction<{
        provider: ProviderType;
        typeUse: 'instruction' | 'translation';
      }>
    ) {
      const { provider, typeUse } = action.payload;
      if (state.settings[provider]) {
        state.settings[provider]!.typeUse = typeUse;
        setStorageWrite('providerSettings', JSON.stringify(state));
      }
    },
  },
});

export const { setProvider, updateProviderSettings, setTypeUse } =
  providerSettingsSlice.actions;

/**
 * Селектор для получения всех настроек провайдеров.
 * Возвращает полное состояние настроек провайдеров из Redux store.
 * @param state - Корневое состояние приложения.
 * @returns Состояние настроек провайдеров.
 */
export const selectProviderSettings = (state: State) => state.providerSettings;

/**
 * Селектор для получения настроек активного провайдера.
 * Возвращает активный провайдер и его настройки для удобного использования в компонентах.
 * @param state - Корневое состояние приложения.
 * @returns Объект с активным провайдером и его настройками.
 */
export const selectActiveProviderSettings = (state: State) => {
  const { provider, settings } = state.providerSettings;
  return { provider, settings: settings[provider] || {} };
};

export default providerSettingsSlice.reducer;
