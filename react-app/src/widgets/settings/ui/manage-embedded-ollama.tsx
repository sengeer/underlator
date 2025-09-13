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
} from '../models/manage-embedded-ollama-slice';
import {
  selectCatalogState,
  selectInstallationState,
  selectSearchState,
} from '../models/manage-embedded-ollama-slice';
import type {
  OllamaModelInfo,
  InstallModelPayload,
  RemoveModelPayload,
  ManageModelsProps,
  ModelDisplayState,
  ModelEventCallbacks,
} from '../types';
import ModelItem from './model-item';

/**
 * @module ManageModels
 * @description Компонент для управления моделями Embedded Ollama
 * Объединяет все модули свзанные с провайдером Embedded Ollama в единую систему управления
 */

/**
 * @description Утилита для определения состояния модели
 * Определяет как модель должна отображаться в SelectorOption
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
 * @description Основной компонент ManageModels
 * Объединяет все модули для управления моделями Embedded Ollama
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
   * @description Получает список установленных моделей из каталога
   * Модели с тегом 'installed' считаются установленными
   */
  const installedModels = useMemo(() => {
    if (!catalogState.catalog?.ollama) return [];

    const installed = catalogState.catalog.ollama
      .filter((model) => model.tags?.includes('installed'))
      .map((model) => model.name);

    return installed;
  }, [catalogState.catalog?.ollama]);

  // Селекторы для конкретных моделей
  const getModelProgress = useCallback(
    (modelName: string) => installationState.progress[modelName],
    [installationState.progress]
  );

  /**
   * @description Обработчик поиска с debounce
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
   * @description Обработчики событий моделей
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
    [dispatch, provider]
  );

  /**
   * @description Получает модели для отображения
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
   * @description Сбрасывает поиск при открытии модального окна
   */
  useEffect(() => {
    setSearchQueryLocal('');
    dispatch(setSearchQuery(''));
    dispatch(fetchCatalog({ forceRefresh: false }));
  }, [dispatch]);

  /**
   * @description Загружает каталог моделей при монтировании
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
      animationDuration={80}
      animationDelay={40}
      animationType='scaleIn'
      searchPlaceholder={t`Поиск моделей...`}
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
          <Trans>Модели не найдены</Trans>
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
