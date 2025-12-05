/**
 * @module DonationTypes
 * Типы для компонента Donation.
 */

/**
 * Пропсы компонента Donation.
 */
export interface DonationProps {
  /** Состояние открытия модального окна */
  isOpened: boolean;
  /** Функция для изменения состояния открытия */
  setOpened: (value: boolean) => void;
  /** Обработчик клика по кнопке доната */
  onDonate: () => void;
}
