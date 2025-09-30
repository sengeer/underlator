/**
 * @module Popup
 * Компонент Popup с поддержкой ленивой загрузки.
 */

import { useEffect, createRef, useMemo, isValidElement } from 'react';
import { LazyListItem } from './lazy-list-item';
import './styles/popup.scss';
import { PopupProps } from './types/popup';

/**
 * Компонент Popup с поддержкой ленивой загрузки.
 *
 * Универсальный компонент модального окна, с
 * оптимизацией производительности при работе с большими списками
 * через ленивую загрузку элементов.
 *
 * @param props - Пропсы компонента. Подробнее см. в документации интерфейса PopupProps.
 * @returns JSX элемент попапа.
 *
 * @example
 * // Базовое использование
 * <Popup
 *   isOpened={isOpen}
 *   setOpened={setOpen}>
 *   <div>Содержимое попапа</div>
 * </Popup>
 *
 * @example
 * // С ленивой загрузкой для большого списка
 * <Popup
 *   isOpened={isOpen}
 *   setOpened={setOpen}
 *   enableLazyLoading
 *   lazyLoadingThreshold={50}
 *   lazyLoadingMargin='100px'>
 *   {array.map(item => (
 *     <SelectorOption key={item.id} {...item} />
 *   ))}
 * </Popup>
 *
 * @example
 * // Автоматическая активация ленивой загрузки
 * <Popup
 *   isOpened={isOpen}
 *   setOpened={setOpen}
 *   enableLazyLoading
 *   lazyLoadingThreshold={20}> // Активируется при 20+ элементах
 *   {array.map(item => (
 *     <SelectorOption key={item.id} {...item} />
 *   ))}
 * </Popup>
 *
 *
 * @example
 * // С анимацией появления элементов
 * <Popup
 *   isOpened={isOpen}
 *   setOpened={setOpen}
 *   enableLazyLoading
 *   enableAnimation
 *   animationDuration={500}
 *   animationDelay={100}
 *   animationType='slideUp'>
 *   {array.map(item => (
 *     <SelectorOption key={item.id} {...item} />
 *   ))}
 * </Popup>
 */
function Popup({
  children,
  searchComponent,
  isOpened,
  setOpened,
  styleWrapper,
  enableLazyLoading = false,
  lazyLoadingThreshold = 20,
  lazyLoadingMargin = '50px',
  lazyLoadingVisibilityThreshold = 0.1,
  enableAnimation = false,
  animationDuration = 500,
  animationDelay = 0,
  animationType = 'fadeIn',
}: PopupProps) {
  const popupRef = createRef<HTMLDivElement>();

  // Определяет количество дочерних элементов для ленивой загрузки
  const childrenCount = useMemo(() => {
    if (!children) return 0;

    if (Array.isArray(children)) {
      return children.length;
    }

    return 1;
  }, [children]);

  // Определяет нужно ли использовать ленивую загрузку
  const shouldUseLazyLoading = useMemo(() => {
    return enableLazyLoading && childrenCount >= lazyLoadingThreshold;
  }, [enableLazyLoading, childrenCount, lazyLoadingThreshold]);

  // Закрытие попапа по Escape
  useEffect(() => {
    const closeByEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpened(false);
      }
    };

    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [isOpened, setOpened]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (
        popupRef.current &&
        e.relatedTarget instanceof Node &&
        !popupRef.current.contains(e.relatedTarget)
      ) {
        popupRef.current.focus();
      }
    };

    if (isOpened) {
      document.addEventListener('focusout', handleFocus);
    }
    return () => document.removeEventListener('focusout', handleFocus);
  }, [isOpened, setOpened, popupRef]);

  useEffect(() => {
    if (isOpened) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpened]);

  // Закрытие попапа по клику на overlay
  const handleOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setOpened(false);
    }
  };

  // Рендерит контент с учетом ленивой загрузки
  function renderContent() {
    if (!shouldUseLazyLoading) {
      return children;
    }

    // Если включена ленивая загрузка и есть массив элементов
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        // Если элемент уже является LazyListItem, возвращает как есть
        if (
          isValidElement(child) &&
          typeof child.type === 'function' &&
          child.type.name === 'LazyListItem'
        ) {
          return child;
        }

        return (
          <LazyListItem
            key={child.key || index}
            rootMargin={lazyLoadingMargin}
            threshold={lazyLoadingVisibilityThreshold}
            enableAnimation={enableAnimation}
            animationDuration={animationDuration}
            animationDelay={animationDelay}
            animationType={animationType}>
            {child}
          </LazyListItem>
        );
      });
    }

    // Если включена ленивая загрузка, но children не массив
    return (
      <LazyListItem
        rootMargin={lazyLoadingMargin}
        threshold={lazyLoadingVisibilityThreshold}
        enableAnimation={enableAnimation}
        animationDuration={animationDuration}
        animationDelay={animationDelay}
        animationType={animationType}>
        {children}
      </LazyListItem>
    );
  }

  return (
    <div
      className={isOpened ? 'popup popup_open' : 'popup'}
      role='button'
      tabIndex={0}
      onMouseDown={handleOverlay}
      ref={popupRef}>
      <div className='popup__wrapper' style={styleWrapper}>
        {searchComponent}
        <div className='popup__content'>{renderContent()}</div>
      </div>
    </div>
  );
}

export default Popup;
