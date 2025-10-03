/**
 * @module NotificationsSlice
 * Redux slice для управления системой toast-уведомлений.
 * Предоставляет actions для добавления и удаления уведомлений.
 */

import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import type {
  NotificationsState,
  NotificationPayload,
  Notification,
} from './types/notifications-slice';

/**
 * Начальное состояние хранилища уведомлений.
 * Содержит пустой массив уведомлений при запуске приложения.
 */
const initialState: NotificationsState = {
  notifications: [],
};

/**
 * Redux slice для управления toast-уведомлениями.
 * Обеспечивает централизованное управление состоянием уведомлений.
 */
const notificationsSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    /**
     * Добавляет новое уведомление в хранилище.
     * Автоматически генерирует уникальный идентификатор для уведомления.
     *
     * @param state - Текущее состояние хранилища уведомлений
     * @param action - Payload с данными нового уведомления
     */
    addNotification: (state, action: PayloadAction<NotificationPayload>) => {
      const newNotification: Notification = {
        id: nanoid(),
        ...action.payload,
      };
      state.notifications.push(newNotification);
    },
    /**
     * Удаляет уведомление из хранилища по идентификатору.
     * Используется для закрытия конкретного уведомления пользователем.
     *
     * @param state - Текущее состояние хранилища уведомлений
     * @param action - Payload с идентификатором удаляемого уведомления
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
  },
});

export const { addNotification, removeNotification } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;
