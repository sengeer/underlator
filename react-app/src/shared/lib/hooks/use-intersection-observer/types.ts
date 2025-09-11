/**
 * @interface IntersectionObserverResult
 * @description Результат работы хука useIntersectionObserver
 * @property {React.RefObject<HTMLDivElement>} ref - Ref для привязки к отслеживаемому элементу
 * @property {boolean} isVisible - Текущее состояние видимости элемента
 * @property {boolean} hasBeenVisible - Был ли элемент когда-либо виден
 * @property {IntersectionObserverEntry | null} intersectionEntry - Информация о пересечении элемента с областью просмотра
 */
export interface IntersectionObserverResult {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  hasBeenVisible: boolean;
  intersectionEntry: IntersectionObserverEntry | null;
}

/**
 * @interface IntersectionObserverConfig
 * @description Конфигурация для хука useIntersectionObserver
 * @property {string} rootMargin - Отступ от корневого элемента в пикселях
 * @property {number} threshold - Порог видимости элемента (0.0 - 1.0)
 * @property {Element | null} root - Корневой элемент для наблюдения
 */
export interface IntersectionObserverConfig extends IntersectionObserverInit {
  rootMargin?: string;
  threshold?: number;
  root?: Element | null;
}
