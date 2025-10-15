/**
 * @module ElementStateSlice
 * Redux slice для управления состоянием элементов интерфейса.
 */

import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { Elements } from './types/element-state-slice';

const initialState: Elements = {
  elements: ['textTranslationSection'],
};

const elementStateSlice = createSlice({
  name: 'elements',
  initialState,
  reducers: {
    openElement: (state, action: PayloadAction<string>) => {
      state.elements.push(action.payload);
    },
    closeElement: (state, action: PayloadAction<string>) => {
      state.elements = state.elements.filter((x) => x !== action.payload);
    },
    /**
     * Открывает указанный элемент и закрывает все остальные.
     * Удобно для переключения между секциями приложения.
     *
     * @param state - Текущее состояние элементов.
     * @param action - Действие с названием элемента для открытия.
     */
    openElementOnly: (state, action: PayloadAction<string>) => {
      state.elements = [action.payload];
    },
  },
});

export const isElementOpen = createSelector(
  [
    (state: { elements: Elements }) => state.elements,
    (_, elementId: string) => elementId,
  ],
  (elements, elementId) => elements.elements.some((x) => x === elementId)
);

export const { openElement, closeElement, openElementOnly } =
  elementStateSlice.actions;

export default elementStateSlice.reducer;
