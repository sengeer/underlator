/**
 * @module ProviderSettingsSliceTypes
 * Типы для ProviderSettingsSlice.
 * Определяет интерфейсы для управления настройками провайдеров LLM.
 */

/**
 * Состояние настроек провайдеров.
 * Содержит активный провайдер и настройки для всех доступных провайдеров.
 * Обеспечивает изоляцию настроек между различными провайдерами.
 */
export interface ProviderSettingsState {
  /** Активный провайдер для генерации текста */
  provider: ProviderType;
  /** Настройки для каждого провайдера */
  settings: {
    [providerName in ProviderType]?: ProviderSettings;
  };
}

/**
 * Корневое состояние приложения.
 * Содержит все слайсы Redux store, включая настройки провайдеров.
 */
export interface State {
  /** Состояние настроек провайдеров LLM */
  providerSettings: ProviderSettingsState;
}
