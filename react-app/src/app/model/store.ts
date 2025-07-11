import { configureStore } from '@reduxjs/toolkit';
import elementStateSlice from '../../shared/models/element-state-slice';
import providerSettingsSlice from '../../shared/models/provider-settings-slice';

export default configureStore({
  reducer: {
    elements: elementStateSlice,
    providerSettings: providerSettingsSlice,
  },
});
