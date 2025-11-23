/**
 * @module GridTypes
 * Типы для компонента Grid.
 */

export interface GridProps {
  /**
   * Количество колонок в сетке.
   * На мобильных устройствах (ширина <= 768px) всегда используется 1 колонка.
   */
  columns: number;
  /**
   * Дочерние элементы для размещения в сетке.
   */
  children: React.ReactNode;
  /**
   * Дополнительные CSS классы.
   */
  className?: string;
  /**
   * Дополнительные inline стили.
   */
  style?: React.CSSProperties;
  /**
   * Отступ между элементами сетки.
   * По умолчанию используется значение из CSS переменной или 1rem.
   */
  gap?: string;
}
