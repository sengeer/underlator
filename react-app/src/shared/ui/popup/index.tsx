import React from 'react';
import { useEffect, createRef } from 'react';
import './index.scss';

interface Popup {
  children: React.ReactNode;
  isOpened: boolean;
  setOpened: (value: boolean) => void;
}

function Popup({ children, isOpened, setOpened }: Popup) {
  const popupRef = React.createRef<HTMLDivElement>();

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

  const handleOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setOpened(false);
    }
  };

  return (
    <div
      className={isOpened ? 'popup popup_open' : 'popup'}
      role='button'
      tabIndex={0}
      onMouseDown={handleOverlay}
      ref={popupRef}>
      <div className='popup__wrapper'>
        <div className='popup__content'>{children}</div>
      </div>
    </div>
  );
}

export default Popup;
