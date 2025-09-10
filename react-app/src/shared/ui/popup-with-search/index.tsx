import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import Popup from '../popup';
import Search from '../search';
import type { SearchRef } from '../search/types';
import { PopupWithSearchProps, PopupWithSearchRef } from './types';

/**
 * @component PopupWithSearch
 * @description Модальное окно с интегрированным поиском
 *
 * Расширяет базовый Popup компонент по принципу LSP (Liskov Substitution Principle),
 * добавляя функциональность поиска без нарушения существующего API.
 *
 * Особенности реализации:
 * - Полная совместимость с базовым Popup компонентом
 * - Интегрированный компонент Search с поддержкой debounce
 * - Поддержка горячих клавиш для быстрого доступа к поиску
 * - Автофокус на поле поиска при открытии модального окна
 * - Программное управление через ref API
 * - Сохранение всех возможностей базового Popup (ленивая загрузка, анимации)
 *
 * @param {PopupWithSearchProps} props - Пропсы компонента
 * @returns {JSX.Element} React элемент модального окна с поиском
 *
 * @example
 * // Базовое использование
 * <PopupWithSearch
 *   isOpened={isOpen}
 *   setOpened={setOpen}
 *   searchPlaceholder='Поиск моделей...'
 *   onSearchChange={(value) => console.log(value)}
 * >
 *   <div>Контент под поиском</div>
 * </PopupWithSearch>
 *
 * @example
 * // С ленивой загрузкой и анимациями
 * <PopupWithSearch
 *   isOpened={isOpen}
 *   setOpened={setOpen}
 *   enableLazyLoading
 *   lazyLoadingThreshold={20}
 *   enableAnimation
 *   animationType='slideUp'
 *   searchPlaceholder='Поиск...'
 *   searchDebounceMs={300}
 *   searchHotkey='Ctrl+k'
 *   onSearchChange={handleSearch}
 * >
 *   {models.map(model => (
 *     <SelectorOption key={model.id} {...model} />
 *   ))}
 * </PopupWithSearch>
 *
 * @example
 * // С программным управлением через ref
 * const popupRef = useRef<PopupWithSearchRef>(null);
 *
 * <PopupWithSearch
 *   ref={popupRef}
 *   isOpened={isOpen}
 *   setOpened={setOpen}
 *   searchPlaceholder='Поиск...'
 *   onSearchChange={handleSearch}
 * >
 *   <div>Контент</div>
 * </PopupWithSearch>
 *
 * // Программное управление
 * popupRef.current?.focusSearch();
 * popupRef.current?.clearSearch();
 */

const PopupWithSearch = forwardRef<PopupWithSearchRef, PopupWithSearchProps>(
  (
    {
      children,
      // Свойства поиска
      searchPlaceholder = 'Поиск...',
      searchValue = '',
      onSearchChange,
      searchDebounceMs = 300,
      searchHotkey,
      showSearchIcon = true,
      searchAutoFocus = true,
      searchClassName = '',
      searchStyle,
      searchDisabled = false,
      searchId,
      searchName,
      searchAriaLabel,
      searchAriaPlaceholder,
      showClearButton = true,
      // Контент под поиском
      searchContent,
      searchWrapperClassName = '',
      searchWrapperStyle,
      // Остальные пропсы
      ...popupProps
    },
    ref
  ) => {
    // Refs для управления DOM элементами
    const searchRef = useRef<SearchRef>(null);

    /**
     * @function focusSearch
     * @description Фокусирует на поле поиска
     */
    const focusSearch = useCallback(() => {
      searchRef.current?.focus();
    }, []);

    // Imperative API для программного управления компонентом
    useImperativeHandle(
      ref,
      () => ({
        focusSearch,
      }),
      [focusSearch]
    );

    // Автофокус на поле поиска при открытии модального окна
    useEffect(() => {
      if (popupProps.isOpened && searchAutoFocus) {
        // Небольшая задержка для корректного фокуса после анимации открытия
        const timer = setTimeout(() => {
          searchRef.current?.focus();
        }, 100);

        return () => clearTimeout(timer);
      }
    }, [popupProps.isOpened, searchAutoFocus]);

    return (
      <Popup
        searchComponent={
          <Search
            ref={searchRef}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
            className={searchClassName}
            style={searchStyle}
            disabled={searchDisabled}
            debounceMs={searchDebounceMs}
            hotkey={searchHotkey}
            showSearchIcon={showSearchIcon}
            showClearButton={showClearButton}
            id={searchId}
            name={searchName}
            ariaLabel={searchAriaLabel}
            ariaPlaceholder={searchAriaPlaceholder}
          />
        }
        {...popupProps}>
        {children}
      </Popup>
    );
  }
);

PopupWithSearch.displayName = 'PopupWithSearch';

export default PopupWithSearch;
