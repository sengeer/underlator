/**
 * @module Toast
 * React компонент для отображения toast-уведомлений.
 * Управляет анимацией появления/исчезновения и автоудалением.
 */

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import CheckIcon from '../../assets/icons/check-icon';
import CloseIcon from '../../assets/icons/close-icon';
import InfoIcon from '../../assets/icons/info-icon';
import { removeNotification } from '../../models/notifications-slice';
import ButtonWrapperWithBackground from '../button-wrapper-with-background';
import DecorativeTextAndIconButton from '../decorative-text-and-icon-button';
import IconButton from '../icon-button';
import type {
  ToastProps,
  ToastParams,
  InitialToastParams,
} from './types/toast';
import './styles/toast.scss';

/**
 * React компонент toast-уведомления.
 *
 * Управляет жизненным циклом отдельного уведомления с автоматическим
 * скрытием через заданное время и возможностью ручного закрытия.
 * Поддерживает различные типы уведомлений с соответствующими стилями.
 *
 * @param props - Пропсы компонента toast-уведомления
 * @returns JSX элемент уведомления
 *
 * @example
 * Использование Toast через маппинг уведомлений
 * ```tsx
 * <Toast key={id} id={id} message={message} type={type} />
 * ```
 */
function Toast({ id, type, message }: ToastProps) {
  const [isShow, setIsShow] = useState<boolean>(false);
  const [params, setParams] = useState<ToastParams>({
    color: '',
    milliseconds: 0,
    icon: null,
  } as InitialToastParams);

  const dispatch = useDispatch();

  /**
   * Устанавливает таймеры для управления жизненным циклом уведомления.
   * Создает последовательность таймеров для плавного появления, скрытия и удаления.
   *
   * @returns Функция очистки таймеров при размонтировании компонента
   */
  function handleToastTimers(): () => void {
    const showingTimer = setTimeout(() => {
      setIsShow(true);
    }, 300);

    const hidingTimer = setTimeout(() => {
      setIsShow(false);
    }, params.milliseconds + 300);

    const removingTimer = setTimeout(() => {
      dispatch(removeNotification(id));
    }, params.milliseconds + 600);

    return () => {
      clearTimeout(showingTimer);
      clearTimeout(hidingTimer);
      clearTimeout(removingTimer);
    };
  }

  /**
   * Настраивает параметры отображения в зависимости от типа уведомления.
   * Устанавливает цветовую схему, заголовок и время отображения для каждого типа.
   * Расширение типов происходит путем добавления новых условий в функцию.
   */
  function setToastParams(): void {
    // Для добавления нового типа toast-уведомления,
    // добавляется новое условие type === 'newType' с соответствующими параметрами

    if (type === 'error') {
      setParams({
        color: 'var(--accent)',
        milliseconds: 6000,
        icon: null,
      });
      return;
    }

    if (type === 'info') {
      setParams({
        color: 'var(--main)',
        milliseconds: 6000,
        icon: <InfoIcon />,
      });
      return;
    }

    if (type === 'success') {
      setParams({
        color: 'var(--main)',
        milliseconds: 6000,
        icon: <CheckIcon />,
      });
      return;
    }

    // Значения по умолчанию для неизвестных типов
    setParams({
      color: 'var(--main)',
      milliseconds: 6000,
      icon: <InfoIcon />,
    });
  }

  // Установка таймеров при изменении времени отображения
  useEffect(handleToastTimers, [params.milliseconds]);
  // Настройка параметров отображения при монтировании компонента
  useEffect(setToastParams, []);

  return (
    <aside className={`toast${isShow ? ' toast_show' : ''}`}>
      <ButtonWrapperWithBackground isDisabled>
        <DecorativeTextAndIconButton
          // Преобразование message в строку для текстового отображения
          text={typeof message === 'string' ? message : JSON.stringify(message)}
          decorativeColor={params.color}
          style={{
            marginLeft: '1rem',
            color: params.color,
          }}>
          {params.icon}
        </DecorativeTextAndIconButton>
        <IconButton
          style={{ marginRight: '1rem' }}
          onClick={() => dispatch(removeNotification(id))}>
          <CloseIcon />
        </IconButton>
      </ButtonWrapperWithBackground>
    </aside>
  );
}

export default Toast;
