import { useEffect, useRef, useState } from 'react';
import {
  IntersectionObserverConfig,
  IntersectionObserverResult,
} from './types/use-intersection-observer';

/**
 * @description Хук для отслеживания видимости элемента через Intersection Observer
 *
 * Предоставляет реактивный функционал для отслеживания видимости элементов
 * в области просмотра. Автоматически управляет жизненным циклом Observer'а
 * и предоставляет удобные состояния для компонентов.
 *
 * @param config - Конфигурация Intersection Observer
 * @returns Объект с ref, состояниями видимости и информацией о пересечении
 *
 * @example
 * Базовое использование
 * function LazyComponent() {
 *   const { ref, isVisible, hasBeenVisible } = useIntersectionObserver({
 *     threshold: 0.1,
 *     rootMargin: '50px'
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {hasBeenVisible ? <ExpensiveComponent /> : <Placeholder />}
 *     </div>
 *   );
 * }
 *
 * @example
 * С анимацией появления
 * function AnimatedElement() {
 *   const { ref, isVisible } = useIntersectionObserver({
 *     threshold: 0.5,
 *   });
 *
 *   return (
 *     <div
 *       ref={ref}
 *       className={`fade-in ${isVisible ? 'visible' : ''}`}
 *     >
 *       Анимированный контент
 *     </div>
 *   );
 * }
 *
 * @example
 * С обработчиками событий
 * function InfiniteScrollItem() {
 *   const { ref, isVisible, intersectionEntry } = useIntersectionObserver({
 *     rootMargin: '100px',
 *     threshold: 0.1,
 *   });
 *
 *   useEffect(() => {
 *     if (isVisible && intersectionEntry) {
 *       console.log('Элемент появился:', intersectionEntry.boundingClientRect);
 *     }
 *   }, [isVisible, intersectionEntry]);
 *
 *   return <div ref={ref}>Элемент списка</div>;
 * }
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API} Intersection Observer API
 * @see {@link https://reactjs.org/docs/hooks-intro.html} React Hooks
 */
function useIntersectionObserver(
  config: IntersectionObserverConfig = {}
): IntersectionObserverResult {
  // Состояние видимости элемента
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // Состояние «был ли элемент когда-либо виден»
  // Используется для ленивой загрузки - элемент остается загруженным
  const [hasBeenVisible, setHasBeenVisible] = useState<boolean>(false);

  // Информация о пересечении элемента с областью просмотра
  const [intersectionEntry, setIntersectionEntry] =
    useState<IntersectionObserverEntry | null>(null);

  // Ref для привязки к отслеживаемому элементу
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    // Если элемент не найден
    if (!element) {
      return;
    }

    // Создает Intersection Observer с переданной конфигурацией
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        // Сохраняет информацию о пересечении
        setIntersectionEntry(entry);

        // Если элемент пересекается с областью просмотра
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);

          // Отключает наблюдение после первого появления
          observer.unobserve(element);
        } else {
          setIsVisible(false);
        }
      },
      {
        // Порог видимости по умолчанию
        threshold: config.threshold ?? 0.1,

        // Отступ от корневого элемента по умолчанию
        rootMargin: config.rootMargin ?? '0px',

        // Корневой элемент по умолчанию (viewport)
        root: config.root ?? null,

        // Передаем остальные опции из конфигурации
        ...config,
      }
    );

    // Начинает наблюдение за элементом
    observer.observe(element);

    // Очистка при размонтировании компонента
    return () => {
      observer.unobserve(element);
    };
  }, [
    config.threshold,
    config.rootMargin,
    config.root,
    // Включает все опции конфигурации в зависимости
    ...Object.values(config),
  ]);

  return {
    ref: ref as React.RefObject<HTMLDivElement>,
    isVisible,
    hasBeenVisible,
    intersectionEntry,
  };
}

export default useIntersectionObserver;
