export interface LazyListItemProps {
  /**
   * @description Контент для отображения после загрузки
   * @example <SelectorOption state="available" text="Model 1" />
   */
  children: React.ReactNode;

  /**
   * @description Placeholder для отображения до загрузки контента
   * @default <div style={{ height: '40px' }} />
   * @example <div className="loading-skeleton">Загрузка...</div>
   */
  placeholder?: React.ReactNode;

  /**
   * @description Отступ от корневого элемента для предзагрузки
   * @default '50px'
   * @example '100px' - загружать элементы за 100px до появления
   */
  rootMargin?: string;

  /**
   * @description Порог видимости элемента (0.0 - 1.0)
   * @default 0.1
   * @example 0.5 - загружать когда 50% элемента видно
   */
  threshold?: number;

  /**
   * @description Дополнительные CSS классы для контейнера
   * @example 'lazy-item custom-class'
   */
  className?: string;

  /**
   * @description Дополнительные стили для контейнера
   * @example {{ marginBottom: '8px' }}
   */
  style?: React.CSSProperties;

  /**
   * @description Уникальный ключ для элемента (для React)
   * @example 'model-1'
   */
  key?: string | number;

  /**
   * @description Обработчик события появления элемента в области просмотра
   * @example (entry) => console.log('Элемент появился:', entry)
   */
  onVisible?: (entry: IntersectionObserverEntry) => void;

  /**
   * @description Обработчик события исчезновения элемента из области просмотра
   * @example (entry) => console.log('Элемент исчез:', entry)
   */
  onHidden?: (entry: IntersectionObserverEntry) => void;

  /**
   * @description Включает анимацию появления элемента
   * @default false
   * @example true - элемент будет плавно появляться
   */
  enableAnimation?: boolean;

  /**
   * @description Длительность анимации в миллисекундах
   * @default 500
   * @example 300 - анимация займет 300ms
   */
  animationDuration?: number;

  /**
   * @description Задержка анимации в миллисекундах
   * @default 0
   * @example 100 - анимация начнется через 100ms
   */
  animationDelay?: number;

  /**
   * @description Тип анимации появления
   * @default 'fadeIn'
   * @example 'slideUp' - элемент появится снизу вверх
   */
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
}

export interface LazyListItemAnimatedProps extends LazyListItemProps {
  /**
   * @description Задержка анимации в миллисекундах
   * @default 0
   * @example 100 - анимация начнется через 100ms
   */
  animationDelay?: number;

  /**
   * @description CSS класс для видимого состояния
   * @default 'visible'
   * @example 'fade-in-visible'
   */
  visibleClassName?: string;

  /**
   * @description CSS класс для скрытого состояния
   * @default 'hidden'
   * @example 'fade-in-hidden'
   */
  hiddenClassName?: string;
}

export interface LazyListOptions {
  /**
   * @description Высота одного элемента в пикселях
   * @default 40
   */
  itemHeight?: number;

  /**
   * @description Высота контейнера в пикселях
   * @default 400
   */
  containerHeight?: number;

  /**
   * @description Количество элементов для предзагрузки
   * @default 5
   */
  overscan?: number;

  /**
   * @description Отступ для предзагрузки в пикселях
   * @default '50px'
   */
  rootMargin?: string;
}

export interface PopupProps {
  /**
   * @description Контент для отображения в попапе
   * @example <div>Содержимое попапа</div>
   */
  children?: React.ReactNode;

  /**
   * @description Компонент для отображения поиска
   * @example <Search />
   */
  searchComponent?: React.ReactNode;

  /**
   * @description Состояние открытия попапа
   * @example true - попап открыт
   */
  isOpened: boolean;

  /**
   * @description Функция для изменения состояния открытия
   * @example (opened) => setOpened(opened)
   */
  setOpened: (value: boolean) => void;

  /**
   * @description Дополнительные стили для обертки попапа
   * @example {{ minWidth: '30%', maxHeight: '80vh' }}
   */
  styleWrapper?: React.CSSProperties;

  /**
   * @description Включает ленивую загрузку для больших списков
   * @default false
   * @example true - активирует ленивую загрузку
   */
  enableLazyLoading?: boolean;

  /**
   * @description Минимальное количество элементов для активации ленивой загрузки
   * @default 20
   * @example 50 - ленивая загрузка активируется при 50+ элементах
   */
  lazyLoadingThreshold?: number;

  /**
   * @description Отступ для предзагрузки элементов в пикселях
   * @default '50px'
   * @example '100px' - элементы загружаются за 100px до появления
   */
  lazyLoadingMargin?: string;

  /**
   * @description Порог видимости для ленивой загрузки (0.0 - 1.0)
   * @default 0.1
   * @example 0.3 - элементы загружаются когда 30% видно
   */
  lazyLoadingVisibilityThreshold?: number;

  /**
   * @description Включает анимацию появления элементов
   * @default false
   * @example true - элементы будут плавно появляться
   */
  enableAnimation?: boolean;

  /**
   * @description Длительность анимации в миллисекундах
   * @default 500
   * @example 300 - анимация займет 300ms
   */
  animationDuration?: number;

  /**
   * @description Задержка анимации в миллисекундах
   * @default 0
   * @example 100 - анимация начнется через 100ms
   */
  animationDelay?: number;

  /**
   * @description Тип анимации появления
   * @default 'fadeIn'
   * @example 'slideUp' - элементы появятся снизу вверх
   */
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
}
