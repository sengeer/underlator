export interface ProviderSettings {
  [key: string]: any;
}

export interface ProviderSettingsState {
  provider: ProviderType;
  settings: {
    [providerName in ProviderType]?: ProviderSettings;
  };
}

export interface State {
  providerSettings: ProviderSettingsState;
}
