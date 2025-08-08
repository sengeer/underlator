import { configureStore } from '@reduxjs/toolkit';
import elementStateSlice from '../../shared/models/element-state-slice';
import modelsManagementSlice from '../../shared/models/models-management-slice';
import providerSettingsSlice from '../../shared/models/provider-settings-slice';

const store = configureStore({
  reducer: {
    elements: elementStateSlice,
    providerSettings: providerSettingsSlice,
    modelsManagement: modelsManagementSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
