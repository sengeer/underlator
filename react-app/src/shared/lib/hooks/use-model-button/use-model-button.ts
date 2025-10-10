/**
 * @module UseModelButton
 * Хук для управления кнопкой использования модели.
 * Предоставляет функциональность отображения контекстной кнопки.
 */

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import { isValidPdfSelection } from '../../utils/pdf-container-validator';
import { DEFAULT_CONFIG } from './constants/use-model-button';
import {
  UseModelButtonConfig,
  ModelButtonState,
  ModelButtonPosition,
} from './types/use-model-button';

/**
 * Вычисляет позицию кнопки рядом с курсором пользователя.
 * Использует координаты мыши для более удобного позиционирования.
 *
 * @param mouseX - Координата X мыши.
 * @param mouseY - Координата Y мыши.
 * @param offset - Смещение позиции кнопки.
 * @param containerRef - Ссылка на контейнер для учета его высоты.
 * @returns Координаты позиции кнопки.
 */
function calculateButtonPosition(
  mouseX: number,
  mouseY: number,
  offset: { x: number; y: number },
  containerRef: RefObject<HTMLElement | null> | null
): ModelButtonPosition {
  // Учет высоты контейнера для корректного позиционирования в PDF viewer
  const containerHeight = containerRef?.current
    ? containerRef.current.offsetHeight
    : 0;

  return {
    x: mouseX + window.scrollX + offset.x,
    y: mouseY + window.scrollY + offset.y - containerHeight,
  };
}

/**
 * Получает информацию о текущем выделении текста и координаты мыши.
 * Извлекает selection, текст, range и последние координаты мыши.
 *
 * @param mouseX - Координата X мыши.
 * @param mouseY - Координата Y мыши.
 * @returns Объект с информацией о выделении и координатах мыши.
 */
function getSelectionInfo(mouseX: number, mouseY: number) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { selection: null, text: '', range: null, mouseX, mouseY };
  }

  const text = selection.toString().trim();
  const range = selection.getRangeAt(0);

  return { selection, text, range, mouseX, mouseY };
}

/**
 * Хук для управления контекстной кнопкой использования модели.
 * Отслеживает выделение текста, валидирует его и управляет отображением кнопки.
 *
 * @param config - Конфигурация хука с колбэками и параметрами.
 * @returns Объект с состоянием кнопки и обработчиками событий.
 */
function useModelButton(config: UseModelButtonConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { onUseModel, onStop, isProcessing, positionOffset, containerRef } =
    mergedConfig;

  // Состояние кнопки с алгебраическим типом для типобезопасности
  const [buttonState, setButtonState] = useState<ModelButtonState>({
    type: 'hidden',
  });

  // Состояние для отслеживания координат мыши
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Состояние для управления анимацией
  const [isAnimating, setIsAnimating] = useState(false);

  // Ref для управления интервалом проверки
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Состояние для отслеживания наведения курсора на кнопку
  const [isHovered, setIsHovered] = useState(false);

  /**
   * Обработчик наведения курсора на кнопку.
   */
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  /**
   * Обработчик ухода курсора с кнопки.
   */
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  /**
   * Проверяет текущее выделение и обновляет состояние кнопки.
   * Используется в периодической проверке для надежного обнаружения выделения.
   */
  const checkSelection = useCallback(() => {
    if (isHovered) {
      return;
    }

    const { selection, text, range, mouseX, mouseY } = getSelectionInfo(
      mousePosition.x,
      mousePosition.y
    );

    // Если есть выделенный текст и это PDF контент - показывает кнопку
    if (!text || !selection || !range || !isValidPdfSelection(selection)) {
      if (buttonState.type !== 'hidden') {
        setIsAnimating(true);
        setButtonState({ type: 'hidden' });
        setTimeout(() => setIsAnimating(false), 200);
      }
      return;
    }

    const position = calculateButtonPosition(
      mouseX,
      mouseY,
      positionOffset,
      containerRef
    );

    // Определение состояния кнопки на основе статуса обработки
    const newType = isProcessing ? 'stop' : 'visible';

    if (
      buttonState.type !== newType ||
      // @ts-ignore
      (buttonState.type !== 'hidden' &&
        (buttonState.position?.x !== position.x ||
          buttonState.position?.y !== position.y))
    ) {
      setIsAnimating(true);
      setButtonState({ type: newType as 'visible' | 'stop', position });
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [isProcessing, positionOffset, mousePosition, buttonState]);

  /**
   * Обработчик движения мыши для отслеживания координат курсора.
   * Обновляет позицию мыши для корректного позиционирования кнопки.
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  /**
   * Effect для настройки периодической проверки выделения и отслеживания мыши.
   * Использует интервал для надежного обнаружения выделения независимо от способа выделения.
   */
  useEffect(() => {
    // Настраивает периодическую проверку выделения
    intervalRef.current = setInterval(checkSelection, 150);

    // Отслеживает движение мыши для позиционирования
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [checkSelection, handleMouseMove]);

  /**
   * Обработчик клика по кнопке использования модели.
   * Вызывает переданный колбэк для запуска использования модели.
   */
  const handleUseModelClick = useCallback(() => {
    onUseModel();
  }, [onUseModel]);

  /**
   * Обработчик клика по кнопке остановки.
   * Вызывает переданный колбэк для остановки использования модели.
   */
  const handleStopClick = useCallback(() => {
    onStop();
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
    /** Обработчик клика по кнопке */
    handleUseModelClick,
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
    /** Флаг анимации для управления CSS переходами */
    isAnimating,
    /** Обработчик наведения курсора на кнопку */
    handleMouseEnter,
    /** Обработчик ухода курсора с кнопки */
    handleMouseLeave,
  };
}

export default useModelButton;
