/**
 * @module OllamaTypes
 * Типы для ollama провайдера.
 * Определяет интерфейсы для работы с Ollama API.
 */

/**
 * Интерфейс GenerateOptions.
 * Опции генерации для Ollama провайдера.
 * Расширяет базовые опции специфичными для Ollama параметрами.
 */
export interface GenerateOptions {
  /** Текст для обработки (один или массив фрагментов) */
  text: string | string[];
  /** Направление перевода */
  translateLanguage: 'en-ru' | 'ru-en';
  /** Название модели Ollama для использования */
  model?: string;
  /** URL сервера Ollama (по умолчанию localhost:11434) */
  url?: string;
  /** Тип использования модели */
  typeUse?: 'instruction' | 'translation';
  /** Callback для получения ответа модели */
  onModelResponse?: (response: ModelResponse) => void;
  /** Callback для отслеживания прогресса */
  onProgress?: (progress: Progress) => void;
  /** Сигнал для отмены операции */
  signal?: AbortSignal;
  /** Дополнительные параметры генерации */
  params: Params;
}
