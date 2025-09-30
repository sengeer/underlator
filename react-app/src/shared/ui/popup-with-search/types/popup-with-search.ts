/**
 * @module PopupWithSearchTypes
 * Типы для компонента PopupWithSearch.
 */

import { PopupProps } from '../../popup/types/popup';

/**
 * Основные пропсы для компонента PopupWithSearch.
 */
export interface PopupWithSearchProps extends Omit<PopupProps, 'children'> {
  /** Контент для отображения в попапе */
  children?: React.ReactNode;
  /** Placeholder для поля поиска */
  searchPlaceholder?: string;
  /** Текущее значение поиска */
  searchValue?: string;
  /** Обработчик изменения значения поиска */
  onSearchChange?: (value: string) => void;
  /** Задержка debounce для поиска в миллисекундах */
  searchDebounceMs?: number;
  /** Горячая клавиша для фокуса на поиске */
  searchHotkey?: string;
  /** Показывать иконку поиска */
  showSearchIcon?: boolean;
  /** Автофокус на поле поиска при открытии */
  searchAutoFocus?: boolean;
  /** Дополнительные CSS классы для поиска */
  searchClassName?: string;
  /** Инлайн стили для поиска */
  searchStyle?: React.CSSProperties;
  /** Состояние отключения поиска */
  searchDisabled?: boolean;
  /** HTML id атрибут для поиска */
  searchId?: string;
  /** HTML name атрибут для поиска */
  searchName?: string;
  /** ARIA метка для доступности поиска */
  searchAriaLabel?: string;
  /** ARIA placeholder для скринридеров */
  searchAriaPlaceholder?: string;
  /** Показывать кнопку очистки поиска */
  showClearButton?: boolean;
  /** Состояние загрузки */
  isLoading?: boolean;
}

/**
 * Ref компонента Search.
 */
export interface PopupWithSearchRef {
  /** Фокусирует на поле поиска */
  focusSearch: () => void;
}
