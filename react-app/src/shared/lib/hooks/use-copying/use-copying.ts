/**
 * @module UseCopying
 * Хук для управления копированием текста в буфер обмена.
 */

import { useState } from 'react';

/**
 * Предоставляет состояние копирования и функцию для выполнения операции копирования с автоматическим сбросом состояния.
 *
 * @returns Объект с состоянием копирования и функцией для копирования текста.
 * @returns {boolean} isCopied - Флаг, указывающий на успешное копирование (true в течение 1500 миллисекунд).
 * @returns {function} handleCopy - Асинхронная функция для копирования текста в буфер обмена.
 */
function useCopying() {
  // Состояние успешного копирования, автоматически сбрасывается через 1.5 секунды
  const [isCopied, setIsCopied] = useState(false);

  /**
   * Выполняет копирование текста в буфер обмена через Clipboard API.
   * При успешном копировании устанавливает флаг isCopied в true на 1500 миллисекунд.
   * Обрабатывает ошибки копирования и логирует их в консоль.
   *
   * @param output - Текст для копирования в буфер обмена.
   * @returns Promise<void> - Промис, который разрешается после завершения операции копирования.
   */
  async function handleCopy(output: string) {
    try {
      // Использование современного Clipboard API для безопасного копирования
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      // Автоматический сброс состояния через 1.5 секунды для UX обратной связи
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      // Логирование ошибок копирования для отладки
      console.error('Failed to copy text', err);
    }
  }

  return {
    isCopied,
    handleCopy,
  };
}

export default useCopying;
