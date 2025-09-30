/**
 * @module SettingsTypes
 * Типы для Settings.
 */

/**
 * Интерфейс для данных селектора в модальном окне.
 * Используется для унификации структуры данных в селекторах.
 */
export interface PopupSelectorData {
  [key: string]: string;
}

/**
 * Пропсы компонента Settings.
 * Определяет интерфейс для настройки отображения компонента.
 */
export interface Settings {
  /** Открыт ли компонент настроек */
  isOpened: boolean;
}
