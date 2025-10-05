import { configureStore } from '@reduxjs/toolkit';
import splashScreenReducer from '../../pages/main/models/splash-screen-slice';
import elementStateSlice from '../../shared/models/element-state-slice';
import notificationsSlice from '../../shared/models/notifications-slice/';
import providerSettingsSlice from '../../shared/models/provider-settings-slice';
import translationLanguagesSlice from '../../shared/models/translation-languages-slice';
import electronSlice from '../../widgets/settings/models/electron-slice';

const store = configureStore({
  reducer: {
    elements: elementStateSlice,
    providerSettings: providerSettingsSlice,
    manageModels: electronSlice,
    splashScreen: splashScreenReducer,
    notifications: notificationsSlice,
    translationLanguages: translationLanguagesSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
