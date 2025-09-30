/**
 * @module ProviderSettingsSliceTypes
 * Типы для ProviderSettingsSlice.
 * Определяет интерфейсы для управления настройками провайдеров LLM.
 */

/**
 * Настройки провайдера LLM.
 * Гибкий интерфейс для хранения специфичных настроек каждого провайдера.
 * Поддерживает различные типы провайдеров (Ollama, Embedded Ollama) с их уникальными параметрами.
 */
export interface ProviderSettings {
  /** URL сервера провайдера (для Ollama) */
  url?: string;
  /** Название модели для использования */
  model?: string;
  /** Тип использования модели (instruction, translation) */
  typeUse?: 'instruction' | 'translation';
  /** Пользовательский промпт для модели */
  prompt?: string;
  /** Дополнительные параметры провайдера */
  [key: string]: any;
}

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
