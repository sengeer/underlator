/**
 * @interface LazyListItemProps
 * @description Пропсы для компонента LazyListItem
 * @property {React.ReactNode} children - Контент для отображения после загрузки
 * @property {React.ReactNode} placeholder - Placeholder для отображения до загрузки контента
 * @property {string} rootMargin - Отступ от корневого элемента для предзагрузки
 * @property {number} threshold - Порог видимости элемента (0.0 - 1.0)
 * @property {string} className - Дополнительные CSS классы для контейнера
 * @property {React.CSSProperties} style - Дополнительные стили для контейнера
 * @property {string} key - Уникальный ключ для элемента (для React)
 * @property {() => void} onVisible - Обработчик события появления элемента в области просмотра
 * @property {() => void} onHidden - Обработчик события исчезновения элемента из области просмотра
 * @property {boolean} enableAnimation - Включает анимацию появления элемента
 * @property {number} animationDuration - Длительность анимации в миллисекундах
 * @property {number} animationDelay - Задержка анимации в миллисекундах
 * @property {string} animationType - Тип анимации появления
 */
export interface LazyListItemProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
  style?: React.CSSProperties;
  key?: string | number;
  onVisible?: (entry: IntersectionObserverEntry) => void;
  onHidden?: (entry: IntersectionObserverEntry) => void;
  enableAnimation?: boolean;
  animationDuration?: number;
  animationDelay?: number;
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
}

/**
 * @interface LazyListOptions
 * @description Опции для компонента LazyList
 * @property {number} itemHeight - Высота одного элемента в пикселях
 * @property {number} containerHeight - Высота контейнера в пикселях
 * @property {number} overscan - Количество элементов для предзагрузки
 * @property {string} rootMargin - Отступ для предзагрузки в пикселях
 */
export interface LazyListOptions {
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  rootMargin?: string;
}

/**
 * @interface PopupProps
 * @description Пропсы для компонента Popup
 * @property {React.ReactNode} children - Контент для отображения в попапе
 * @property {React.ReactNode} searchComponent - Компонент для отображения поиска
 * @property {boolean} isOpened - Состояние открытия попапа
 * @property {() => void} setOpened - Функция для изменения состояния открытия
 * @property {React.CSSProperties} styleWrapper - Дополнительные стили для обертки попапа
 * @property {boolean} enableLazyLoading - Включает ленивую загрузку для больших списков
 * @property {number} lazyLoadingThreshold - Минимальное количество элементов для активации ленивой загрузки
 * @property {string} lazyLoadingMargin - Отступ для предзагрузки элементов в пикселях
 * @property {number} lazyLoadingVisibilityThreshold - Порог видимости для ленивой загрузки (0.0 - 1.0)
 * @property {boolean} enableAnimation - Включает анимацию появления элементов
 * @property {number} animationDuration - Длительность анимации в миллисекундах
 * @property {number} animationDelay - Задержка анимации в миллисекундах
 * @property {string} animationType - Тип анимации появления
 */
export interface PopupProps {
  children?: React.ReactNode;
  searchComponent?: React.ReactNode;
  isOpened: boolean;
  setOpened: (value: boolean) => void;
  styleWrapper?: React.CSSProperties;
  enableLazyLoading?: boolean;
  lazyLoadingThreshold?: number;
  lazyLoadingMargin?: string;
  lazyLoadingVisibilityThreshold?: number;
  enableAnimation?: boolean;
  animationDuration?: number;
  animationDelay?: number;
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
}
