import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface ModelInfo {
  name: string;
  displayName: string;
  status: ModelStatus;
  error?: string;
}

export interface DownloadProgress {
  modelName: string;
  currentFile: string;
  fileProgress: number;
  overallProgress: number;
  completedFiles: number;
  totalFiles: number;
  downloadedSize: number;
  totalSize: number;
}

export interface ModelsManagementState {
  models: Record<string, ModelInfo>;
  downloadProgress: Record<string, DownloadProgress>;
  isCheckingAvailability: boolean;
  availableModels: Record<string, any>;
}

interface State {
  modelsManagement: ModelsManagementState;
}

// Asynchronous thunks for working with models

export const checkModelsAvailability = createAsyncThunk(
  'modelsManagement/checkAvailability',
  async (_, { rejectWithValue }) => {
    try {
      if (!window.electron?.models) {
        throw new Error('Electron models API not available');
      }

      const [availability, availableModels] = await Promise.all([
        window.electron.models.checkAvailability(),
        window.electron.models.getAvailable(),
      ]);

      return { availability, availableModels };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

export const downloadModel = createAsyncThunk(
  'modelsManagement/download',
  async (modelName: string, { dispatch, rejectWithValue }) => {
    try {
      if (!window.electron?.models) {
        throw new Error('Electron models API not available');
      }

      // Set download status
      dispatch(setModelStatus({ modelName, status: 'downloading' }));

      // Start download
      await window.electron.models.download(modelName);

      return modelName;
    } catch (error) {
      dispatch(
        setModelStatus({
          modelName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

export const deleteModel = createAsyncThunk(
  'modelsManagement/delete',
  async (modelName: string, { rejectWithValue }) => {
    try {
      if (!window.electron?.models) {
        throw new Error('Electron models API not available');
      }

      await window.electron.models.delete(modelName);
      return modelName;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

// Function for getting initial state
const getInitialState = (): ModelsManagementState => ({
  models: {},
  downloadProgress: {},
  isCheckingAvailability: false,
  availableModels: {},
});

const initialState: ModelsManagementState = getInitialState();

export const modelsManagementSlice = createSlice({
  name: 'modelsManagement',
  initialState,
  reducers: {
    // Setting model status
    setModelStatus: (
      state,
      action: PayloadAction<{
        modelName: string;
        status: ModelStatus;
        error?: string;
      }>
    ) => {
      const { modelName, status, error } = action.payload;

      if (!state.models[modelName]) {
        state.models[modelName] = {
          name: modelName,
          displayName:
            state.availableModels[modelName]?.displayName || modelName,
          status: 'notDownloaded',
        };
      }

      state.models[modelName].status = status;
      if (error) {
        state.models[modelName].error = error;
      } else {
        delete state.models[modelName].error;
      }
    },

    // Update download progress
    updateDownloadProgress: (
      state,
      action: PayloadAction<DownloadProgress>
    ) => {
      const progress = action.payload;
      state.downloadProgress[progress.modelName] = progress;
    },

    // Clear download progress
    clearDownloadProgress: (state, action: PayloadAction<string>) => {
      const modelName = action.payload;
      delete state.downloadProgress[modelName];
    },

    // Initialize models from available ones
    initializeModels: (
      state,
      action: PayloadAction<{
        availability: Record<string, boolean>;
        availableModels: Record<string, any>;
      }>
    ) => {
      const { availability, availableModels } = action.payload;
      state.availableModels = availableModels;

      // Initialize state for each available model
      Object.keys(availableModels).forEach((modelName) => {
        const isDownloaded = availability[modelName] || false;

        state.models[modelName] = {
          name: modelName,
          displayName: availableModels[modelName].displayName,
          status: isDownloaded ? 'downloaded' : 'notDownloaded',
        };
      });
    },

    // State reset
    resetModelsState: (state) => {
      Object.assign(state, getInitialState());
    },
  },
  extraReducers: (builder) => {
    builder
      // Check availability of models
      .addCase(checkModelsAvailability.pending, (state) => {
        state.isCheckingAvailability = true;
      })
      .addCase(checkModelsAvailability.fulfilled, (state, action) => {
        state.isCheckingAvailability = false;
        const { availability, availableModels } = action.payload;

        // Use a reducer for initialization
        modelsManagementSlice.caseReducers.initializeModels(state, {
          type: 'modelsManagement/initializeModels',
          payload: { availability, availableModels },
        });
      })
      .addCase(checkModelsAvailability.rejected, (state, action) => {
        state.isCheckingAvailability = false;
        console.error('Failed to check models availability:', action.payload);
      })

      // Model downloading
      .addCase(downloadModel.fulfilled, (state, action) => {
        const modelName = action.payload;
        if (state.models[modelName]) {
          state.models[modelName].status = 'downloaded';
          delete state.models[modelName].error;
        }

        // Delete progress after successful download
        delete state.downloadProgress[modelName];
      })
      .addCase(downloadModel.rejected, (state, action) => {
        // Error has already been processed in thunk
        console.error('Failed to download model:', action.payload);
      })

      // Delete a model
      .addCase(deleteModel.fulfilled, (state, action) => {
        const modelName = action.payload;
        if (state.models[modelName]) {
          state.models[modelName].status = 'notDownloaded';
          delete state.models[modelName].error;
        }
      })
      .addCase(deleteModel.rejected, (state, action) => {
        console.error('Failed to delete model:', action.payload);
      });
  },
});

export const {
  setModelStatus,
  updateDownloadProgress,
  clearDownloadProgress,
  initializeModels,
  resetModelsState,
} = modelsManagementSlice.actions;

// Selector for getting models by status
export const selectModelsByStatus = (state: State, status: ModelStatus) =>
  Object.values(state.modelsManagement.models).filter(
    (model) => model.status === status
  );

// Selector for checking if there are loading models
export const selectHasDownloadingModels = (state: State) =>
  Object.values(state.modelsManagement.models).some(
    (model) => model.status === 'downloading'
  );

// Selector to check if all necessary models are loaded
export const selectAreRequiredModelsDownloaded = (state: State) => {
  const models = state.modelsManagement.models;
  const requiredModels = ['opus-mt-en-ru', 'opus-mt-ru-en'];

  return requiredModels.every(
    (modelName) => models[modelName]?.status === 'downloaded'
  );
};

// Other selectors

export const selectModelsManagement = (state: State) => state.modelsManagement;

export const selectModels = (state: State) => state.modelsManagement.models;

export const selectModelByName = (state: State, modelName: string) =>
  state.modelsManagement.models[modelName];

export const selectDownloadProgress = (state: State) =>
  state.modelsManagement.downloadProgress;

export const selectDownloadProgressByModel = (
  state: State,
  modelName: string
) => state.modelsManagement.downloadProgress[modelName];

export const selectIsCheckingAvailability = (state: State) =>
  state.modelsManagement.isCheckingAvailability;

export const selectAvailableModels = (state: State) =>
  state.modelsManagement.availableModels;

export default modelsManagementSlice.reducer;
