/**
 * @module ColorPickerTypes
 * Типы для компонента ColorPicker.
 */

/**
 * Пропсы для компонента ColorPicker.
 */
export interface ColorPickerProps {
  /** Подпись, обозначающая назначение управляемой переменной темы */
  text: string;
  /** CSS-переменная (например, `--theme-background`), синхронизируемая с выбором пользователя */
  variable: string;
  /** Цвет по умолчанию, используемый до восстановления значения из локального хранилища */
  color: string;
}
