/**
 * @module SearchTypes
 * @description Типы и интерфейсы для компонента Search
 * Определяет контракты для поискового компонента с поддержкой debounce, стилей и горячих клавиш
 */

/**
 * @interface SearchProps
 * @description Основные пропсы для компонента Search
 * @property {string} [placeholder] - Текст placeholder для поля ввода
 * @property {string} [value] - Текущее значение поиска
 * @property {(value: string) => void} [onChange] - Обработчик изменения значения поиска
 * @property {string} [className] - Дополнительные CSS классы
 * @property {React.CSSProperties} [style] - Инлайн стили
 * @property {boolean} [disabled] - Состояние отключения компонента
 * @property {boolean} [autoFocus] - Автофокус при монтировании
 * @property {number} [debounceMs] - Задержка debounce в миллисекундах
 * @property {string} [hotkey] - Горячая клавиша для фокуса (например, 'Ctrl+k')
 * @property {boolean} [showClearButton] - Показывать кнопку очистки
 * @property {boolean} [showSearchIcon] - Показывать иконку поиска
 * @property {string} [id] - HTML id атрибут
 * @property {string} [name] - HTML name атрибут
 * @property {string} [ariaLabel] - ARIA метка для доступности
 * @property {string} [ariaPlaceholder] - ARIA placeholder для скринридеров
 */
export interface SearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  autoFocus?: boolean;
  debounceMs?: number;
  hotkey?: string;
  showClearButton?: boolean;
  showSearchIcon?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  ariaPlaceholder?: string;
}

/**
 * @interface SearchState
 * @description Внутреннее состояние компонента Search
 * @property {string} inputValue - Текущее значение в поле ввода
 * @property {boolean} isFocused - Состояние фокуса
 * @property {boolean} isDebouncing - Состояние debounce процесса
 */
export interface SearchState {
  inputValue: string;
  isFocused: boolean;
  isDebouncing: boolean;
}

/**
 * @interface DebounceConfig
 * @description Конфигурация для debounce функциональности
 * @property {number} delay - Задержка в миллисекундах
 * @property {boolean} leading - Выполнять функцию в начале интервала
 * @property {boolean} trailing - Выполнять функцию в конце интервала
 */
export interface DebounceConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * @interface HotkeyConfig
 * @description Конфигурация для горячих клавиш
 * @property {string} key - Клавиша (например, 'k')
 * @property {boolean} [ctrl] - Требуется ли Ctrl
 * @property {boolean} [alt] - Требуется ли Alt
 * @property {boolean} [shift] - Требуется ли Shift
 * @property {boolean} [meta] - Требуется ли Meta (Cmd на Mac)
 */
export interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * @type SearchRef
 * @description Ref для компонента Search
 * Предоставляет методы для программного управления компонентом
 */
export interface SearchRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
}

/**
 * @type SearchSize
 * @description Размеры компонента Search
 */
export type SearchSize = 'small' | 'medium' | 'large';

/**
 * @type SearchVariant
 * @description Варианты стилизации компонента Search
 */
export type SearchVariant = 'default' | 'minimal' | 'outlined';
