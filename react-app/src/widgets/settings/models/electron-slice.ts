/**
 * @module ElectronSlice
 * Redux slice для управления моделями в Settings виджете.
 * Обеспечивает управление каталогом моделей, установкой, удалением и поиском моделей.
 */

import { i18n } from '@lingui/core';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { addNotification } from '../../../shared/models/notifications-slice/';
import { updateProviderSettings } from '../../../shared/models/provider-settings-slice';
import { electron } from '../apis/electron';
import type {
  ManageModelsState,
  CatalogState,
  InstallationState,
  SearchState,
  ModelSearchFilters,
  ModelInstallProgress,
  GetCatalogParams,
  InstallModelParams,
  RemoveModelParams,
  GetModelInfoParams,
} from '../types/electron';

/**
 * Начальное состояние каталога моделей.
 * Состояние с настройками по умолчанию.
 */
const initialCatalogState: CatalogState = {
  catalog: null,
  loading: false,
  error: null,
  lastUpdated: null,
  forceRefresh: false,
};

/**
 * Начальное состояние процесса установки.
 * Состояние с настройками по умолчанию.
 */
const initialInstallationState: InstallationState = {
  progress: {},
  installing: [],
  removing: [],
  errors: {},
};

/**
 * Начальное состояние поиска и фильтрации.
 * Состояние с настройками по умолчанию.
 */
const initialSearchState: SearchState = {
  query: '',
  filters: {},
  filteredResults: [],
  searching: false,
};

/**
 * Начальное состояние управления моделями.
 * Объединяет все подсостояния в единое состояние.
 */
const initialState: ManageModelsState = {
  catalog: initialCatalogState,
  installation: initialInstallationState,
  search: initialSearchState,
  loading: false,
  error: null,
};

/**
 * Async thunk для получения каталога моделей.
 * Загружает каталог с поддержкой кэширования и принудительного обновления.
 */
export const fetchCatalog = createAsyncThunk(
  'manageModels/fetchCatalog',
  async (params: GetCatalogParams = {}, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.getCatalog(params);

      if (!result.success) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('❌ Error getting the models catalog'),
          })
        );

        return rejectWithValue(
          result.error || 'Error getting the models catalog'
        );
      }

      return result;
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: i18n._('❌ Error getting the catalog'),
        })
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk для поиска моделей.
 * Выполняет поиск по фильтрам и возвращает отфильтрованные результаты.
 */
export const searchModels = createAsyncThunk(
  'manageModels/searchModels',
  async (filters: ModelSearchFilters, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.searchModels(filters);

      if (!result.success) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('❌ Error searching models'),
          })
        );

        return rejectWithValue(result.error || 'Error searching models');
      }

      return result;
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: i18n._('❌ Error searching models'),
        })
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk для получения информации о модели.
 * Загружает детальную информацию о конкретной модели.
 */
export const fetchModelInfo = createAsyncThunk(
  'manageModels/fetchModelInfo',
  async (params: GetModelInfoParams, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.getModelInfo(params);

      if (!result.success) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('❌ Error getting model info'),
          })
        );

        return rejectWithValue(result.error || 'Error getting model info');
      }

      return result;
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: i18n._('❌ Error getting model info'),
        })
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk для установки модели.
 * Запускает процесс установки модели с отслеживанием прогресса.
 */
export const installModel = createAsyncThunk(
  'manageModels/installModel',
  async (params: InstallModelParams, { rejectWithValue, dispatch }) => {
    try {
      // Добавляет модель в список устанавливаемых
      dispatch(addInstallingModel(params.name));

      const result = await electron.installModel(
        params,
        (progress: ModelInstallProgress) => {
          // Обновляет прогресс через dispatch
          dispatch(
            setInstallationProgress({
              modelName: params.name,
              progress,
            })
          );
        },
        (error: string) => {
          // Обрабатывает ошибку через dispatch
          dispatch(
            setInstallationError({
              modelName: params.name,
              error,
            })
          );
        }
      );

      if (!result.success) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('❌ Model installation error'),
          })
        );

        return rejectWithValue(result.error || 'Error installing model');
      }

      dispatch(
        updateProviderSettings({
          provider: 'Embedded Ollama',
          settings: { model: params.name },
        })
      );

      dispatch(fetchCatalog({ forceRefresh: true }));

      return { ...result, modelName: params.name };
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: i18n._('❌ Model installation error'),
        })
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk для удаления модели.
 * Удаляет установленную модель.
 */
export const removeModel = createAsyncThunk(
  'manageModels/removeModel',
  async (params: RemoveModelParams, { rejectWithValue, dispatch }) => {
    try {
      const resultRemove = await electron.removeModel(params);
      if (!resultRemove.success) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('❌ Model removal error'),
          })
        );

        console.error('❌ Remove failed', resultRemove.error);
        return rejectWithValue(resultRemove.error || 'Error removing model');
      }

      const resultList = await electron.listInstalledModels();
      if (!resultList.success) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('❌ Error getting list of models'),
          })
        );

        return rejectWithValue(
          resultList.error || 'Error getting list of models'
        );
      }

      dispatch(
        updateProviderSettings({
          provider: 'Embedded Ollama',
          settings: { model: resultList.data.models[0].model },
        })
      );
      dispatch(fetchCatalog({ forceRefresh: true }));

      return {
        ...resultRemove,
        modelName: params.name,
        firstInstalledModel: resultList.data.models[0].model,
      };
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: i18n._('❌ Model removal error'),
        })
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk для получения списка установленных моделей.
 * Загружает список всех установленных в системе моделей.
 */
export const fetchInstalledModels = createAsyncThunk(
  'manageModels/fetchInstalledModels',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.listInstalledModels();

      if (!result.success) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('❌ Error getting list of models'),
          })
        );

        return rejectWithValue(result.error || 'Error getting list of models');
      }

      return result;
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: i18n._('❌ Error getting list of models'),
        })
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Redux slice для управления моделями.
 * Содержит reducers и actions для всех операций с моделями.
 */
const electronSlice = createSlice({
  name: 'manageModels',
  initialState,
  reducers: {
    /**
     * Устанавливает каталог моделей.
     * Обновляет каталог и время последнего обновления.
     */
    setCatalog: (state, action: PayloadAction<any>) => {
      state.catalog.catalog = action.payload;
      state.catalog.lastUpdated = Date.now();
      state.catalog.error = null;
    },

    /**
     * Устанавливает прогресс установки модели.
     * Обновляет прогресс для конкретной модели.
     */
    setInstallationProgress: (
      state,
      action: PayloadAction<{
        modelName: string;
        progress: ModelInstallProgress;
      }>
    ) => {
      const { modelName, progress } = action.payload;
      state.installation.progress[modelName] = progress;

      // Если установка завершена или произошла ошибка, удаляет модель из списка устанавливаемых
      if (progress.status === 'complete' || progress.status === 'error') {
        state.installation.installing = state.installation.installing.filter(
          (name) => name !== modelName
        );

        if (progress.status === 'error') {
          state.installation.errors[modelName] =
            progress.error || 'Unknown error';
        }
      }
    },

    /**
     * Устанавливает ошибку процесса установки модели.
     * Сохраняет ошибку для конкретной модели.
     */
    setInstallationError: (
      state,
      action: PayloadAction<{
        modelName: string;
        error: string;
      }>
    ) => {
      const { modelName, error } = action.payload;
      state.installation.errors[modelName] = error;

      // Удалят модель из списка устанавливаемых при ошибке
      state.installation.installing = state.installation.installing.filter(
        (name) => name !== modelName
      );
    },

    /**
     * Добавляет модель в список устанавливаемых.
     * Отмечает модель как находящуюся в процессе установки.
     */
    addInstallingModel: (state, action: PayloadAction<string>) => {
      const modelName = action.payload;
      if (!state.installation.installing.includes(modelName)) {
        state.installation.installing.push(modelName);
      }

      // Очищает предыдущие ошибки для этой модели
      delete state.installation.errors[modelName];
    },

    /**
     * Удаляет модель из списка устанавливаемых.
     * Убирает модель из процесса установки.
     */
    removeInstallingModel: (state, action: PayloadAction<string>) => {
      const modelName = action.payload;
      state.installation.installing = state.installation.installing.filter(
        (name) => name !== modelName
      );

      // Очищает прогресс и ошибки для этой модели
      delete state.installation.progress[modelName];
      delete state.installation.errors[modelName];
    },

    /**
     * Устанавливает поисковый запрос.
     * Обновляет текущий поисковый запрос.
     */
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload;
    },

    /**
     * Устанавливает фильтры поиска.
     * Обновляет активные фильтры для поиска моделей.
     */
    setSearchFilters: (state, action: PayloadAction<ModelSearchFilters>) => {
      state.search.filters = action.payload;
    },

    /**
     * Устанавливает отфильтрованные результаты.
     * Обновляет результаты поиска.
     */
    setFilteredResults: (state, action: PayloadAction<any[]>) => {
      state.search.filteredResults = action.payload;
    },

    /**
     * Очищает ошибки установки.
     * Удаляет все ошибки установки моделей.
     */
    clearInstallationErrors: (state) => {
      state.installation.errors = {};
    },

    /**
     * Очищает ошибку установки конкретной модели.
     * Удаляет ошибку для указанной модели.
     */
    clearModelError: (state, action: PayloadAction<string>) => {
      const modelName = action.payload;
      delete state.installation.errors[modelName];
    },

    /**
     * Сбрасывает состояние поиска.
     * Очищает все параметры поиска и результаты.
     */
    resetSearch: (state) => {
      state.search.query = '';
      state.search.filters = {};
      state.search.filteredResults = [];
      state.search.searching = false;
    },

    /**
     * Сбрасывает все состояние.
     * Возвращает состояние к начальному.
     */
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    // Обработка fetchCatalog
    builder
      .addCase(fetchCatalog.pending, (state) => {
        state.catalog.loading = true;
        state.catalog.error = null;
      })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.catalog.loading = false;
        state.catalog.catalog = action.payload.data;
        state.catalog.lastUpdated = Date.now();
        state.catalog.error = null;
      })
      .addCase(fetchCatalog.rejected, (state, action) => {
        state.catalog.loading = false;
        state.catalog.error = action.payload as string;
      });

    // Обработка searchModels
    builder
      .addCase(searchModels.pending, (state) => {
        state.search.searching = true;
      })
      .addCase(searchModels.fulfilled, (state, action) => {
        state.search.searching = false;
        state.search.filteredResults = action.payload.data?.ollama || [];
      })
      .addCase(searchModels.rejected, (state, action) => {
        state.search.searching = false;
        state.error = action.payload as string;
      });

    // Обработка fetchModelInfo
    builder
      .addCase(fetchModelInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModelInfo.fulfilled, (state, _) => {
        state.loading = false;
        // Информация о модели может быть сохранена в отдельном поле при необходимости
      })
      .addCase(fetchModelInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Обработка installModel
    builder
      .addCase(installModel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(installModel.fulfilled, (state, action) => {
        state.loading = false;
        const { modelName } = action.payload;

        // Удаляет модель из списка устанавливаемых
        state.installation.installing = state.installation.installing.filter(
          (name) => name !== modelName
        );

        // Очищает ошибки для этой модели
        delete state.installation.errors[modelName];

        // Обновляет каталог чтобы получить актуальные теги
        // Это будет сделано через dispatch в компоненте
      })
      .addCase(installModel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Обработка removeModel
    builder
      .addCase(removeModel.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        const { name: modelName } = action.meta.arg;
        // Добавляет модель в список удаляемых
        if (!state.installation.removing.includes(modelName)) {
          state.installation.removing.push(modelName);
        }
      })
      .addCase(removeModel.fulfilled, (state, action) => {
        state.loading = false;
        const { modelName } = action.payload;

        // Удаляет модель из списка удаляемых
        state.installation.removing = state.installation.removing.filter(
          (name) => name !== modelName
        );

        // Очищает все данные связанные с удаленной моделью
        delete state.installation.progress[modelName];
        delete state.installation.errors[modelName];
        state.installation.installing = state.installation.installing.filter(
          (name) => name !== modelName
        );
      })
      .addCase(removeModel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Обработка fetchInstalledModels
    builder
      .addCase(fetchInstalledModels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInstalledModels.fulfilled, (state, action) => {
        state.loading = false;
        // Список установленных моделей может быть сохранен в отдельном поле при необходимости
      })
      .addCase(fetchInstalledModels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Экспорт actions
export const {
  setCatalog,
  setInstallationProgress,
  setInstallationError,
  addInstallingModel,
  removeInstallingModel,
  setSearchQuery,
  setSearchFilters,
  setFilteredResults,
  clearInstallationErrors,
  clearModelError,
  resetSearch,
  resetState,
} = electronSlice.actions;

// Экспорт reducer
export default electronSlice.reducer;

// Селекторы для упрощения доступа к состоянию
export const selectManageModelsState = (state: {
  manageModels: ManageModelsState;
}) => state.manageModels;

export const selectCatalogState = (state: {
  manageModels: ManageModelsState;
}) => state.manageModels.catalog;

export const selectInstallationState = (state: {
  manageModels: ManageModelsState;
}) => state.manageModels.installation;

export const selectSearchState = (state: { manageModels: ManageModelsState }) =>
  state.manageModels.search;

export const selectIsModelInstalling =
  (modelName: string) => (state: { manageModels: ManageModelsState }) =>
    state.manageModels.installation.installing.includes(modelName);

export const selectModelProgress =
  (modelName: string) => (state: { manageModels: ManageModelsState }) =>
    state.manageModels.installation.progress[modelName];

export const selectModelError =
  (modelName: string) => (state: { manageModels: ManageModelsState }) =>
    state.manageModels.installation.errors[modelName];
