import { configureStore } from '@reduxjs/toolkit';
import panelsSlice from '../../shared/model/panel-slice';
import viewSlice from '../../shared/model/view-slice';

const store = configureStore({
  reducer: {
    panels: panelsSlice,
    view: viewSlice,
  },
});

export default store;
