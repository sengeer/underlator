import { PopupProps } from '../../popup/types/popup';

/**
 * @interface PopupWithSearchProps
 * @description Основные пропсы для компонента PopupWithSearch
 * @property {React.ReactNode} [children] - Контент для отображения в попапе
 * @property {string} [searchPlaceholder] - Placeholder для поля поиска
 * @property {string} [searchValue] - Текущее значение поиска
 * @property {(value: string) => void} [onSearchChange] - Обработчик изменения значения поиска
 * @property {number} [searchDebounceMs] - Задержка debounce для поиска в миллисекундах
 * @property {string} [searchHotkey] - Горячая клавиша для фокуса на поиске
 * @property {boolean} [showSearchIcon] - Показывать иконку поиска
 * @property {boolean} [searchAutoFocus] - Автофокус на поле поиска при открытии
 * @property {string} [searchClassName] - Дополнительные CSS классы для поиска
 * @property {React.CSSProperties} [searchStyle] - Инлайн стили для поиска
 * @property {boolean} [searchDisabled] - Состояние отключения поиска
 * @property {string} [searchId] - HTML id атрибут для поиска
 * @property {string} [searchName] - HTML name атрибут для поиска
 * @property {string} [searchAriaLabel] - ARIA метка для доступности поиска
 * @property {string} [searchAriaPlaceholder] - ARIA placeholder для скринридеров
 * @property {boolean} [showClearButton] - Показывать кнопку очистки поиска
 * @property {React.ReactNode} [searchContent] - Контент для отображения под поиском
 * @property {string} [searchWrapperClassName] - CSS классы для обертки поиска
 * @property {React.CSSProperties} [searchWrapperStyle] - Стили для обертки поиска
 * @property {boolean} [isLoading] - Состояние загрузки
 */
export interface PopupWithSearchProps extends Omit<PopupProps, 'children'> {
  children?: React.ReactNode;

  // Свойства поиска
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchDebounceMs?: number;
  searchHotkey?: string;
  showSearchIcon?: boolean;
  searchAutoFocus?: boolean;
  searchClassName?: string;
  searchStyle?: React.CSSProperties;
  searchDisabled?: boolean;
  searchId?: string;
  searchName?: string;
  searchAriaLabel?: string;
  searchAriaPlaceholder?: string;
  showClearButton?: boolean;
  isLoading?: boolean;
}

/**
 * @interface PopupWithSearchRef
 * @description Ref компонента Search
 * @property {() => void} focusSearch - Фокусирует на поле поиска
 */
export interface PopupWithSearchRef {
  focusSearch: () => void;
}
