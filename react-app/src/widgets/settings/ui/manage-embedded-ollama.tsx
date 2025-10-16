/**
 * @module ManageEmbeddedOllama
 * Компонент для управления моделями Embedded Ollama.
 *
 * Предоставляет полнофункциональный интерфейс для управления моделями Embedded Ollama,
 * включая поиск, установку, удаление и выбор моделей. Интегрируется с Redux store
 * для управления состоянием каталога, установки и поиска моделей.
 *
 * Компонент использует PopupWithSearch для отображения списка моделей с поддержкой
 * ленивой загрузки и анимаций. Каждая модель отображается через ModelItem компонент.
 *
 * @example
 * // Использование в Settings компоненте
 * {isOpenManageModelsPopup && (
 *   <ManageModels
 *     onClose={() => dispatch(closeElement('manageModelsPopup'))}
 *   />
 * )}
 */

import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../../app';
import {
  selectProviderSettings,
  updateProviderSettings,
} from '../../../shared/models/provider-settings-slice';
import PopupWithSearch from '../../../shared/ui/popup-with-search';
import {
  fetchCatalog,
  searchModels,
  installModel,
  removeModel,
  setSearchQuery,
} from '../models/model-ipc-slice';
import {
  selectCatalogState,
  selectInstallationState,
  selectSearchState,
} from '../models/model-ipc-slice';
import type {
  OllamaModelInfo,
  InstallModelPayload,
  RemoveModelPayload,
  ManageModelsProps,
  ModelDisplayState,
  ModelEventCallbacks,
} from '../types/model-ipc';
import ModelItem from './model-item';

/**
 * Утилита для определения состояния модели.
 *
 * Анализирует текущее состояние модели на основе различных параметров.
 * и возвращает объект ModelDisplayState для корректного отображения
 * в SelectorOption компоненте.
 *
 * Логика определения состояния:
 * 1. Если есть ошибка - состояние 'available' с информацией об ошибке.
 * 2. Если модель устанавливается - состояние 'loading'.
 * 3. Если модель установлена - состояние 'installed'.
 * 4. Иначе - состояние 'available'.
 *
 * @param model - Информация о модели Ollama.
 * @param installedModels - Список установленных моделей.
 * @param installingModels - Список моделей в процессе установки.
 * @param modelErrors - Ошибки для каждой модели.
 * @param selectedModel - Выбранная активная модель.
 * @returns Состояние модели для отображения.
 */
function getModelDisplayState(
  model: OllamaModelInfo,
  installedModels: string[],
  installingModels: string[],
  modelErrors: Record<string, string>,
  selectedModel?: string
): ModelDisplayState {
  const isInstalled = installedModels.includes(model.name);
  const isInstalling = installingModels.includes(model.name);
  const hasError = modelErrors[model.name];
  const isActive = selectedModel === model.name;

  // Если есть ошибка, устанавливает состояние available, но с информацией об ошибке
  if (hasError) {
    return {
      name: model.name,
      state: 'available',
      isActive,
      metadata: {
        size: model.size,
        description: model.description,
        tags: model.tags,
      },
    };
  }

  if (isInstalling) {
    return {
      name: model.name,
      state: 'loading',
      isActive,
      metadata: {
        size: model.size,
        description: model.description,
        tags: model.tags,
      },
    };
  }

  if (isInstalled) {
    return {
      name: model.name,
      state: 'installed',
      isActive,
      metadata: {
        size: model.size,
        description: model.description,
        tags: model.tags,
      },
    };
  }

  return {
    name: model.name,
    state: 'available',
    isActive,
    metadata: {
      size: model.size,
      description: model.description,
      tags: model.tags,
    },
  };
}

/**
 * Основной компонент ManageModels.
 *
 * Реализует полнофункциональный интерфейс управления моделями Embedded Ollama.
 * Управляет состоянием поиска, каталога моделей, установки и удаления моделей.
 * Интегрируется с Redux store для синхронизации состояния с остальным приложением.
 *
 * Основные функции:
 * - Загрузка и отображение каталога моделей.
 * - Поиск моделей с debounce (300ms).
 * - Установка и удаление моделей с отслеживанием прогресса.
 * - Выбор активной модели и сохранение в настройках провайдера.
 * - Обработка ошибок и отображение состояний загрузки.
 *
 * Компонент автоматически загружает каталог при монтировании и сбрасывает
 * поиск при каждом открытии. Использует PopupWithSearch для отображения
 * списка моделей с поддержкой ленивой загрузки и анимаций.
 *
 * @param props - Пропсы компонента.
 * @param props.onClose - Функция закрытия модального окна.
 * @returns JSX элемент с интерфейсом управления моделями.
 */
function ManageModels({ onClose }: ManageModelsProps) {
  const { t } = useLingui();
  const dispatch = useAppDispatch();

  const catalogState = useSelector(selectCatalogState);
  const installationState = useSelector(selectInstallationState);
  const searchState = useSelector(selectSearchState);
  const { provider, settings } = useSelector(selectProviderSettings);

  const [searchQuery, setSearchQueryLocal] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    settings[provider]?.model
  );

  /**
   * Получает список установленных моделей из каталога.
   *
   * Извлекает названия моделей, которые имеют тег 'installed' в каталоге.
   * Используется для определения состояния моделей при отображении.
   * Мемоизируется для оптимизации производительности.
   *
   * @returns Массив названий установленных моделей.
   */
  const installedModels = useMemo(() => {
    if (!catalogState.catalog?.ollama) return [];

    const installed = catalogState.catalog.ollama
      .filter((model) => model.tags?.includes('installed'))
      .map((model) => model.name);

    return installed;
  }, [catalogState.catalog?.ollama]);

  /**
   * Получает прогресс установки для конкретной модели.
   *
   * Возвращает информацию о прогрессе установки модели из Redux store.
   * Используется в ModelItem для отображения прогресса загрузки.
   * Мемоизируется для оптимизации производительности.
   *
   * @param modelName - Название модели.
   * @returns Информация о прогрессе установки или undefined.
   */
  const getModelProgress = useCallback(
    (modelName: string) => installationState.progress[modelName],
    [installationState.progress]
  );

  /**
   * Обработчик поиска с debounce.
   *
   * Обрабатывает изменения в поле поиска, обновляя локальное состояние
   * и Redux store. При наличии поискового запроса запускает поиск моделей.
   * Debounce реализован на уровне PopupWithSearch (300ms).
   *
   * @param query - Поисковый запрос.
   */
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQueryLocal(query);
      dispatch(setSearchQuery(query));

      if (query.trim()) {
        dispatch(searchModels({ search: query }));
      }
    },
    [dispatch]
  );

  /**
   * Обработчики событий моделей.
   *
   * Создает объект с обработчиками для различных действий с моделями.
   * Мемоизируется для оптимизации производительности и предотвращения
   * лишних перерендеров дочерних компонентов.
   *
   * Обработчики:
   * - onModelSelect: Выбор модели и сохранение в настройках провайдера.
   * - onModelInstall: Установка модели с автоматическим выбором при успехе.
   * - onModelRemove: Удаление модели с выбором первой доступной модели.
   *
   * @returns Объект с обработчиками событий моделей.
   */
  const eventCallbacks: ModelEventCallbacks = useMemo(
    () => ({
      onModelSelect: (modelName: string) => {
        setSelectedModel(modelName);
        dispatch(
          updateProviderSettings({
            provider,
            settings: { model: modelName },
          })
        );
        onClose();
      },
      onModelInstall: async (modelName: string) => {
        const { payload } = (await dispatch(
          installModel({ name: modelName })
        )) as {
          payload: InstallModelPayload;
        };

        if (payload.success) {
          setSelectedModel(modelName);
        }
      },
      onModelRemove: async (modelName: string) => {
        const { payload } = (await dispatch(
          removeModel({ name: modelName })
        )) as {
          payload: RemoveModelPayload;
        };

        if (payload.success && payload.firstInstalledModel) {
          setSelectedModel(payload.firstInstalledModel);
        }
      },
    }),
    [dispatch, provider, onClose]
  );

  /**
   * Получает модели для отображения.
   *
   * Формирует список моделей для отображения в зависимости от наличия
   * поискового запроса. При наличии запроса использует отфильтрованные
   * результаты, иначе показывает все модели из каталога.
   *
   * Для каждой модели создает объект с информацией о модели и ее
   * состоянии отображения через getModelDisplayState.
   *
   * Мемоизируется для оптимизации производительности при изменении
   * состояния каталога, поиска или установки моделей.
   *
   * @returns Массив объектов с моделью и состоянием отображения.
   */
  const displayModels = useMemo(() => {
    if (searchQuery) {
      const models =
        searchState.filteredResults.length > 0
          ? searchState.filteredResults
          : catalogState.catalog?.ollama || [];

      return models.map((model) => ({
        model,
        displayState: getModelDisplayState(
          model,
          installedModels,
          installationState.installing,
          installationState.errors,
          selectedModel
        ),
      }));
    } else {
      const models = catalogState.catalog?.ollama || [];

      return models.map((model) => ({
        model,
        displayState: getModelDisplayState(
          model,
          installedModels,
          installationState.installing,
          installationState.errors,
          selectedModel
        ),
      }));
    }
  }, [
    searchQuery,
    searchState.filteredResults,
    catalogState.catalog?.ollama,
    installedModels,
    installationState.installing,
    installationState.errors,
    selectedModel,
  ]);

  /**
   * Сбрасывает поиск при открытии модального окна.
   *
   * Выполняется при каждом открытии компонента для обеспечения
   * чистого состояния поиска. Также загружает каталог моделей
   * без принудительного обновления для оптимизации производительности.
   */
  useEffect(() => {
    setSearchQueryLocal('');
    dispatch(setSearchQuery(''));
    dispatch(fetchCatalog({ forceRefresh: false }));
  }, [dispatch]);

  /**
   * Загружает каталог моделей при монтировании.
   *
   * Инициализирует каталог моделей при первом рендере компонента.
   * Использует кэшированные данные если они доступны для быстрого
   * отображения интерфейса.
   */
  useEffect(() => {
    dispatch(fetchCatalog({ forceRefresh: false }));
  }, [dispatch]);

  return (
    <PopupWithSearch
      isOpened={true}
      setOpened={onClose}
      styleWrapper={{ minWidth: '50%', maxWidth: '80%' }}
      enableLazyLoading
      lazyLoadingThreshold={20}
      lazyLoadingMargin='100px'
      enableAnimation
      animationDuration={50}
      animationDelay={25}
      animationType='scaleIn'
      searchPlaceholder={t`Model...`}
      searchDebounceMs={300}
      searchValue={searchQuery}
      onSearchChange={handleSearchChange}
      isLoading={catalogState.loading}>
      {/* Список моделей */}
      {displayModels.length === 0 && !catalogState.loading ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--foreground)',
          }}>
          <Trans>Мodels not found</Trans>
        </div>
      ) : (
        displayModels.map(({ model, displayState }) => (
          <ModelItem
            key={model.name}
            model={model}
            displayState={displayState}
            eventCallbacks={eventCallbacks}
            onProgress={getModelProgress}
          />
        ))
      )}
    </PopupWithSearch>
  );
}

export default ManageModels;
