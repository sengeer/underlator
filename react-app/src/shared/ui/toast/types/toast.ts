/**
 * @module ToastTypes
 * Типы для Toast компонента.
 * Определяет интерфейсы и структуры данных для toast-уведомлений.
 */

import type {
  NotificationType,
  NotificationMessage,
} from '../../../models/notifications-slice/types/notifications-slice';

/**
 * Параметры отображения toast-уведомления.
 * Содержит стилистическую информацию для конкретного типа уведомления.
 */
export interface ToastParams {
  /** Цвет акцента toast-уведомления */
  color: string;
  /** Время отображения уведомления в миллисекундах */
  milliseconds: number;
  /** Иконка уведомления */
  icon: React.ReactNode;
}

/**
 * Пропсы для Toast компонента.
 * Определяют параметры конфигурации отдельного toast-уведомления.
 */
export interface ToastProps {
  /** Уникальный идентификатор toast-уведомления */
  id: string;
  /** Тип уведомления, определяющий стиль отображения */
  type: NotificationType;
  /** Содержимое сообщения уведомления */
  message: NotificationMessage;
}

/**
 * Начальные параметры для нового toast-уведомления.
 * Используются при инициализации состояния компонента.
 */
export interface InitialToastParams
  extends Omit<ToastParams, keyof ToastParams> {
  color: '';
  messageColor: '';
  title: '';
  milliseconds: 0;
  icon: null;
}
