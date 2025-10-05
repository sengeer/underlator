/**
 * @module UseTranslationLanguages
 * Хук UseTranslationLanguages для выбора языков перевода.
 */

import { useLingui } from '@lingui/react/macro';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectTranslationLanguages,
  setSourceLanguage,
  setTargetLanguage,
} from '../../../models/translation-languages-slice';

function useTranslationLanguages() {
  const { t } = useLingui();
  const dispatch = useDispatch();

  const { sourceLanguage, targetLanguage } = useSelector(
    selectTranslationLanguages
  );

  const translationLanguages = [
    {
      language: t`chinese`,
      code: 'zh',
      placeholder: '你好',
    },
    {
      language: t`english`,
      code: 'en',
      placeholder: 'Hello',
    },
    {
      language: t`french`,
      code: 'fr',
      placeholder: 'Bonjour',
    },
    {
      language: t`portuguese`,
      code: 'pt',
      placeholder: 'Olá',
    },
    {
      language: t`spanish`,
      code: 'es',
      placeholder: 'Hola',
    },
    {
      language: t`japanese`,
      code: 'ja',
      placeholder: 'こんにちは',
    },
    {
      language: t`turkish`,
      code: 'tr',
      placeholder: 'Merhaba',
    },
    {
      language: t`russian`,
      code: 'ru',
      placeholder: 'Здравствуйте',
    },
    {
      language: t`arabic`,
      code: 'ar',
      placeholder: 'مرحبًا',
    },
    {
      language: t`korean`,
      code: 'ko',
      placeholder: '녕하세요',
    },
    {
      language: t`thai`,
      code: 'th',
      placeholder: 'สวัสดี',
    },
    {
      language: t`italian`,
      code: 'it',
      placeholder: 'Ciao',
    },
    {
      language: t`german`,
      code: 'de',
      placeholder: 'Hallo',
    },
    {
      language: t`vietnamese`,
      code: 'vi',
      placeholder: 'Xin chào',
    },
    {
      language: t`malay`,
      code: 'ms',
      placeholder: 'Salam',
    },
    {
      language: t`indonesian`,
      code: 'id',
      placeholder: 'Halo',
    },
    {
      language: t`filipino`,
      code: 'tl',
      placeholder: 'Kamusta',
    },
    {
      language: t`hindi`,
      code: 'hi',
      placeholder: 'नमस्ते',
    },
    {
      language: t`traditional chinese`,
      code: 'zh-Hant',
      placeholder: '您好',
    },
    {
      language: t`polish`,
      code: 'pl',
      placeholder: 'Cześć',
    },
    {
      language: t`czech`,
      code: 'cs',
      placeholder: 'Dobrý den',
    },
    {
      language: t`dutch`,
      code: 'nl',
      placeholder: 'Hallo',
    },
    {
      language: t`khmer`,
      code: 'km',
      placeholder: 'សួស្តី',
    },
    {
      language: t`burmese`,
      code: 'my',
      placeholder: 'မင်္ဂလာပါ',
    },
    {
      language: t`persian`,
      code: 'fa',
      placeholder: 'سلام',
    },
    {
      language: t`gujarati`,
      code: 'gu',
      placeholder: 'નમસ્તે',
    },
    {
      language: t`urdu`,
      code: 'ur',
      placeholder: 'اہلا',
    },
    {
      language: t`telugu`,
      code: 'te',
      placeholder: 'నమస్తే',
    },
    {
      language: t`marathi`,
      code: 'mr',
      placeholder: 'नमस्ते',
    },
    {
      language: t`hebrew`,
      code: 'he',
      placeholder: 'שלום',
    },
    {
      language: t`bengali`,
      code: 'bn',
      placeholder: 'নমস্কার',
    },
    {
      language: t`tamil`,
      code: 'ta',
      placeholder: 'நமஸ்தே',
    },
    {
      language: t`ukrainian`,
      code: 'uk',
      placeholder: 'Привіт',
    },
    {
      language: t`tibetan`,
      code: 'bo',
      placeholder: 'བཀྲ་ཤིས་བདེ་ལེགས་',
    },
    {
      language: t`kazakh`,
      code: 'kk',
      placeholder: 'Қайырлы күн',
    },
    {
      language: t`mongolian`,
      code: 'mn',
      placeholder: 'ᠰᠠᠶᠢᠨ ᠪᠠᠶᠢᠨ᠋᠎ᠠ ᠤᠤ',
    },
    {
      language: t`uyghur`,
      code: 'ug',
      placeholder: 'Әссаламу әләйкум',
    },
    {
      language: t`cantonese`,
      code: 'yue',
      placeholder: '你好',
    },
  ];

  /**
   * Получает placeholder для указанного языка из списка доступных языков перевода.
   * Используется для отображения примера текста на выбранном языке в полях ввода.
   *
   * @param language - Название языка для которого нужно получить placeholder.
   * @returns placeholder текст на указанном языке или пустую строку если язык не найден.
   */
  function getPlaceholderByLanguage(language: string): string {
    const foundLanguage = translationLanguages.find(
      (lang) => lang.language === language
    );

    return foundLanguage?.placeholder || '';
  }

  /**
   * Обрабатывает выбор исходного языка.
   * Если выбранный язык совпадает с целевым языком, языки меняются местами.
   * Иначе просто устанавливается новый исходный язык.
   *
   * @param selectedLanguage - Выбранный пользователем язык.
   */
  function handleSourceLanguageSelection(selectedLanguage: string) {
    if (selectedLanguage === targetLanguage) {
      // Если выбранный язык совпадает с целевым, меняет языки местами
      dispatch(setSourceLanguage(targetLanguage));
      dispatch(setTargetLanguage(sourceLanguage));
    } else {
      // Иначе просто устанавливает новый исходный язык
      dispatch(setSourceLanguage(selectedLanguage));
    }
  }

  /**
   * Обрабатывает выбор целевого языка.
   * Если выбранный язык совпадает с исходным языком, языки меняются местами.
   * Иначе просто устанавливается новый целевой язык.
   *
   * @param selectedLanguage - Выбранный пользователем язык.
   */
  function handleTargetLanguageSelection(selectedLanguage: string) {
    if (selectedLanguage === sourceLanguage) {
      // Если выбранный язык совпадает с исходным, меняет языки местами
      dispatch(setSourceLanguage(targetLanguage));
      dispatch(setTargetLanguage(sourceLanguage));
    } else {
      // Иначе просто устанавливает новый целевой язык
      dispatch(setTargetLanguage(selectedLanguage));
    }
  }

  /**
   * Меняет исходный и целевой языки местами.
   * Используется при нажатии на кнопку переключения языков.
   */
  function switchLanguages() {
    dispatch(setSourceLanguage(targetLanguage));
    dispatch(setTargetLanguage(sourceLanguage));
  }

  return {
    sourceLanguage,
    targetLanguage,
    translationLanguages,
    getPlaceholderByLanguage,
    handleSourceLanguageSelection,
    handleTargetLanguageSelection,
    switchLanguages,
  };
}

export default useTranslationLanguages;
