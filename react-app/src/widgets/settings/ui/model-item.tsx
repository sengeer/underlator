import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import SelectorOption from '../../../shared/ui/selector-option';
import type {
  OllamaModelInfo,
  ModelDisplayState,
  ModelEventCallbacks,
} from '../types/embedded-ollama';

/**
 * @module ModelItem
 * @description Компонент для отображения отдельной модели
 * Рендерит SelectorOption с соответствующим состоянием
 */
function ModelItem({
  model,
  displayState,
  eventCallbacks,
  onProgress,
}: {
  model: OllamaModelInfo;
  displayState: ModelDisplayState;
  eventCallbacks: ModelEventCallbacks;
  onProgress?: (modelName: string) => any;
}) {
  const { t } = useLingui();

  // Получает информацию о прогрессе если модель устанавливается
  const progressInfo = useMemo(() => {
    if (displayState.state === 'loading' && onProgress) {
      const progress = onProgress(model.name);

      // Проверяет что прогресс существует и содержит нужные данные
      if (
        progress &&
        typeof progress === 'object' &&
        'total' in progress &&
        typeof progress.total === 'number' &&
        progress.total > 0
      ) {
        // Поддерживает оба формата: size/total и completed/total
        const currentSize =
          ('size' in progress
            ? progress.size
            : 'completed' in progress
              ? progress.completed
              : 0) || 0;
        const totalSize = progress.total || model.size;

        const result = {
          percentage: Math.round((currentSize / totalSize) * 100),
          currentSize: currentSize,
          totalSize: totalSize,
        };

        return result;
      }
    }

    return undefined;
  }, [displayState.state, model.name, model.size, onProgress]);

  // Определяет обработчики действий
  const actionHandlers = useMemo(() => {
    const handlers: any = {};

    if (displayState.state === 'available') {
      handlers.onInstall = () => eventCallbacks.onModelInstall?.(model.name);
    }

    if (displayState.state === 'installed') {
      handlers.onRemove = () => eventCallbacks.onModelRemove?.(model.name);
      handlers.onSelect = () => eventCallbacks.onModelSelect?.(model.name);
    }

    return handlers;
  }, [displayState.state, model.name, eventCallbacks]);

  return (
    <SelectorOption
      state={displayState.state}
      text={displayState.name}
      isActive={displayState.isActive}
      progressInfo={progressInfo}
      actionHandlers={actionHandlers}
      onClick={() => {
        if (displayState.state === 'installed') {
          eventCallbacks.onModelSelect?.(model.name);
        } else if (displayState.state === 'available') {
          eventCallbacks.onModelInstall?.(model.name);
        }
      }}
    />
  );
}

export default ModelItem;
