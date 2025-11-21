/**
 * @module ProviderSettingsSliceTypes
 * Типы для ProviderSettingsSlice.
 * Определяет интерфейсы для управления настройками провайдеров LLM.
 */

/**
 * Настройки RAG.
 */
export interface RagSettings {
  /** Название модели */
  model: string;
  /** Размерность векторов выбранной модели (нужна для валидации хранилища) */
  vectorSize?: number;
  /** Количество результатов */
  topK: number;
  /** Порог схожести */
  similarityThreshold: number;
  /** Размер чанка */
  chunkSize: number;
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
  rag: RagSettings;
}

/**
 * Корневое состояние приложения.
 * Содержит все слайсы Redux store, включая настройки провайдеров.
 */
export interface State {
  /** Состояние настроек провайдеров LLM */
  providerSettings: ProviderSettingsState;
}
