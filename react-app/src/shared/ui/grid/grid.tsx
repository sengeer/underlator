/**
 * @module Grid
 * Компонент для адаптивного размещения дочерних элементов в сетке.
 *
 * Автоматически распределяет элементы по строкам с учетом указанного количества колонок.
 * Если элементов меньше колонок, они равномерно делят строку. Если элементов больше,
 * последняя строка распределяется поровну между оставшимися элементами. Если в последней
 * строке остается один элемент, он занимает всю ширину строки.
 *
 * На мобильных устройствах (ширина <= 768px) всегда используется одна колонка независимо
 * от значения пропса columns.
 *
 * @example
 * // 3 колонки, 5 элементов: первая строка 3 элемента, вторая строка 2 элемента (50%/50%)
 * <Grid columns={3}>
 *   <div>1</div>
 *   <div>2</div>
 *   <div>3</div>
 *   <div>4</div>
 *   <div>5</div>
 * </Grid>
 */

import './styles/grid.scss';
import { useMemo, Children } from 'react';
import type { GridProps } from './types/grid';

/**
 * Компонент Grid.
 *
 * Реализует адаптивную сетку с автоматическим распределением элементов.
 *
 * @param columns - Количество колонок в сетке.
 * @param children - Дочерние элементы для размещения.
 * @param className - Дополнительные CSS классы.
 * @param style - Дополнительные inline стили.
 * @param gap - Отступ между элементами.
 * @returns JSX элемент с сеткой.
 */
function Grid({
  columns,
  children,
  className = '',
  style,
  gap = '1rem',
}: GridProps) {
  /**
   * Преобразует children в массив для удобной работы.
   * Фильтрует null и undefined элементы.
   */
  const childrenArray = useMemo(
    () => Children.toArray(children).filter(Boolean),
    [children]
  );

  const childrenCount = childrenArray.length;

  /**
   * Вычисляет структуру сетки для распределения элементов.
   * Определяет количество полных строк, остаток элементов и структуру
   * последней строки для корректного распределения ширины.
   */
  const gridStructure = useMemo(() => {
    if (childrenCount === 0) {
      return { rows: [], totalRows: 0 };
    }

    const fullRowsCount = Math.floor(childrenCount / columns);
    const remainder = childrenCount % columns;

    const rows: Array<{ columns: number; startIndex: number }> = [];

    // Полные строки с указанным количеством колонок
    for (let i = 0; i < fullRowsCount; i++) {
      rows.push({
        columns,
        startIndex: i * columns,
      });
    }

    // Последняя строка с остатком элементов
    if (remainder > 0) {
      rows.push({
        columns: remainder,
        startIndex: fullRowsCount * columns,
      });
    }

    return {
      rows,
      totalRows: rows.length,
    };
  }, [childrenCount, columns]);

  /**
   * Группирует элементы по строкам для корректного распределения.
   * Каждая строка получает свой grid-контейнер с индивидуальным grid-template-columns,
   * что позволяет равномерно распределять элементы независимо от количества колонок.
   */
  const rowsData = useMemo(() => {
    return gridStructure.rows.map((row) => {
      const rowChildren = childrenArray.slice(
        row.startIndex,
        row.startIndex + row.columns
      );

      // Для строки с N элементами используем grid-template-columns: repeat(N, 1fr),
      // что обеспечивает равномерное распределение ширины между элементами.
      // Для columns=3, row.columns=2: grid-template-columns: repeat(2, 1fr) = 50%/50%
      const rowTemplateColumns = `repeat(${row.columns}, 1fr)`;

      return {
        children: rowChildren,
        templateColumns: rowTemplateColumns,
      };
    });
  }, [childrenArray, gridStructure.rows]);

  return (
    <div
      className={`grid ${className}`}
      style={
        {
          ...style,
          gap: gap,
          '--grid-columns': columns,
        } as React.CSSProperties
      }>
      {rowsData.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className='grid__row'
          style={{
            gridTemplateColumns: row.templateColumns,
            display: 'grid',
            width: '100%',
            gap: gap,
          }}>
          {row.children.map((child, childIndex) => (
            <div key={rowIndex * 1000 + childIndex} className='grid__item'>
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Grid;
