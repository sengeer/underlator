import { configureStore } from '@reduxjs/toolkit';
import splashScreenIpcSlice from '../../pages/main/models/splash-screen-ipc-slice';
import elementStateSlice from '../../shared/models/element-state-slice';
import notificationsSlice from '../../shared/models/notifications-slice/';
import providerSettingsSlice from '../../shared/models/provider-settings-slice';
import translationLanguagesSlice from '../../shared/models/translation-languages-slice';
import chatIpcSlice from '../../widgets/chat/models/chat-ipc-slice';
import modelIpcSlice from '../../widgets/settings/models/model-ipc-slice';

const store = configureStore({
  reducer: {
    elements: elementStateSlice,
    providerSettings: providerSettingsSlice,
    manageModels: modelIpcSlice,
    splashScreen: splashScreenIpcSlice,
    notifications: notificationsSlice,
    translationLanguages: translationLanguagesSlice,
    chat: chatIpcSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
