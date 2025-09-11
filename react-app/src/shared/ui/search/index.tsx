import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import SearchIcon from '../../assets/icons/search-icon';
import IconButton from '../icon-button';
import { SearchProps, SearchRef, SearchState, HotkeyConfig } from './types';
import './index.scss';

/**
 * @component Search
 * @description Переиспользуемый компонент поиска с поддержкой debounce, горячих клавиш и кастомных стилей
 *
 * Особенности реализации:
 * - Debounce для оптимизации производительности при вводе
 * - Поддержка горячих клавиш для быстрого доступа
 * - Кнопка поиска которая фокусирует на поле ввода
 * - Полная поддержка accessibility (ARIA)
 * - Автофокус и программное управление
 *
 * @param {SearchProps} props - Пропсы компонента
 * @returns {JSX.Element} React элемент компонента поиска
 *
 * @example
 * Базовое использование
 * <Search
 *   placeholder="Поиск моделей..."
 *   onChange={(value) => console.log(value)}
 * />
 *
 * @example
 * С debounce и горячей клавишей
 * <Search
 *   placeholder="Поиск..."
 *   debounceMs={300}
 *   hotkey="Ctrl+k"
 *   onChange={(value) => handleSearch(value)}
 * />
 */
const Search = forwardRef<SearchRef, SearchProps>(
  (
    {
      placeholder = 'Поиск...',
      value = '',
      onChange,
      className = '',
      style,
      disabled = false,
      autoFocus = false,
      debounceMs = 300,
      hotkey,
      showSearchIcon = true,
      id,
      name,
      ariaLabel,
      ariaPlaceholder,
    },
    ref
  ) => {
    // Внутреннее состояние компонента
    const [state, setState] = useState<SearchState>({
      inputValue: value,
      isFocused: false,
      isDebouncing: false,
    });

    // Refs для управления DOM элементами
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimeoutRef = useRef<number | null>(null);
    const prevValueRef = useRef(value);

    /**
     * @function parseHotkey
     * @description Парсит строку горячей клавиши в объект конфигурации
     * @param {string} hotkeyString - Строка горячей клавиши (например, "Ctrl+k")
     * @returns {HotkeyConfig} Объект конфигурации горячей клавиши
     */
    const parseHotkey = useCallback((hotkeyString: string): HotkeyConfig => {
      const parts = hotkeyString
        .toLowerCase()
        .split('+')
        .map((part) => part.trim());
      const config: HotkeyConfig = { key: '' };

      parts.forEach((part) => {
        switch (part) {
          case 'ctrl':
            config.ctrl = true;
            break;
          case 'alt':
            config.alt = true;
            break;
          case 'shift':
            config.shift = true;
            break;
          case 'meta':
          case 'cmd':
            config.meta = true;
            break;
          default:
            config.key = part;
        }
      });

      return config;
    }, []);

    /**
     * @function handleHotkey
     * @description Обработчик горячих клавиш для фокуса на поле поиска
     * @param {KeyboardEvent} event - Событие клавиатуры
     */
    const handleHotkey = useCallback(
      (event: KeyboardEvent) => {
        if (!hotkey || disabled) return;

        const config = parseHotkey(hotkey);
        const isKeyMatch = event.key.toLowerCase() === config.key;
        const isCtrlMatch = !!config.ctrl === event.ctrlKey;
        const isAltMatch = !!config.alt === event.altKey;
        const isShiftMatch = !!config.shift === event.shiftKey;
        const isMetaMatch = !!config.meta === event.metaKey;

        if (
          isKeyMatch &&
          isCtrlMatch &&
          isAltMatch &&
          isShiftMatch &&
          isMetaMatch
        ) {
          event.preventDefault();
          inputRef.current?.focus();
        }
      },
      [hotkey, disabled, parseHotkey]
    );

    /**
     * @function debouncedOnChange
     * @description Debounced версия onChange для оптимизации производительности
     * @param {string} newValue - Новое значение поиска
     */
    const debouncedOnChange = useCallback(
      (newValue: string) => {
        // Очищаем предыдущий таймер
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // Устанавливаем состояние debouncing
        setState((prev) => ({ ...prev, isDebouncing: true }));

        // Создаем новый таймер
        debounceTimeoutRef.current = window.setTimeout(() => {
          onChange?.(newValue);
          setState((prev) => ({ ...prev, isDebouncing: false }));
        }, debounceMs);
      },
      [onChange, debounceMs]
    );

    /**
     * @function handleInputChange
     * @description Обработчик изменения значения в поле ввода
     * @param {React.ChangeEvent<HTMLInputElement>} event - Событие изменения
     */
    const handleInputChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;

        setState((prev) => ({ ...prev, inputValue: newValue }));
        debouncedOnChange(newValue);
      },
      [debouncedOnChange]
    );

    /**
     * @function handleFocus
     * @description Обработчик фокуса на поле ввода
     */
    const handleFocus = useCallback(() => {
      setState((prev) => ({ ...prev, isFocused: true }));
    }, []);

    /**
     * @function handleBlur
     * @description Обработчик потери фокуса с поля ввода
     */
    const handleBlur = useCallback(() => {
      setState((prev) => ({ ...prev, isFocused: false }));
    }, []);

    /**
     * @function handleClear
     * @description Обработчик очистки поля поиска
     */
    const handleClear = useCallback(() => {
      setState((prev) => ({ ...prev, inputValue: '' }));
      onChange?.('');

      // Очищаем debounce таймер при ручной очистке
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        setState((prev) => ({ ...prev, isDebouncing: false }));
      }

      inputRef.current?.focus();
    }, [onChange]);

    /**
     * @function handleKeyDown
     * @description Обработчик нажатий клавиш для дополнительной функциональности
     * @param {React.KeyboardEvent<HTMLInputElement>} event - Событие клавиатуры
     */
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        // Delete для очистки поля
        if (event.key === 'Delete' && state.inputValue) {
          handleClear();
        }
      },
      [state.inputValue, handleClear]
    );

    // Imperative API для программного управления компонентом
    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        clear: handleClear,
        getValue: () => state.inputValue,
        setValue: (newValue: string) => {
          setState((prev) => ({ ...prev, inputValue: newValue }));
          onChange?.(newValue);
        },
      }),
      [state.inputValue, handleClear, onChange]
    );

    // Синхронизация внешнего value с внутренним состоянием
    useEffect(() => {
      // Обновляет только если внешнее значение действительно изменилось
      if (value !== prevValueRef.current) {
        prevValueRef.current = value;
        setState((prev) => ({ ...prev, inputValue: value }));
      }
    }, [value]);

    // Установка автофокуса
    useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }, [autoFocus]);

    // Подписка на глобальные горячие клавиши
    useEffect(() => {
      if (hotkey) {
        document.addEventListener('keydown', handleHotkey);
        return () => document.removeEventListener('keydown', handleHotkey);
      }
    }, [hotkey, handleHotkey]);

    // Очистка таймеров при размонтировании
    useEffect(() => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }, []);

    // Формирование CSS классов
    const searchClasses = [
      'search',
      state.isFocused && 'search_focused',
      disabled && 'search_disabled',
      state.isDebouncing && 'search_debouncing',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={searchClasses} style={style}>
        {/* Кнопка поиска */}
        {showSearchIcon && (
          <IconButton onClick={() => inputRef.current?.focus()}>
            <SearchIcon color='var(--main)' />
          </IconButton>
        )}

        {/* Поле ввода */}
        <input
          ref={inputRef}
          type='text'
          id={id}
          name={name}
          className='search__input'
          placeholder={placeholder}
          value={state.inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel || placeholder}
          aria-placeholder={ariaPlaceholder || placeholder}
          autoComplete='off'
          spellCheck='false'
        />

        {/* Индикатор debounce */}
        {state.isDebouncing && (
          <div className='search__debounce-indicator' aria-hidden='true'>
            <div className='search__debounce-dot' />
          </div>
        )}
      </div>
    );
  }
);

Search.displayName = 'Search';

export default Search;
