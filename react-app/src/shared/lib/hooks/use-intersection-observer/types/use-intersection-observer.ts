/**
 * @module UseIntersectionObserverTypes
 * Типы для хука useIntersectionObserver.
 */

/**
 * Интерфейс IntersectionObserverResult.
 * Результат работы хука useIntersectionObserver.
 */
export interface IntersectionObserverResult {
  /** Ref для привязки к отслеживаемому элементу */
  ref: React.RefObject<HTMLDivElement>;
  /** Текущее состояние видимости элемента */
  isVisible: boolean;
  /** Был ли элемент когда-либо виден */
  hasBeenVisible: boolean;
  /** Информация о пересечении элемента с областью просмотра */
  intersectionEntry: IntersectionObserverEntry | null;
}

/**
 * Интерфейс IntersectionObserverConfig.
 * Конфигурация для хука useIntersectionObserver.
 */
export interface IntersectionObserverConfig extends IntersectionObserverInit {
  /** Отступ от корневого элемента в пикселях */
  rootMargin?: string;
  /** Порог видимости элемента (0.0 - 1.0) */
  threshold?: number;
  /** Корневой элемент для наблюдения */
  root?: Element | null;
}
