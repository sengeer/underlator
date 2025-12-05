/**
 * @module Donation
 * Компонент модального окна для доната.
 *
 * Отображает модальное окно с информацией о поддержке проекта
 * и кнопкой для перехода на страницу доната.
 */

import { Trans } from '@lingui/react/macro';
import BoostyIcon from '../../../shared/assets/icons/boosty-icon';
import CloseSmallIcon from '../../../shared/assets/icons/close-small-icon';
import UnderlatorIcon from '../../../shared/assets/icons/underlator-icon';
import IconButton from '../../../shared/ui/icon-button';
import Popup from '../../../shared/ui/popup';
import { DonationProps } from '../types/donation';
import '../styles/donation.scss';

/**
 * Компонент модального окна доната.
 *
 * Отображает модальное окно с текстом о поддержке проекта
 * и кнопкой для перехода на страницу доната.
 *
 * @param props - Пропсы компонента.
 * @returns JSX элемент модального окна доната.
 *
 * @example
 * <Donation
 *   isOpened={isOpen}
 *   setOpened={setOpen}
 *   onDonate={handleDonate}
 * />
 */
function Donation({ isOpened, setOpened, onDonate }: DonationProps) {
  return (
    <Popup
      isOpened={isOpened}
      styleWrapper={{ maxWidth: '30.4352%' }}
      setOpened={setOpened}>
      <div className='donation'>
        <h2 className='text-heading-m donation__title'>
          <Trans>donation</Trans>
        </h2>
        <p className='text-body-m donation__text'>
          <Trans>
            This project is developed by a small team of enthusiasts. If you
            find Underlator useful, please consider supporting our work. Your
            contribution helps us continue improving the application and adding
            new features.
          </Trans>
        </p>
        <IconButton onClick={onDonate} style={{ width: 'min-content' }}>
          <BoostyIcon />
          <CloseSmallIcon />
          <UnderlatorIcon width={24} height={24} />
        </IconButton>
      </div>
    </Popup>
  );
}

export default Donation;
