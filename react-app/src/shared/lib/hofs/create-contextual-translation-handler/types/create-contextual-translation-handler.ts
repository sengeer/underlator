/**
 * @module CreateContextualTranslationHandlerTypes
 * Типы для HOF CreateContextualTranslationHandler.
 */

/**
 * Интерфейс ApiCallFunction.
 * Интерфейс универсальной функции для взаимодействия с различными провайдерами.
 */
export interface ApiCallFunction<TApiResponse> {
  (
    /** Промпт для отправки в модель */
    prompt: string,
    /** Параметры генерации */
    params: Params,
    /** Сигнал для отмены операции */
    signal?: AbortSignal
    /** Ответ от API провайдера */
  ): Promise<TApiResponse>;
}

/**
 * Интерфейс ResponseProcessorFunction.
 * Интерфейс функции для обработки ответа от API провайдера.
 * Преобразует ответ провайдера в строку с поддержкой стриминга.
 */
export interface ResponseProcessorFunction<TApiResponse> {
  (
    /** Ответ от API провайдера */
    response: TApiResponse,
    /** Callback для обработки фрагментов ответа */
    onChunk?: (chunkResponse: string) => void,
    /** Callback для обработки ошибок */
    onError?: (error: string, line?: string) => void
    /** Полный обработанный ответ */
  ): Promise<string>;
}

/**
 * Интерфейс ContextualTranslationHandler.
 * Интерфейс обработчика контекстного перевода.
 * Основная функция для выполнения контекстного перевода текстов.
 */
export interface ContextualTranslationHandler {
  (
    /** Массив текстов для перевода */
    texts: string[],
    /** Направление перевода в формате "source-target" */
    translateLanguage: string,
    /** Параметры генерации */
    params: Params,
    /** Сигнал для отмены операции */
    signal?: AbortSignal,
    /** Callback для получения ответов модели */
    onModelResponse?: (response: ModelResponse) => void
    /** Результат перевода в виде маппинга индексов на переведенные тексты */
  ): Promise<Record<number, string>>;
}

/**
 * Интерфейс CreateContextualTranslationHandlerFunction.
 * Интерфейс HOF для создания обработчика контекстного перевода.
 * Фабричная функция для создания обработчика с конкретным провайдером.
 */
export interface CreateContextualTranslationHandlerFunction {
  <TApiResponse>(
    /** Функция для API вызова */
    apiCall: ApiCallFunction<TApiResponse>,
    /** Функция обработки ответа */
    responseProcessor: ResponseProcessorFunction<TApiResponse>
    /** Готовый обработчик контекстного перевода */
  ): ContextualTranslationHandler;
}
