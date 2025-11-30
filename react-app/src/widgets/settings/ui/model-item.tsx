/**
 * @module ModelItem
 * Компонент для отображения отдельной модели в списке.
 *
 * Представляет модель Ollama в виде SelectorOption с поддержкой различных
 * состояний (доступна, устанавливается, установлена) и соответствующих действий.
 * Интегрируется с системой управления моделями для установки, удаления и выбора.
 *
 * Компонент используется в ManageModels для отображения каждой модели
 * в списке. Получает состояние модели и обработчики событий от родительского
 * компонента.
 *
 * @example
 * // Использование в ManageModels
 * <ModelItem
 *   key={model.name}
 *   model={model}
 *   displayState={displayState}
 *   eventCallbacks={eventCallbacks}
 *   onProgress={getModelProgress}
 * />
 */

import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import SelectorOption from '../../../shared/ui/selector-option';
import TextButton from '../../../shared/ui/text-button';
import type {
  OllamaModelInfo,
  ModelDisplayState,
  ModelEventCallbacks,
} from '../types/model-ipc';

/**
 * Компонент ModelItem.
 *
 * Отображает отдельную модель Ollama в виде интерактивного элемента списка.
 * Управляет отображением состояния модели, прогресса установки и обработкой
 * пользовательских действий. Использует SelectorOption для единообразного
 * отображения с остальными элементами интерфейса.
 *
 * @param props - Пропсы компонента.
 * @param props.model - Информация о модели Ollama.
 * @param props.displayState - Состояние модели для отображения.
 * @param props.eventCallbacks - Обработчики событий для действий с моделью.
 * @param props.onProgress - Функция получения прогресса установки модели.
 * @returns JSX элемент с информацией о модели.
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

  /**
   * Получает информацию о прогрессе установки модели.
   *
   * Извлекает и обрабатывает данные о прогрессе установки модели из Redux store.
   * Поддерживает два формата прогресса: legacy (size/total) и новый (completed/total).
   * Вычисляет процентное соотношение для отображения в SelectorOption.
   *
   * @returns Объект с информацией о прогрессе или undefined.
   */
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

  /**
   * Определяет обработчики действий для модели.
   *
   * Создает объект с обработчиками действий в зависимости от текущего
   * состояния модели. Для каждого состояния доступны соответствующие
   * действия: установка для доступных моделей, удаление и выбор для
   * установленных моделей.
   *
   * @returns Объект с обработчиками действий или пустой объект.
   */
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
      type='bar'
      state={displayState.state}
      progressInfo={progressInfo}
      actionHandlers={actionHandlers}
      compatibilityStatus={model.compatibilityStatus}
      compatibilityMessages={model.compatibilityMessages}
      onClick={() => {
        if (displayState.state === 'installed') {
          eventCallbacks.onModelSelect?.(model.name);
        } else if (displayState.state === 'available') {
          eventCallbacks.onModelInstall?.(model.name);
        }
      }}>
      <TextButton
        text={displayState.name}
        isDisabled
        isActiveStyle={displayState.isActive}
      />
    </SelectorOption>
  );
}

export default ModelItem;
