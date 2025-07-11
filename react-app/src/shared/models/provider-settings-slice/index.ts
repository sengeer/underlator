import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProviderType } from '../../providers';

interface InitialState {
  provider: ProviderType;
  // ollamaModel: string;
  // ... другие настройки
}

interface State {
  providerSettings: any;
}

const initialState: InitialState = {
  provider: 'local', // default
  // ollamaModel: 'llama3',
};

export const providerSettingsSlice = createSlice({
  name: 'providerSettings',
  initialState,
  reducers: {
    setProvider(state, action: PayloadAction<ProviderType>) {
      state.provider = action.payload;
    },
    // setOllamaModel(state, action: PayloadAction<string>) {
    //   state.ollamaModel = action.payload;
    // },
  },
});

// export const { setProvider, setOllamaModel } = translationSettingsSlice.actions;
export const { setProvider } = providerSettingsSlice.actions;

export const selectProviderSettings = (state: State) => state.providerSettings;

export default providerSettingsSlice.reducer;
