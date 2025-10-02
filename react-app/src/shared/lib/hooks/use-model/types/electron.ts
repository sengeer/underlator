/**
 * @module ElectronTypes
 * Типы для работы с Electron IPC.
 * Определяет интерфейсы для работы с LLM моделью через Electron IPC.
 */

/**
 * Ответ от LLM модели API при генерации через Electron IPC.
 * Структура streaming ответа от /api/generate.
 */
export interface GenerateResponse {
  /** Название использованной модели */
  model: string;
  /** Созданный текст */
  response: string;
  /** Временная метка создания */
  created_at: string;
  /** Завершена ли генерация */
  done: boolean;
  /** Общее количество токенов в ответе */
  total_duration?: number;
  /** Время загрузки модели */
  load_duration?: number;
  /** Время генерации токенов */
  prompt_eval_duration?: number;
  /** Время оценки промпта */
  eval_duration?: number;
  /** Количество токенов в промпте */
  prompt_eval_count?: number;
  /** Количество сгенерированных токенов */
  eval_count?: number;
  /** Контекст для продолжения генерации */
  context?: number[];
  /** Дополнительные данные от модели */
  [key: string]: any;
}

/**
 * Параметры для генерации текста через Ollama.
 * Соответствует API endpoint /api/generate.
 */
export interface GenerateRequest {
  /** Название модели для использования */
  model: string;
  /** Текст для обработки моделью */
  prompt: string;
  /** Системный промпт для настройки поведения модели */
  system?: string;
  /** Параметры для управления контекстом */
  context?: number[];
}
