import { configureStore } from '@reduxjs/toolkit';
import splashScreenReducer from '../../pages/main/models/splash-screen-slice';
import elementStateSlice from '../../shared/models/element-state-slice';
import providerSettingsSlice from '../../shared/models/provider-settings-slice';
import manageEmbeddedOllamaSlice from '../../widgets/settings/models/manage-embedded-ollama-slice';

const store = configureStore({
  reducer: {
    elements: elementStateSlice,
    providerSettings: providerSettingsSlice,
    manageModels: manageEmbeddedOllamaSlice,
    splashScreen: splashScreenReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
