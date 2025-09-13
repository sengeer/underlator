import './index.scss';
import ComplexMode from './complex-mode';
import SimpleMode from './simple-mode';
import { SelectorOptionProps, SelectorOptionState } from './types';

/**
 * @description Определяет нужен ли сложный режим на основе состояния
 * @param state - Состояние компонента
 * @returns true если нужен complex режим
 */
function defineNeedsComplexMode(state: SelectorOptionState): boolean {
  return state === 'loading' || state === 'installed' || state === 'available';
}

/**
 * @module SelectorOption
 * @description Минималистичный компонент пункта списка
 * @description Состояния: available, loading, installed
 * В зависимости от состояния используется сложный или простой режим
 *
 * @example
 * Простой режим
 * <SelectorOption
    state='available'
    text='Model 1'
    onClick={() => {}}
  />
 *
 * @example
 * Сложный режим с прогресс-баром
 * <SelectorOption
    state='loading'
    text='qwen2.5:7b'
    progressInfo={{
      percentage: 65,
      currentSize: 3.1 * 1024 * 1024 * 1024,
      totalSize: 4.7 * 1024 * 1024 * 1024,
    }}
  />
 *
 * @example
 * Сложный режим с кнопками действий
 * <SelectorOption
    state='installed'
    text='llama3.1:8b'
    isActive={true}
    actionHandlers={{
      onRemove: () => {},
    }}
  />
 */
function SelectorOption(props: SelectorOptionProps) {
  const { state } = props;

  // Определяет нужен ли сложный режим
  const isComplexMode = defineNeedsComplexMode(state);

  // Выбирает компонент для рендеринга
  const Component = isComplexMode ? ComplexMode : SimpleMode;

  return <Component {...props} />;
}

export default SelectorOption;
