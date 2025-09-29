/**
 * @module OllamaApi
 * API клиент для работы с Ollama.
 * Предоставляет методы для взаимодействия с Ollama API через HTTP.
 * Поддерживает генерацию текста и обработку streaming ответов.
 */

import { OLLAMA_API_BASE_URL } from '../../../constants';

/**
 * @class OllamaApi
 * Класс для работы с Ollama API.
 * Инкапсулирует HTTP запросы к серверу Ollama.
 * @param baseUrl - Базовый URL сервера Ollama (по умолчанию localhost:11434).
 */
export class OllamaApi {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || OLLAMA_API_BASE_URL;
  }

  /**
   * Генерирует текст через Ollama API.
   * Отправляет POST запрос к /api/generate endpoint.
   * @param model - Название модели для использования.
   * @param prompt - Текст для обработки моделью.
   * @param params - Параметры генерации (think, temperature и т.д.).
   * @param signal - AbortSignal для отмены запроса.
   * @returns Promise с Response объектом для streaming чтения.
   * @throws {Error} При ошибке HTTP запроса или API.
   */
  generatePrompt = async (
    model: string,
    prompt: string,
    params: Params,
    signal?: AbortSignal
  ) => {
    let error = null;

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        think: params.think,
      }),
      signal,
    }).catch((err) => {
      console.error(err);
      if ('detail' in err) {
        error = err.detail;
      }
      return null;
    });

    if (error) {
      throw error;
    }

    return res;
  };
}
