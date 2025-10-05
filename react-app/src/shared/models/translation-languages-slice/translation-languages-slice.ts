/**
 * @module TranslationLanguagesSlice
 * Redux slice для управления языками перевода.
 * Обеспечивает хранение и обновление исходного и целевого языков для операций перевода.
 * Используется в компонентах перевода текста и PDF документов.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TranslationLanguagesState } from './types/translation-languages-slice';

/**
 * Начальное состояние языков перевода.
 * Пустые строки инициализируются значениями по умолчанию в Main компоненте.
 * Это обеспечивает гибкость в выборе языков при запуске приложения.
 */
const initialState: TranslationLanguagesState = {
  sourceLanguage: '',
  targetLanguage: '',
};

/**
 * Redux slice для управления языками перевода.
 * Содержит reducers для установки исходного и целевого языков.
 * Используется в useModel хуке для передачи языковых настроек в LLM.
 */
const translationLanguagesSlice = createSlice({
  name: 'translationLanguages',
  initialState,
  reducers: {
    /**
     * Устанавливает исходный язык для перевода.
     * Обновляет язык, с которого выполняется перевод текста.
     *
     * @param state - Текущее состояние языков перевода.
     * @param action - Действие с названием исходного языка.
     */
    setSourceLanguage: (state, action: PayloadAction<string>) => {
      state.sourceLanguage = action.payload;
    },
    /**
     * Устанавливает целевой язык для перевода.
     * Обновляет язык, на который выполняется перевод текста.
     *
     * @param state - Текущее состояние языков перевода.
     * @param action - Действие с названием целевого языка.
     */
    setTargetLanguage: (state, action: PayloadAction<string>) => {
      state.targetLanguage = action.payload;
    },
  },
});

export const { setSourceLanguage, setTargetLanguage } =
  translationLanguagesSlice.actions;

/**
 * Селектор для получения состояния языков перевода.
 * Возвращает полное состояние языков перевода из Redux store.
 * Используется в useModel и useTranslationLanguages хуках.
 *
 * @param state - Корневое состояние приложения.
 * @returns Состояние языков перевода.
 */
export const selectTranslationLanguages = (state: any) =>
  state.translationLanguages;

export default translationLanguagesSlice.reducer;
