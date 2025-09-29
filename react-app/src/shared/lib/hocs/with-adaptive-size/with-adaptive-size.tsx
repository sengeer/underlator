/**
 * @module WithAdaptiveSize
 * HOC для адаптивного изменения размеров компонентов.
 */

import useWindowSize from '../../hooks/use-window-size';
import { size, WithAdaptiveSizeProps } from './types/with-adaptive-size';

/**
 * Набор размеров для различных брейкпоинтов.
 * Определяет конкретные значения ширины и высоты для каждого размера.
 * S: 32x32px - для экранов ≤ 768px
 * M: 40x40px - для экранов ≤ 1024px
 * L: 48x48px - для экранов > 1024px
 */
const sizeSet: Record<size, { width: number; height: number }> = {
  S: { width: 32, height: 32 },
  M: { width: 40, height: 40 },
  L: { width: 48, height: 48 },
};

/**
 * HOC для адаптивного изменения размеров компонентов.
 *
 * Высокоуровневый компонент, который автоматически изменяет размеры обернутого компонента
 * в зависимости от ширины окна браузера. Используется для обеспечения корректного отображения
 * иконок и других UI элементов в зависимости от ширины экрана. Применяет принцип адаптивного дизайна
 * для улучшения пользовательского опыта.
 *
 * @param props - Пропсы компонента.
 * @param props.WrappedComponent - Компонент, который будет обернут для адаптивного изменения размера.
 * @returns JSX элемент с адаптивными размерами.
 *
 * @example
 * Базовое использование с иконкой
 * <WithAdaptiveSize WrappedComponent={TranslateIcon} />
 *
 * @example
 * Использование в навигационном меню
 * <IconButton>
 *   <WithAdaptiveSize WrappedComponent={SettingsIcon} />
 * </IconButton>
 */
function WithAdaptiveSize({ WrappedComponent }: WithAdaptiveSizeProps) {
  const { width: windowWidth } = useWindowSize();

  // Определение размера на основе ширины экрана
  // Используется каскадная логика для выбора подходящего размера
  const hasSizeS = windowWidth <= 768;
  const hasSizeM = windowWidth <= 1024;

  const size: size = hasSizeS ? 'S' : hasSizeM ? 'M' : 'L';

  // Получение конкретных значений размеров из набора
  const { width, height } = sizeSet[size];

  return <WrappedComponent width={width} height={height} />;
}

export default WithAdaptiveSize;
