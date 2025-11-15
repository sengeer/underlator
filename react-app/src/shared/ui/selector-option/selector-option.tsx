/**
 * @module SelectorOption
 * Компонент пункта списка.
 */

import './styles/selector-option.scss';
import BarMode from './bar-mode';
import SimpleMode from './simple-mode';
import { SelectorOptionProps } from './types/selector-option';

/**
 * Определяет тип компонента.
 * @returns JSX элемент.
 */
function defineType(props: SelectorOptionProps): React.ReactElement {
  switch (props.type) {
    case 'simple':
      return <SimpleMode {...props} />;
    case 'bar':
      return <BarMode {...props} />;
    default:
      return <SimpleMode {...props} />;
  }
}

/**
 * Минималистичный компонент пункта списка.
 * Состояния: available, loading, installed.
 * В зависимости от состояния используется сложный или простой режим.
 *
 * @example
 * // Простой режим
 * <SelectorOption
 *  type='simple'
 *  onClick={() => {}}
 * />
 *
 * @example
 * // Сложный режим с прогресс-баром b
 * <SelectorOption
 *  type='bar'
 *  state='loading'
 *  progressInfo={{
 *    percentage: 65,
 *    currentSize: 3.1 * 1024 * 1024 * 1024,
 *    totalSize: 4.7 * 1024 * 1024 * 1024,
 *  }}
 * />
 *
 * @example
 * // Сложный режим с кнопками действий
 * <SelectorOption
 *  type='bar'
 *  state='installed'
 *  actionHandlers={{
 *    onRemove: () => {},
 *  }}
 * />
 */
function SelectorOption(props: SelectorOptionProps) {
  // Выбирает компонент для рендеринга
  const Component = defineType(props);

  return Component;
}

export default SelectorOption;
