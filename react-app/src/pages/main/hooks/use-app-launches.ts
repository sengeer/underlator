/**
 * @module UseAppLaunches
 * Хук для отслеживания количества открытий приложения.
 * Используется для показа модального окна доната на определенном открытии.
 */

import { useEffect, useState } from 'react';
import {
  getStorageWrite,
  setStorageWrite,
} from '../../../shared/lib/utils/control-local-storage';
import {
  DONATION_POPUP_DISMISSED_KEY,
  LAUNCH_COUNT_KEY,
  DONATION_POPUP_SHOW_ON_LAUNCH,
} from '../constants/donation';

/**
 * Хук для отслеживания открытий приложения и определения,
 * нужно ли показывать модальное окно доната.
 *
 * Увеличивает счетчик открытий при каждом монтировании компонента
 * и проверяет, достигнуто ли нужное количество открытий.
 * Если модальное окно было закрыто пользователем, больше не показывается.
 *
 * @returns Объект с флагом shouldShowPopup и функцией dismissPopup для закрытия.
 *
 * @example
 * const { shouldShowPopup, dismissPopup } = useAppLaunches();
 *
 * <Popup isOpened={shouldShowPopup} setOpened={dismissPopup}>
 *   ...
 * </Popup>
 */
export function useAppLaunches() {
  const [shouldShowPopup, setShouldShowPopup] = useState(false);

  useEffect(() => {
    // Проверяет, было ли модальное окно закрыто пользователем
    const dismissed = getStorageWrite(DONATION_POPUP_DISMISSED_KEY);
    if (dismissed) {
      setShouldShowPopup(false);
      return;
    }

    // Получает текущее количество открытий
    const currentCount = getStorageWrite(LAUNCH_COUNT_KEY) || 0;
    const newCount = currentCount + 1;

    // Сохраняет новое количество открытий
    setStorageWrite(LAUNCH_COUNT_KEY, newCount);

    // Показывает модальное окно на третьем открытии
    if (newCount === DONATION_POPUP_SHOW_ON_LAUNCH) {
      setShouldShowPopup(true);
    }
  }, []);

  /**
   * Закрывает модальное окно и сохраняет флаг,
   * чтобы больше не показывать его.
   */
  const dismissPopup = () => {
    setStorageWrite(DONATION_POPUP_DISMISSED_KEY, true);
    setShouldShowPopup(false);
  };

  return { shouldShowPopup, dismissPopup };
}
