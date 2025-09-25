import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import ProgressBar from '../progress-bar';
import TextButton from '../text-button/text-button';
import {
  SelectorOptionProps,
  SelectorOptionState,
} from './types/selector-option';

/**
 * @module ComplexMode
 * @description Минималистичный компонент для сложного отображения SelectorOption
 */

/**
 * @description Форматирует размер файла в читаемый вид
 * @param bytes - Размер в байтах
 * @returns Отформатированная строка с размером
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)}${sizes[i]}`;
}

/**
 * @description Рендерит прогресс-бар для состояния загрузки
 * @param progressInfo - Информация о прогрессе
 * @returns JSX элемент с прогресс-баром
 */
function renderProgressBar(progressInfo: any) {
  const { percentage, currentSize, totalSize } = progressInfo;

  return (
    <div className='selector-option__progress'>
      <span className='selector-option__progress-percentage'>
        {Math.round(percentage)}%
      </span>
      <ProgressBar percentage={percentage} style={{ flex: 1 }} />

      <span className='selector-option__progress-size'>
        {formatFileSize(currentSize)} / {formatFileSize(totalSize)}
      </span>
    </div>
  );
}

/**
 * @description Рендерит кнопки действий в зависимости от состояния
 * @param state - Текущее состояние
 * @param actionHandlers - Обработчики действий
 * @returns JSX элемент с кнопками действий
 */
function renderActionButtons(state: SelectorOptionState, actionHandlers: any) {
  const { t } = useLingui();

  switch (state) {
    case 'available':
      return (
        <div className='selector-option__actions'>
          <TextButton text={t`Download`} onClick={actionHandlers?.onInstall} />
        </div>
      );

    case 'loading':
      return (
        <div className='selector-option__actions'>
          <TextButton text={t`Downloading...`} isDisabled />
        </div>
      );

    case 'installed':
      return (
        <div className='selector-option__actions'>
          <TextButton text={t`Remove`} onClick={actionHandlers?.onRemove} />
        </div>
      );

    default:
      return null;
  }
}

function ComplexMode({
  text,
  state,
  className,
  style,
  onClick,
  isActive,
  progressInfo,
  actionHandlers,
}: SelectorOptionProps) {
  const [isHoveringActions, setIsHoveringActions] = useState(false);

  // Определяет, можно ли выбирать элемент (только для installed состояния)
  const isSelectable = state === 'installed';

  const handleContainerClick = (e: React.MouseEvent) => {
    // Если клик был на кнопках действий, не обрабатывается клик контейнера
    if ((e.target as HTMLElement).closest('.selector-option__actions')) {
      return;
    }

    // Клик обрабатывается только для установленных моделей
    if (isSelectable) {
      onClick?.();
    }
  };

  return (
    <div
      className={`selector-option selector-option_complex selector-option_${state} ${isHoveringActions ? 'selector-option_no-hover' : ''} ${!isSelectable ? 'selector-option_no-hover' : ''} ${className || ''}`}
      style={style}
      onClick={handleContainerClick}>
      {/* Первый элемент: TextButton */}
      <TextButton text={text} isDisabled isActiveStyle={isActive} />

      {/* Второй элемент: ProgressBar (только для loading) */}
      {state === 'loading' && progressInfo && renderProgressBar(progressInfo)}

      {/* Третий элемент: ActionButtons */}
      <div
        onMouseEnter={() => setIsHoveringActions(true)}
        onMouseLeave={() => setIsHoveringActions(false)}>
        {renderActionButtons(state, actionHandlers)}
      </div>
    </div>
  );
}

export default ComplexMode;
