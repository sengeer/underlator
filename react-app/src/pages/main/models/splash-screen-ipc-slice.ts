/**
 * @module SplashScreenIpcSlice
 * Redux slice для управления состоянием splash screen.
 */

import { i18n } from '@lingui/core';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { addNotification } from '../../../shared/models/notifications-slice/';
import { splashScreenApi } from '../apis/splash-screen-ipc';
import type {
  SplashStatusData,
  SplashScreenState,
} from '../types/splash-screen';

/**
 * Начальное состояние splash screen.
 * Состояние с настройками по умолчанию.
 */
const initialState: SplashScreenState = {
  status: null,
  progress: 0,
  loading: false,
  error: null,
  visible: true,
  startTime: null,
  endTime: null,
};

/**
 * Async thunk для получения статуса splash screen.
 * Загружает текущий статус инициализации от Electron.
 */
export const fetchSplashStatus = createAsyncThunk(
  'splashScreen/fetchStatus',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const status = await splashScreenApi.getStatus();

      if (!status) {
        dispatch(
          addNotification({
            type: 'error',
            message: i18n._('Internal application error'),
          })
        );

        return rejectWithValue("Couldn't get splash screen status");
      }

      return status;
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: i18n._('Internal application error'),
        })
      );

      console.error('Error getting the status', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Redux slice для управления состоянием splash screen.
 * Содержит reducers и actions для всех операций с splash screen.
 */
const splashScreenSlice = createSlice({
  name: 'splashScreen',
  initialState,
  reducers: {
    /**
     * Устанавливает статус splash screen.
     * Обновляет текущий статус инициализации.
     */
    setStatus: (state, action: PayloadAction<SplashStatusData>) => {
      state.status = action.payload;
      state.error = null;

      // Обновляет прогресс если он указан в статусе
      if (action.payload.progress !== undefined) {
        state.progress = action.payload.progress;
      }
    },

    /**
     * Устанавливает прогресс инициализации.
     * Обновляет прогресс в процентах.
     */
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = Math.max(0, Math.min(100, action.payload));
    },

    /**
     * Устанавливает ошибку инициализации.
     * Сохраняет ошибку для отображения пользователю.
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },

    /**
     * Устанавливает состояние загрузки.
     * Управляет индикатором загрузки.
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Показывает splash screen.
     * Делает splash screen видимым.
     */
    show: (state) => {
      state.visible = true;
      state.startTime = Date.now();
      state.endTime = null;
    },

    /**
     * Скрывает splash screen.
     * Делает splash screen невидимым.
     */
    hide: (state) => {
      state.visible = false;
      state.endTime = Date.now();
    },

    /**
     * Завершает инициализацию.
     * Устанавливает финальное состояние готовности.
     */
    complete: (state) => {
      state.loading = false;
      state.progress = 100;
      state.endTime = Date.now();

      // Обновляет статус на готовность если он не установлен
      if (!state.status || state.status.status !== 'ready') {
        state.status = {
          status: 'ready',
          progress: 100,
        };
      }
    },

    /**
     * Очищает ошибку.
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Сбрасывает состояние splash screen.
     */
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    // Обработка fetchSplashStatus
    builder
      .addCase(fetchSplashStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSplashStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
        state.error = null;

        // Обновляет прогресс если он указан в статусе
        if (action.payload.progress !== undefined) {
          state.progress = action.payload.progress;
        }
      })
      .addCase(fetchSplashStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Экспорт actions
export const {
  setStatus,
  setProgress,
  setError,
  setLoading,
  show,
  hide,
  complete,
  clearError,
  reset,
} = splashScreenSlice.actions;

// Экспорт reducer
export default splashScreenSlice.reducer;

// Селекторы для упрощения доступа к состоянию
export const selectSplashScreenState = (state: {
  splashScreen: SplashScreenState;
}) => state.splashScreen;

export const selectSplashStatus = (state: {
  splashScreen: SplashScreenState;
}) => state.splashScreen.status;

export const selectSplashProgress = (state: {
  splashScreen: SplashScreenState;
}) => state.splashScreen.progress;

export const selectSplashLoading = (state: {
  splashScreen: SplashScreenState;
}) => state.splashScreen.loading;

export const selectSplashError = (state: { splashScreen: SplashScreenState }) =>
  state.splashScreen.error;

export const selectSplashVisible = (state: {
  splashScreen: SplashScreenState;
}) => state.splashScreen.visible;

export const selectSplashDuration = (state: {
  splashScreen: SplashScreenState;
}) => {
  const { startTime, endTime } = state.splashScreen;
  if (!startTime) return 0;

  const end = endTime || Date.now();
  return end - startTime;
};

export const selectIsSplashComplete = (state: {
  splashScreen: SplashScreenState;
}) => {
  const { status, progress, error } = state.splashScreen;
  return status?.status === 'ready' || progress >= 100 || !!error;
};
