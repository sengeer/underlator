import { configureStore } from '@reduxjs/toolkit';
import elementStateSlice from '../../shared/model/element-state-slice';

export default configureStore({
  reducer: {
    elements: elementStateSlice,
  },
});
