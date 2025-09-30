/**
 * @module StringifyGenerateResponse
 * Утилита для преобразования ответов генерации в строковый формат.
 * Обеспечивает единообразное представление результатов для отображения в UI.
 */

/**
 * Преобразует ответ генерации в строковый формат.
 * Обрабатывает как простые строковые ответы, так и объекты с индексами для контекстного перевода.
 * Используется в компонентах для унификации отображения результатов генерации.
 * @param generatedResponse - Ответ от модели (строка или объект с индексами).
 * @returns Строковое представление ответа для отображения в UI.
 */
function stringifyGenerateResponse(
  generatedResponse: string | Record<number, string>
): string {
  // Возвращаем строку как есть для простых ответов
  if (typeof generatedResponse === 'string') {
    return generatedResponse;
  }

  // Преобразуем объект с индексами в JSON строку для контекстного перевода
  return JSON.stringify(generatedResponse);
}

export default stringifyGenerateResponse;
