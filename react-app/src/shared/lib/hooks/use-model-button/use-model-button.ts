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

  // Ref для управления таймером анимации
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

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
   * Управляет анимацией кнопки с очисткой предыдущего таймера.
   * Предотвращает накопление таймеров при частых обновлениях.
   */
  const triggerAnimation = useCallback(() => {
    // Очищает предыдущий таймер, если он существует
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }

    setIsAnimating(true);
    animationTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
      animationTimerRef.current = null;
    }, 200);
  }, []);

  /**
   * Проверяет текущее выделение и обновляет состояние кнопки.
   * Используется в периодической проверке для надежного обнаружения выделения.
   */
  const checkSelection = useCallback(() => {
    // Не обновляет состояние, если курсор наведен на кнопку
    if (isHovered) {
      return;
    }

    const selection = window.getSelection();

    // Проверяет только валидность выделения в PDF
    const isValidSelection = selection && isValidPdfSelection(selection);

    if (!isValidSelection) {
      // Скрывает кнопку, если выделение невалидно
      // Использует функциональное обновление
      setButtonState((prevState) => {
        if (prevState.type !== 'hidden') {
          triggerAnimation();
          return { type: 'hidden' };
        }
        return prevState;
      });
      return;
    }

    // Вычисляет позицию кнопки рядом с курсором
    const position = calculateButtonPosition(
      mousePosition.x,
      mousePosition.y,
      positionOffset,
      containerRef
    );

    // Определяет тип кнопки: 'stop' при обработке, иначе 'visible'
    const newType = isProcessing ? 'stop' : 'visible';

    // Использует функциональное обновление для сравнения с актуальным состоянием
    setButtonState((prevState) => {
      const hasTypeChanged = prevState.type !== newType;

      // Если кнопка была скрыта, всегда показываем её при валидном выделении
      if (prevState.type === 'hidden') {
        triggerAnimation();
        return { type: newType, position };
      }

      // Если кнопка видима, проверяет изменение типа или позиции
      const hasPositionChanged =
        prevState.position?.x !== position.x ||
        prevState.position?.y !== position.y;

      if (hasTypeChanged || hasPositionChanged) {
        triggerAnimation();
        return { type: newType, position };
      }

      return prevState;
    });
  }, [
    isProcessing,
    positionOffset,
    mousePosition,
    isHovered,
    containerRef,
    triggerAnimation,
  ]);

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
      // Очищает таймер анимации при размонтировании
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [checkSelection, handleMouseMove]);

  /**
   * Обработчик клика по кнопке использования модели.
   * Вызывает переданный колбэк для запуска использования модели.
   * Сбрасывает состояние наведения, чтобы не блокировать появление кнопки после перевода.
   */
  const handleUseModelClick = useCallback(() => {
    setIsHovered(false);
    onUseModel();
  }, [onUseModel]);

  /**
   * Обработчик клика по кнопке остановки.
   * Вызывает переданный колбэк для остановки использования модели.
   * Сбрасывает состояние наведения, чтобы не блокировать появление кнопки после остановки.
   */
  const handleStopClick = useCallback(() => {
    setIsHovered(false);
    onStop();
  }, [onStop]);

  /**
   * Функция для программного скрытия кнопки.
   * Используется для принудительного скрытия кнопки при необходимости.
   * Также сбрасывает состояние наведения, чтобы не блокировать появление кнопки.
   */
  const hideButton = useCallback(() => {
    setIsHovered(false);
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
    position:
      buttonState.type !== 'hidden' ? buttonState.position : { x: 0, y: 0 },
    /** Флаг анимации для управления CSS переходами */
    isAnimating,
    /** Обработчик наведения курсора на кнопку */
    handleMouseEnter,
    /** Обработчик ухода курсора с кнопки */
    handleMouseLeave,
  };
}

export default useModelButton;
