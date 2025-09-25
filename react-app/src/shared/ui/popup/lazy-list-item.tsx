import { useState, useEffect, useCallback } from 'react';
import useIntersectionObserver from '../../lib/hooks/use-intersection-observer';
import { LazyListItemProps, LazyListOptions } from './types/popup';

/**
 * @description Компонент для ленивой загрузки элементов списка
 *
 * Реализует ленивую загрузку контента с использованием Intersection Observer API.
 * Элементы загружаются только когда они становятся видимыми в области просмотра,
 * что повышает производительность при работе с большими списками.
 *
 * После загрузки элемент остается в DOM и не перезагружается при повторном
 * появлении в области просмотра, что обеспечивает стабильность состояния.
 *
 * @param props - Свойства компонента
 * @returns JSX элемент с ленивой загрузкой
 *
 * @example
 * Базовое использование
 * <LazyListItem>
 *   <SelectorOption
 *     state='available'
 *     text='Model 1'
 *     onClick={() => console.log('Clicked')}
 *   />
 * </LazyListItem>
 *
 * @example
 * С кастомным placeholder
 * <LazyListItem
 *   placeholder={
 *     <div className='loading-skeleton'>
 *       Загрузка модели...
 *     </div>
 *   }
 *   rootMargin='100px'>
 *   <ComplexModelCard model={model} />
 * </LazyListItem>
 *
 * @example
 * С обработчиками событий
 * <LazyListItem
 *   onVisible={(entry) => analytics.track('model_viewed', { model: entry.target.id })}>
 *   <ModelCard id='model-1' />
 * </LazyListItem>
 *
 * @example
 * В большом списке моделей
 * {models.map((model) => (
 *   <LazyListItem
 *     key={model.id}
 *     rootMargin='50px'
 *     threshold={0.1}
 *     className='model-item'>
 *     <SelectorOption
 *       state='available'
 *       text={model.name}
 *       onClick={() => selectModel(model)}
 *     />
 *   </LazyListItem>
 * ))}
 *
 * @example
 * С анимацией появления
 * <LazyListItem
 *   enableAnimation={true}
 *   animationDuration={500}
 *   animationDelay={100}
 *   animationType='slideUp'>
 *   <SelectorOption
 *     state='available'
 *     text='Animated Model'
 *     onClick={() => console.log('Clicked')}
 *   />
 * </LazyListItem>
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API} Intersection Observer API
 * @see {@link ../hooks/use-intersection-observer} useIntersectionObserver hook
 */
export function LazyListItem({
  children,
  placeholder = <div style={{ height: '40px' }} />,
  rootMargin = '50px',
  threshold = 0.1,
  className = '',
  style,
  onVisible,
  enableAnimation = false,
  animationDuration = 500,
  animationDelay = 0,
  animationType = 'fadeIn',
}: LazyListItemProps): React.JSX.Element {
  // Используется хук для отслеживания видимости элемента
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin,
    threshold: 0.1,
  });

  // Состояния для управления анимацией
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldShowContent, setShouldShowContent] = useState(false);

  // Обработка событий видимости
  useEffect(() => {
    if (hasBeenVisible && onVisible) {
      // Создание фиктивного entry для совместимости с API
      const mockEntry = {
        target: ref.current!,
        isIntersecting: true,
        intersectionRatio: threshold,
        boundingClientRect: ref.current!.getBoundingClientRect(),
        rootBounds: null,
        intersectionRect: ref.current!.getBoundingClientRect(),
        time: Date.now(),
      } as IntersectionObserverEntry;

      onVisible(mockEntry);
    }
  }, [hasBeenVisible, onVisible, ref, threshold]);

  // Управление анимацией
  useEffect(() => {
    if (hasBeenVisible) {
      if (enableAnimation) {
        // Показ контента сразу, но в скрытом состоянии
        setShouldShowContent(true);

        // Запуск анимации с задержкой
        const timer = setTimeout(() => {
          setIsAnimating(true);
        }, animationDelay);

        return () => clearTimeout(timer);
      } else {
        setShouldShowContent(true);
        setIsAnimating(true); // Для совместимости с логикой рендеринга
      }
    }
  }, [hasBeenVisible, enableAnimation, animationDelay]);

  // Генерация CSS стилей для анимации
  const getAnimationStyles = (): React.CSSProperties => {
    if (!enableAnimation || !shouldShowContent) {
      return {};
    }

    const baseTransition = `all ${animationDuration}ms ease-out`;

    // Если анимация еще не началась, установка начальных стилей без transition
    if (!isAnimating) {
      switch (animationType) {
        case 'fadeIn':
          return { opacity: 0 };
        case 'slideUp':
          return { opacity: 0, transform: 'translateY(20px)' };
        case 'slideDown':
          return { opacity: 0, transform: 'translateY(-20px)' };
        case 'scaleIn':
          return { opacity: 0, transform: 'scale(0.95)' };
        default:
          return { opacity: 0 };
      }
    }

    // Когда анимация активна, применение transition и финальных стилей
    switch (animationType) {
      case 'fadeIn':
        return {
          transition: baseTransition,
          opacity: 1,
        };

      case 'slideUp':
        return {
          transition: baseTransition,
          opacity: 1,
          transform: 'translateY(0)',
        };

      case 'slideDown':
        return {
          transition: baseTransition,
          opacity: 1,
          transform: 'translateY(0)',
        };

      case 'scaleIn':
        return {
          transition: baseTransition,
          opacity: 1,
          transform: 'scale(1)',
        };

      default:
        return {
          transition: baseTransition,
          opacity: 1,
        };
    }
  };

  return (
    <div
      ref={ref}
      className={`lazy-list-item ${className}`.trim()}
      style={{
        ...style,
        ...getAnimationStyles(),
      }}>
      {shouldShowContent && (enableAnimation ? isAnimating : true)
        ? children
        : placeholder}
    </div>
  );
}

/**
 * @description Хук для создания оптимизированного списка с ленивой загрузкой
 *
 * Предоставляет удобный интерфейс для создания больших списков с ленивой загрузкой.
 * Автоматически определяет оптимальные параметры для Intersection Observer
 * на основе размера списка и типа контента.
 *
 * @param items - Массив элементов для отображения
 * @param options - Опции конфигурации
 * @returns Объект с компонентами и утилитами для рендеринга списка
 *
 * @example
 * function ModelList({ models }) {
 *   const { LazyList, getOptimizedConfig } = useLazyList(models, {
 *     itemHeight: 40,
 *     containerHeight: 400,
 *     overscan: 5
 *   });
 *
 *   return (
 *     <div className='model-list'>
 *       {models.map((model, index) => (
 *         <LazyList key={model.id} index={index}>
 *           <SelectorOption
 *             state='available'
 *             text={model.name}
 *             onClick={() => selectModel(model)}
 *           />
 *         </LazyList>
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useLazyList<T>(
  items: T[],
  options: LazyListOptions = {}
): {
  LazyList: React.ComponentType<{
    children: React.ReactNode;
    index: number;
  }>;
  getOptimizedConfig: () => IntersectionObserverInit;
  estimatedTotalHeight: number;
} {
  const { itemHeight = 40, containerHeight = 400, overscan = 5 } = options;

  // Вычисляем оптимальную конфигурацию
  const getOptimizedConfig = useCallback((): IntersectionObserverInit => {
    const margin = Math.max(overscan * itemHeight, 50);

    return {
      rootMargin: `${margin}px`,
      threshold: 0.1,
    };
  }, [containerHeight, itemHeight, overscan]);

  // Компонент для ленивой загрузки элемента списка
  const LazyList: React.ComponentType<{
    children: React.ReactNode;
    index: number;
  }> = useCallback(
    ({ children, index }) => {
      const config = getOptimizedConfig();

      return (
        <LazyListItem key={index} rootMargin={config.rootMargin}>
          {children}
        </LazyListItem>
      );
    },
    [getOptimizedConfig]
  );

  const estimatedTotalHeight = items.length * itemHeight;

  return {
    LazyList,
    getOptimizedConfig,
    estimatedTotalHeight,
  };
}
