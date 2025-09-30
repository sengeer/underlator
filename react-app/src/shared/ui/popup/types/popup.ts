/**
 * @module PopupTypes
 * Типы для компонента Popup.
 */

/**
 * Пропсы для компонента LazyListItem.
 */
export interface LazyListItemProps {
  /** Контент для отображения после загрузки */
  children: React.ReactNode;
  /** Placeholder для отображения до загрузки контента */
  placeholder?: React.ReactNode;
  /** Отступ от корневого элемента для предзагрузки */
  rootMargin?: string;
  /** Порог видимости элемента (0.0 - 1.0) */
  threshold?: number;
  /** Дополнительные CSS классы для контейнера */
  className?: string;
  /** Дополнительные стили для контейнера */
  style?: React.CSSProperties;
  /** Уникальный ключ для элемента (для React) */
  key?: string | number;
  /** Обработчик события появления элемента в области просмотра */
  onVisible?: (entry: IntersectionObserverEntry) => void;
  /** Обработчик события исчезновения элемента из области просмотра */
  onHidden?: (entry: IntersectionObserverEntry) => void;
  /** Включает анимацию появления элемента */
  enableAnimation?: boolean;
  /** Длительность анимации в миллисекундах */
  animationDuration?: number;
  /** Задержка анимации в миллисекундах */
  animationDelay?: number;
  /** Тип анимации появления */
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
}

/**
 * Опции для компонента LazyList.
 */
export interface LazyListOptions {
  /** Высота одного элемента в пикселях */
  itemHeight?: number;
  /** Высота контейнера в пикселях */
  containerHeight?: number;
  /** Количество элементов для предзагрузки */
  overscan?: number;
  /** Отступ для предзагрузки в пикселях */
  rootMargin?: string;
}

/**
 * Пропсы для компонента Popup.
 */
export interface PopupProps {
  /** Контент для отображения в попапе */
  children?: React.ReactNode;
  /** Компонент для отображения поиска */
  searchComponent?: React.ReactNode;
  /** Состояние открытия попапа */
  isOpened: boolean;
  /** Функция для изменения состояния открытия */
  setOpened: (value: boolean) => void;
  /** Дополнительные стили для обертки попапа */
  styleWrapper?: React.CSSProperties;
  /** Включает ленивую загрузку для больших списков */
  enableLazyLoading?: boolean;
  /** Минимальное количество элементов для активации ленивой загрузки */
  lazyLoadingThreshold?: number;
  /** Отступ для предзагрузки элементов в пикселях */
  lazyLoadingMargin?: string;
  /** Порог видимости для ленивой загрузки (0.0 - 1.0) */
  lazyLoadingVisibilityThreshold?: number;
  /** Включает анимацию появления элементов */
  enableAnimation?: boolean;
  /** Длительность анимации в миллисекундах */
  animationDuration?: number;
  /** Задержка анимации в миллисекундах */
  animationDelay?: number;
  /** Тип анимации появления */
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
}
