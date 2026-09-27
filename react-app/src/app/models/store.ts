/**
 * @module Store
 * Конфигурация Redux store с поддержкой автоматического сохранения состояния.
 * Использует redux-persist для автоматического сохранения и восстановления состояния
 * в localStorage с возможностью выборочного сохранения отдельных слайсов.
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createMigrate,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  type PersistedState,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import splashScreenIpcSlice from '../../pages/main/models/splash-screen-ipc-slice';
import chatIpcSlice from '../../shared/models/chat-ipc-slice/';
import elementStateSlice from '../../shared/models/element-state-slice';
import notificationsSlice from '../../shared/models/notifications-slice/';
import providerSettingsSlice, {
  ensureProviderSettingsState,
} from '../../shared/models/provider-settings-slice';
import themesSlice from '../../shared/models/themes-slice';
import translationLanguagesSlice from '../../shared/models/translation-languages-slice';
import modelIpcSlice from '../../widgets/settings/models/model-ipc-slice';

/**
 * Persist v1: приводит providerSettings к каноническому каталогу провайдеров.
 */
const migrations = {
  1: (state: PersistedState) => {
    if (!state || typeof state !== 'object') {
      return state;
    }
    const root = state as PersistedState & {
      providerSettings?: unknown;
    };
    if (root.providerSettings) {
      root.providerSettings = ensureProviderSettingsState(
        root.providerSettings
      );
    }
    return root;
  },
};

/**
 * Конфигурация персистентности для redux-persist.
 * Определяет, какие части состояния сохранять в localStorage.
 * whitelist содержит ключи слайсов, которые должны сохраняться между сессиями.
 * notifications и splashScreen исключены, так как это временные состояния.
 */
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['elements', 'providerSettings', 'translationLanguages', 'themes'],
  migrate: createMigrate(migrations, { debug: false }),
};

/**
 * Объединенный reducer всех слайсов приложения.
 * Используется для создания единого корневого reducer.
 */
const rootReducer = combineReducers({
  elements: elementStateSlice,
  providerSettings: providerSettingsSlice,
  manageModels: modelIpcSlice,
  splashScreen: splashScreenIpcSlice,
  notifications: notificationsSlice,
  translationLanguages: translationLanguagesSlice,
  themes: themesSlice,
  chat: chatIpcSlice,
});

/**
 * Обернутый reducer с поддержкой персистентности.
 * Автоматически сохраняет и восстанавливает состояние из localStorage.
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Redux store с настроенной персистентностью.
 * Middleware настроено для игнорирования действий redux-persist при проверке сериализуемости,
 * так как эти действия содержат несериализуемые данные (например, функции).
 */
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

/**
 * Persistor для управления процессом сохранения и восстановления состояния.
 * Используется в PersistGate для задержки рендеринга до восстановления состояния.
 */
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
