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
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import splashScreenIpcSlice from '../../pages/main/models/splash-screen-ipc-slice';
import elementStateSlice from '../../shared/models/element-state-slice';
import notificationsSlice from '../../shared/models/notifications-slice/';
import providerSettingsSlice from '../../shared/models/provider-settings-slice';
import translationLanguagesSlice from '../../shared/models/translation-languages-slice';
import chatIpcSlice from '../../widgets/chat/models/chat-ipc-slice';
import modelIpcSlice from '../../widgets/settings/models/model-ipc-slice';

/**
 * Конфигурация персистентности для redux-persist.
 * Определяет, какие части состояния сохранять в localStorage.
 * whitelist содержит ключи слайсов, которые должны сохраняться между сессиями.
 * notifications и splashScreen исключены, так как это временные состояния.
 */
const persistConfig = {
  key: 'root',
  storage,
  whitelist: [
    'providerSettings',
    'translationLanguages',
    'elements',
    'chat',
    'manageModels',
  ],
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
