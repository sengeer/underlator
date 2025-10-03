/**
 * @module UseWindowSize
 * Хук для отслеживания размеров окна браузера.
 * Предоставляет текущие значения ширины и высоты окна с автоматическим обновлением при изменении размеров.
 */

import { useEffect, useState } from 'react';
import { WindowSize } from './types/use-window-size';

/**
 * Хук для отслеживания размеров окна браузера.
 *
 * Предоставляет реактивные значения ширины и высоты окна, которые автоматически
 * обновляются при изменении размеров окна. Используется для адаптивного дизайна,
 * условного рендеринга компонентов и создания отзывчивых интерфейсов.
 *
 * Хук подписывается на событие 'resize' окна браузера и автоматически
 * обновляет состояние при изменении размеров. При размонтировании компонента
 * подписка автоматически удаляется для предотвращения утечек памяти.
 *
 * @returns Объект с актуальными размерами окна { width, height }.
 *
 * @example
 * // Базовое использование для адаптивного дизайна
 * function ResponsiveComponent() {
 *   const { width, height } = useWindowSize();
 *
 *   return (
 *     <div>
 *       <p>Ширина: {width}px</p>
 *       <p>Высота: {height}px</p>
 *     </div>
 *   );
 * }
 *
 * @example
 * // Использование для условного рендеринга
 * function AdaptiveButton() {
 *   const { width } = useWindowSize();
 *   const isMobile = width <= 768;
 *
 *   return isMobile ? (
 *     <IconButton icon={<MenuIcon />} />
 *   ) : (
 *     <TextButton text="Меню" />
 *   );
 * }
 *
 * @example
 * // Использование в HOC для адаптивных размеров
 * function WithAdaptiveSize({ WrappedComponent }) {
 *   const { width } = useWindowSize();
 *   const size = width <= 768 ? 'S' : width <= 1024 ? 'M' : 'L';
 *
 *   return <WrappedComponent size={size} />;
 * }
 */
function useWindowSize(): WindowSize {
  // Состояние с текущими размерами окна
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  /**
   * Обработчик изменения размеров окна.
   * Обновляет состояние с новыми значениями ширины и высоты.
   */
  function changeWindowSize(): void {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }

  // Подписка на события изменения размеров окна
  useEffect(() => {
    // Добавление слушателя события resize
    window.addEventListener('resize', changeWindowSize);

    // Очистка слушателя при размонтировании компонента
    return () => {
      window.removeEventListener('resize', changeWindowSize);
    };
  }, []);

  return windowSize;
}

export default useWindowSize;
