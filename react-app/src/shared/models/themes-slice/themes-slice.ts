/**
 * @module ThemesSlice
 * Redux slice для управления темами приложения.
 * Обеспечивает хранение, выбор и создание пользовательских тем.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemesState, Theme } from './types/themes-slice';

/**
 * Предустановленные темы приложения.
 * Загружаются из themes.json при инициализации.
 * Используются как базовые темы, доступные пользователю по умолчанию.
 */
const defaultThemes: Theme[] = [
  {
    name: 'dracula',
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      main: '#6272a4',
      accent: '#bd93f9',
    },
  },
  {
    name: 'gruvbox',
    colors: {
      background: '#282828',
      foreground: '#ebdbb2',
      main: '#928374',
      accent: '#fe8019',
    },
  },
  {
    name: 'nord',
    colors: {
      background: '#2e3440',
      foreground: '#d8dee9',
      main: '#4c566a',
      accent: '#88c0d0',
    },
  },
  {
    name: 'one dark',
    colors: {
      background: '#282c34',
      foreground: '#abb2bf',
      main: '#5c6370',
      accent: '#61afef',
    },
  },
  {
    name: 'solarized dark',
    colors: {
      background: '#002b36',
      foreground: '#fdf6e3',
      main: '#586e75',
      accent: '#268bd2',
    },
  },
  {
    name: 'monokai',
    colors: {
      background: '#272822',
      foreground: '#f8f8f2',
      main: '#75715e',
      accent: '#a6e22e',
    },
  },
  {
    name: 'tomorrow night',
    colors: {
      background: '#1d1f21',
      foreground: '#c5c8c6',
      main: '#969896',
      accent: '#b294bb',
    },
  },
  {
    name: 'material dark',
    colors: {
      background: '#263238',
      foreground: '#eceff1',
      main: '#546e7a',
      accent: '#82b1ff',
    },
  },
  {
    name: 'ayu dark',
    colors: {
      background: '#0f1419',
      foreground: '#e6e1cf',
      main: '#3e4b59',
      accent: '#ffb454',
    },
  },
  {
    name: 'catppuccin mocha',
    colors: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      main: '#6c7086',
      accent: '#cba6f7',
    },
  },
  {
    name: 'kanagawa',
    colors: {
      background: '#1f1f28',
      foreground: '#dcd7ba',
      main: '#54546d',
      accent: '#957fb8',
    },
  },
  {
    name: 'tokyo night',
    colors: {
      background: '#1a1b26',
      foreground: '#c0caf5',
      main: '#565f89',
      accent: '#7aa2f7',
    },
  },
  {
    name: 'rose pine',
    colors: {
      background: '#191724',
      foreground: '#e0def4',
      main: '#6e6a86',
      accent: '#eb6f92',
    },
  },
  {
    name: 'everforest',
    colors: {
      background: '#2d353b',
      foreground: '#d3c6aa',
      main: '#859289',
      accent: '#a7c080',
    },
  },
];

/**
 * Начальное состояние управления темами.
 * Используется при первом запуске приложения или при отсутствии сохраненных данных.
 */
const initialState: ThemesState = {
  themes: defaultThemes,
  activeTheme: 'dracula',
};

/**
 * Redux slice для управления темами.
 * Содержит reducers для выбора темы и добавления пользовательских тем.
 */
const themesSlice = createSlice({
  name: 'themes',
  initialState,
  reducers: {
    /**
     * Устанавливает активную тему.
     * Применяет цветовую схему выбранной темы к CSS переменным приложения.
     *
     * @param state - Текущее состояние тем.
     * @param action - Действие с названием темы для активации.
     */
    setActiveTheme(state, action: PayloadAction<string>) {
      const themeName = action.payload;
      const theme = state.themes.find((t) => t.name === themeName);

      if (theme) {
        state.activeTheme = themeName;
        // Применяет цвета темы к CSS переменным
        document.documentElement.style.setProperty('--main', theme.colors.main);
        document.documentElement.style.setProperty(
          '--background',
          theme.colors.background
        );
        document.documentElement.style.setProperty(
          '--accent',
          theme.colors.accent
        );
        document.documentElement.style.setProperty(
          '--foreground',
          theme.colors.foreground
        );
      }
    },
    /**
     * Добавляет новую пользовательскую тему.
     * Позволяет пользователю создавать собственные цветовые схемы.
     * Если тема с таким именем уже существует, обновляет её.
     *
     * @param state - Текущее состояние тем.
     * @param action - Действие с новой темой для добавления.
     */
    addTheme(state, action: PayloadAction<Theme>) {
      const existingIndex = state.themes.findIndex(
        (t) => t.name === action.payload.name
      );

      if (existingIndex >= 0) {
        // Обновляет существующую тему
        state.themes[existingIndex] = action.payload;
      } else {
        // Добавляет новую тему
        state.themes.push(action.payload);
      }
    },
    /**
     * Удаляет пользовательскую тему.
     * Предустановленные темы (dracula, sand) не могут быть удалены.
     *
     * @param state - Текущее состояние тем.
     * @param action - Действие с названием темы для удаления.
     */
    removeTheme(state, action: PayloadAction<string>) {
      const themeName = action.payload;
      // Защита от удаления предустановленных тем
      // Проверка выполняется по списку defaultThemes для предотвращения удаления системных тем
      const isDefaultTheme = defaultThemes.some((t) => t.name === themeName);

      if (!isDefaultTheme) {
        state.themes = state.themes.filter((t) => t.name !== themeName);
        // Если удаляемая тема была активной, переключает на первую доступную
        if (state.activeTheme === themeName && state.themes.length > 0) {
          state.activeTheme = state.themes[0].name;
        }
      }
    },
  },
});

export const { setActiveTheme, addTheme, removeTheme } = themesSlice.actions;

/**
 * Селектор для получения состояния тем.
 * Возвращает полное состояние управления темами из Redux store.
 *
 * @param state - Корневое состояние приложения.
 * @returns Состояние управления темами.
 */
export const selectThemes = (state: { themes: ThemesState }) => state.themes;

/**
 * Селектор для получения активной темы.
 * Возвращает объект темы, соответствующей активной теме.
 *
 * @param state - Корневое состояние приложения.
 * @returns Активная тема или undefined, если тема не найдена.
 */
export const selectActiveTheme = (state: { themes: ThemesState }) => {
  const { themes, activeTheme } = state.themes;
  return themes.find((t) => t.name === activeTheme);
};
export default themesSlice.reducer;
