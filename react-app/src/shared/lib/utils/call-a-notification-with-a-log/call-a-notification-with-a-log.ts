/**
 * @module callANotificationWithALog
 * Утилита для вызова toast-уведомления с сообщением в консоль.
 */

import { addNotification } from '../../../models/notifications-slice';

function callANotificationWithALog(
  dispatch: Function,
  message: string,
  error?: unknown
) {
  dispatch(
    addNotification({
      type: 'error',
      message: message,
    })
  );

  if (error) console.error(error);
}

export default callANotificationWithALog;
