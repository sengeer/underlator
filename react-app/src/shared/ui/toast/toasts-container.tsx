/**
 * @module ToastsContainer
 * React компонент контейнера для отображения toast-уведомлений.
 * Обеспечивает stacking-дисплей множественных уведомлений.
 */

import { useSelector } from 'react-redux';
import Toast from './toast';
import './styles/toasts-container.scss';

/**
 * React компонент контейнера toast-уведомлений.
 *
 * Отображает все активные уведомления в виде сложенных элементов.
 * Получает данные из Redux store и создает массив Toast компонентов.
 * Управляет позиционированием и анимацией множественных уведомлений.
 *
 * @returns JSX элемент контейнера с уведомлениями
 *
 * @example
 * // Использование ToastsContainer в главном компоненте
 * <>
 *   <ToastsContainer />
 *   <MainContent />
 * </>
 */
function ToastsContainer() {
  // Извлечение уведомлений из Redux store с типизацией
  const { notifications } = useSelector(
    (state: {
      notifications: {
        notifications: Array<{
          id: string;
          type: string;
          message: string | Record<string, any>;
        }>;
      };
    }) => state.notifications
  );

  return (
    <div className='toasts-container'>
      {notifications.map(({ id, type, message }) => (
        <Toast key={id} id={id} message={message} type={type as any} />
      ))}
    </div>
  );
}

export default ToastsContainer;
