export interface IntersectionObserverResult {
  /**
   * @description Ref для привязки к отслеживаемому элементу
   * @example <div ref={ref}>Отслеживаемый элемент</div>
   */
  ref: React.RefObject<HTMLDivElement>;

  /**
   * @description Текущее состояние видимости элемента
   * @example true - элемент виден в области просмотра
   */
  isVisible: boolean;

  /**
   * @description Был ли элемент когда-либо виден
   * @description Используется для ленивой загрузки - элемент остается загруженным
   * @example true - элемент уже был виден и загружен
   */
  hasBeenVisible: boolean;

  /**
   * @description Информация о пересечении элемента с областью просмотра
   * @description Содержит детальную информацию о состоянии элемента
   */
  intersectionEntry: IntersectionObserverEntry | null;
}

export interface IntersectionObserverConfig extends IntersectionObserverInit {
  /**
   * @description Отступ от корневого элемента в пикселях
   * @default '0px'
   * @example '50px' - загружать элементы за 50px до появления
   */
  rootMargin?: string;

  /**
   * @description Порог видимости элемента (0.0 - 1.0)
   * @default 0.1
   * @example 0.5 - срабатывает когда 50% элемента видно
   */
  threshold?: number;

  /**
   * @description Корневой элемент для наблюдения
   * @default null (viewport)
   */
  root?: Element | null;
}
