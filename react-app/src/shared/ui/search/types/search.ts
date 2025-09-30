/**
 * @module SearchTypes
 * Типы для Search.
 */

/**
 * Основные пропсы для компонента Search.
 */
export interface SearchProps {
  /** Текст placeholder для поля ввода */
  placeholder?: string;
  /** Текущее значение поиска */
  value?: string;
  /** Обработчик изменения значения поиска */
  onChange?: (value: string) => void;
  /** Дополнительные CSS классы */
  className?: string;
  /** Инлайн стили */
  style?: React.CSSProperties;
  /** Состояние отключения компонента */
  disabled?: boolean;
  /** Автофокус при монтировании */
  autoFocus?: boolean;
  /** Задержка debounce в миллисекундах */
  debounceMs?: number;
  /** Горячая клавиша для фокуса (например, 'Ctrl+k') */
  hotkey?: string;
  /** Показывать кнопку очистки */
  showClearButton?: boolean;
  /** Показывать иконку поиска */
  showSearchIcon?: boolean;
  /** HTML id атрибут */
  id?: string;
  /** HTML name атрибут */
  name?: string;
  /** ARIA метка для доступности */
  ariaLabel?: string;
  /** ARIA placeholder для скринридеров */
  ariaPlaceholder?: string;
}

/**
 * Внутреннее состояние компонента Search.
 */
export interface SearchState {
  /** Текущее значение в поле ввода */
  inputValue: string;
  /** Состояние фокуса */
  isFocused: boolean;
  /** Состояние debounce процесса */
  isDebouncing: boolean;
}

/**
 * Конфигурация для горячих клавиш.
 */
export interface HotkeyConfig {
  /** Клавиша (например, 'k') */
  key: string;
  ctrl?: boolean;
  /** Требуется ли Alt */
  alt?: boolean;
  /** Требуется ли Shift */
  shift?: boolean;
  /** Требуется ли Meta (Cmd на Mac) */
  meta?: boolean;
}

/**
 * Ref для компонента Search.
 * Предоставляет методы для программного управления компонентом.
 */
export interface SearchRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
}
