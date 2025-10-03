/**
 * @module UseTranslateButton
 * Хук для управления кнопкой перевода выделенного текста.
 * Предоставляет функциональность отображения контекстной кнопки перевода/остановки.
 * Поддерживает валидацию выделения, позиционирование и управление состоянием.
 */

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import { isValidPdfSelection } from '../../utils/pdf-container-validator';
import { DEFAULT_CONFIG } from './constants/use-translate-button';
import {
  UseTranslateButtonConfig,
  TranslateButtonState,
  TranslateButtonPosition,
} from './types/use-translate-button';

/**
 * Вычисляет позицию кнопки относительно выделенного текста.
 * Учитывает смещение контейнера для корректного позиционирования в PDF viewer.
 * @param range - Range объект выделенного текста.
 * @param offset - Смещение позиции кнопки.
 * @param containerRef - Ссылка на контейнер для учета его высоты.
 * @returns Координаты позиции кнопки.
 */
function calculateButtonPosition(
  range: Range,
  offset: { x: number; y: number },
  containerRef: RefObject<HTMLElement | null> | null
): TranslateButtonPosition {
  const rect = range.getBoundingClientRect();

  // Учет высоты контейнера для корректного позиционирования в PDF viewer
  const containerHeight = containerRef?.current
    ? containerRef.current.offsetHeight
    : 0;

  return {
    x: rect.right + window.scrollX + offset.x,
    y: rect.top + window.scrollY - containerHeight + offset.y,
  };
}

/**
 * Получает информацию о текущем выделении текста.
 * Извлекает selection, текст и range для дальнейшей обработки.
 * @returns Объект с информацией о выделении.
 */
function getSelectionInfo() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { selection: null, text: '', range: null };
  }

  const text = selection.toString().trim();
  const range = selection.getRangeAt(0);

  return { selection, text, range };
}

/**
 * Хук для управления кнопкой перевода выделенного текста.
 * Отслеживает выделение текста, валидирует его и управляет отображением кнопки.
 * Поддерживает переключение между состояниями "перевод" и "остановка".
 * @param config - Конфигурация хука с колбэками и параметрами.
 * @returns Объект с состоянием кнопки и обработчиками событий.
 */
function useTranslateButton(config: UseTranslateButtonConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { onTranslate, onStop, isProcessing, positionOffset, containerRef } =
    mergedConfig;

  // Состояние кнопки с алгебраическим типом для типобезопасности
  const [buttonState, setButtonState] = useState<TranslateButtonState>({
    type: 'hidden',
  });

  // Ref для управления таймаутом debounce
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Обработчик изменений выделения текста с валидацией.
   * Использует debounce для предотвращения частых обновлений при быстром выделении.
   * Валидирует выделение через isValidPdfSelection для работы только с PDF контентом.
   */
  const handleSelectionChange = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const { selection, text, range } = getSelectionInfo();

      // Валидация выделения через утилиту для PDF контента
      if (!text || !selection || !range || !isValidPdfSelection(selection)) {
        setButtonState({ type: 'hidden' });
        return;
      }

      const position = calculateButtonPosition(
        range,
        positionOffset,
        containerRef
      );

      // Определение состояния кнопки на основе статуса обработки
      if (isProcessing) {
        setButtonState({ type: 'stop', position });
      } else {
        setButtonState({ type: 'translate', position });
      }
    }, 10);
  }, [isProcessing, positionOffset, containerRef]);

  /**
   * Effect для обработки изменений состояния кнопки на основе статуса обработки.
   * Автоматически переключает тип кнопки между "перевод" и "остановка".
   */
  useEffect(() => {
    if (buttonState.type !== 'hidden') {
      const newType = isProcessing ? 'stop' : 'translate';
      if (buttonState.type !== newType) {
        setButtonState((prev) =>
          prev.type !== 'hidden' ? { ...prev, type: newType } : prev
        );
      }
    }
  }, [isProcessing, buttonState.type]);

  /**
   * Effect для настройки слушателей событий выделения текста.
   * Отслеживает клики и изменения выделения для обновления позиции кнопки.
   * Выполняет очистку при размонтировании для предотвращения утечек памяти.
   */
  useEffect(() => {
    document.addEventListener('click', handleSelectionChange);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('click', handleSelectionChange);
      document.removeEventListener('selectionchange', handleSelectionChange);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleSelectionChange]);

  /**
   * Обработчик клика по кнопке перевода.
   * Вызывает переданный колбэк для запуска процесса перевода.
   */
  const handleTranslateClick = useCallback(() => {
    onTranslate();
  }, [onTranslate]);

  /**
   * Обработчик клика по кнопке остановки.
   * Вызывает переданный колбэк и скрывает кнопку.
   */
  const handleStopClick = useCallback(() => {
    onStop();
    setButtonState({ type: 'hidden' });
  }, [onStop]);

  /**
   * Функция для программного скрытия кнопки.
   * Используется для принудительного скрытия кнопки при необходимости.
   */
  const hideButton = useCallback(() => {
    setButtonState({ type: 'hidden' });
  }, []);

  return {
    /** Текущее состояние кнопки с алгебраическим типом */
    buttonState,
    /** Обработчик клика по кнопке перевода */
    handleTranslateClick,
    /** Обработчик клика по кнопке остановки */
    handleStopClick,
    /** Функция для программного скрытия кнопки */
    hideButton,
    /** Флаг видимости кнопки (упрощенный доступ к состоянию) */
    isVisible: buttonState.type !== 'hidden',
    /** Флаг состояния обработки (упрощенный доступ к состоянию) */
    isProcessing: buttonState.type === 'stop',
    /** Позиция кнопки или null если скрыта */
    position: buttonState.type !== 'hidden' ? buttonState.position : null,
  };
}

export default useTranslateButton;
