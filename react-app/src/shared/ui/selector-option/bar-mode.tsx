/**
 * @module BarMode
 * Минималистичный компонент для сложного отображения SelectorOption.
 */

import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import ProgressBar from '../progress-bar';
import TextButton from '../text-button/text-button';
import TextFilled from '../text-button-filled';
import {
  SelectorOptionProps,
  SelectorOptionState,
} from './types/selector-option';

/**
 * Форматирует размер файла в читаемый вид.
 * @param bytes - Размер в байтах.
 * @returns Отформатированная строка с размером.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const { t } = useLingui();

  const sizes = [t`B`, t`KB`, t`MB`, t`GB`, t`TB`];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)}${sizes[i]}`;
}

/**
 * Рендерит прогресс-бар для состояния загрузки.
 * @param progressInfo - Информация о прогрессе.
 * @returns JSX элемент с прогресс-баром.
 */
function renderProgressBar(progressInfo: any) {
  const { percentage, currentSize, totalSize } = progressInfo;

  return (
    <div className='selector-option__progress'>
      <span className='text-body-m selector-option__progress-percentage'>
        {Math.round(percentage)}%
      </span>
      <ProgressBar percentage={percentage} style={{ flex: 1 }} />

      <span className='text-body-m selector-option__progress-size'>
        {formatFileSize(currentSize)} / {formatFileSize(totalSize)}
      </span>
    </div>
  );
}

/**
 * Рендерит статус совместимости модели.
 * @param compatibilityMessages - Сообщение о совместимости.
 * @returns JSX элемент со статусом совместимости или null.
 */
function renderCompatibilityStatus(compatibilityMessages?: string) {
  // Отображает сообщение для всех статусов, включая 'ok'
  return <TextFilled text={compatibilityMessages || ''} />;
}

/**
 * Рендерит кнопки действий в зависимости от состояния<div className=""></div>
 * @param state - Текущее состояние.
 * @param actionHandlers - Обработчики действий.
 * @param compatibilityStatus - Статус совместимости.
 * @param compatibilityMessages - Сообщение о совместимости.
 * @returns JSX элемент с кнопками действий.
 */
function renderActionButtons(
  state: SelectorOptionState,
  actionHandlers: any,
  compatibilityStatus?: string,
  compatibilityMessages?: string[]
) {
  const { t } = useLingui();

  switch (state) {
    case 'available':
      return (
        <div className='selector-option__actions'>
          {compatibilityStatus &&
            compatibilityMessages?.map((message) =>
              renderCompatibilityStatus(message)
            )}
          <TextButton text={t`download`} onClick={actionHandlers?.onInstall} />
        </div>
      );

    case 'loading':
      return (
        <div className='selector-option__actions'>
          <TextButton text={t`downloading...`} isDisabled />
        </div>
      );

    case 'installed':
      return (
        <div className='selector-option__actions'>
          <TextButton text={t`remove`} onClick={actionHandlers?.onRemove} />
        </div>
      );

    default:
      return null;
  }
}

function BarMode({
  state,
  className,
  style,
  onClick,
  progressInfo,
  actionHandlers,
  children,
  compatibilityStatus,
  compatibilityMessages,
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
      className={`selector-option selector-option_bar selector-option_${state} ${isHoveringActions ? 'selector-option_no-hover' : ''} ${!isSelectable ? 'selector-option_no-hover' : ''} ${className || ''}`}
      style={style}
      onClick={handleContainerClick}>
      {/* Первый(ые) элемент(ы): children */}
      {children}

      {/* Второй элемент: ProgressBar (только для loading) */}
      {state === 'loading' && progressInfo && renderProgressBar(progressInfo)}

      {/* Третий элемент: ActionButtons */}
      <div
        onMouseEnter={() => setIsHoveringActions(true)}
        onMouseLeave={() => setIsHoveringActions(false)}>
        {renderActionButtons(
          state,
          actionHandlers,
          compatibilityStatus,
          compatibilityMessages
        )}
      </div>
    </div>
  );
}

export default BarMode;
