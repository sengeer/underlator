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
      languageInEn: 'Chinese',
      code: 'zh',
      placeholder: '你好',
    },
    {
      language: t`english`,
      languageInEn: 'English',
      code: 'en',
      placeholder: 'Hello',
    },
    {
      language: t`french`,
      languageInEn: 'French',
      code: 'fr',
      placeholder: 'Bonjour',
    },
    {
      language: t`portuguese`,
      languageInEn: 'Portuguese',
      code: 'pt',
      placeholder: 'Olá',
    },
    {
      language: t`spanish`,
      languageInEn: 'Spanish',
      code: 'es',
      placeholder: 'Hola',
    },
    {
      language: t`japanese`,
      languageInEn: 'Japanese',
      code: 'ja',
      placeholder: 'こんにちは',
    },
    {
      language: t`turkish`,
      languageInEn: 'Turkish',
      code: 'tr',
      placeholder: 'Merhaba',
    },
    {
      language: t`russian`,
      languageInEn: 'Russian',
      code: 'ru',
      placeholder: 'Здравствуйте',
    },
    {
      language: t`arabic`,
      languageInEn: 'Arabic',
      code: 'ar',
      placeholder: 'مرحبًا',
    },
    {
      language: t`korean`,
      languageInEn: 'Korean',
      code: 'ko',
      placeholder: '녕하세요',
    },
    {
      language: t`thai`,
      languageInEn: 'Thai',
      code: 'th',
      placeholder: 'สวัสดี',
    },
    {
      language: t`italian`,
      languageInEn: 'Italian',
      code: 'it',
      placeholder: 'Ciao',
    },
    {
      language: t`german`,
      languageInEn: 'German',
      code: 'de',
      placeholder: 'Hallo',
    },
    {
      language: t`vietnamese`,
      languageInEn: 'Vietnamese',
      code: 'vi',
      placeholder: 'Xin chào',
    },
    {
      language: t`malay`,
      languageInEn: 'Malay',
      code: 'ms',
      placeholder: 'Salam',
    },
    {
      language: t`indonesian`,
      languageInEn: 'Indonesian',
      code: 'id',
      placeholder: 'Halo',
    },
    {
      language: t`filipino`,
      languageInEn: 'Filipino',
      code: 'tl',
      placeholder: 'Kamusta',
    },
    {
      language: t`hindi`,
      languageInEn: 'Hindi',
      code: 'hi',
      placeholder: 'नमस्ते',
    },
    {
      language: t`traditional chinese`,
      languageInEn: 'Traditional Chinese',
      code: 'zh-Hant',
      placeholder: '您好',
    },
    {
      language: t`polish`,
      languageInEn: 'Polish',
      code: 'pl',
      placeholder: 'Cześć',
    },
    {
      language: t`czech`,
      languageInEn: 'Czech',
      code: 'cs',
      placeholder: 'Dobrý den',
    },
    {
      language: t`dutch`,
      languageInEn: 'Dutch',
      code: 'nl',
      placeholder: 'Hallo',
    },
    {
      language: t`khmer`,
      languageInEn: 'Khmer',
      code: 'km',
      placeholder: 'សួស្តី',
    },
    {
      language: t`burmese`,
      languageInEn: 'Burmese',
      code: 'my',
      placeholder: 'မင်္ဂလာပါ',
    },
    {
      language: t`persian`,
      languageInEn: 'Persian',
      code: 'fa',
      placeholder: 'سلام',
    },
    {
      language: t`gujarati`,
      languageInEn: 'Gujarati',
      code: 'gu',
      placeholder: 'નમસ્તે',
    },
    {
      language: t`urdu`,
      languageInEn: 'Urdu',
      code: 'ur',
      placeholder: 'اہلا',
    },
    {
      language: t`telugu`,
      languageInEn: 'Telugu',
      code: 'te',
      placeholder: 'నమస్తే',
    },
    {
      language: t`marathi`,
      languageInEn: 'Marathi',
      code: 'mr',
      placeholder: 'नमस्ते',
    },
    {
      language: t`hebrew`,
      languageInEn: 'Hebrew',
      code: 'he',
      placeholder: 'שלום',
    },
    {
      language: t`bengali`,
      languageInEn: 'Bengali',
      code: 'bn',
      placeholder: 'নমস্কার',
    },
    {
      language: t`tamil`,
      languageInEn: 'Tamil',
      code: 'ta',
      placeholder: 'நமஸ்தே',
    },
    {
      language: t`ukrainian`,
      languageInEn: 'Ukrainian',
      code: 'uk',
      placeholder: 'Привіт',
    },
    {
      language: t`tibetan`,
      languageInEn: 'Tibetan',
      code: 'bo',
      placeholder: 'བཀྲ་ཤིས་བདེ་ལེགས་',
    },
    {
      language: t`kazakh`,
      languageInEn: 'Kazakh',
      code: 'kk',
      placeholder: 'Қайырлы күн',
    },
    {
      language: t`mongolian`,
      languageInEn: 'Mongolian',
      code: 'mn',
      placeholder: 'ᠰᠠᠶᠢᠨ ᠪᠠᠶᠢᠨ᠋᠎ᠠ ᠤᠤ',
    },
    {
      language: t`uyghur`,
      languageInEn: 'Uyghur',
      code: 'ug',
      placeholder: 'Әссаламу әләйкум',
    },
    {
      language: t`cantonese`,
      languageInEn: 'Cantonese',
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

  /**
   * Получение названия языка на английском.
   * Используется для получения названия языка на английском по его локали.
   *
   * @param languageLocalization - Переведенное название языка.
   * @returns Исходное название языка на английском или пустую строку.
   */
  function getLanguageInEn(languageLocalization: string): string {
    const foundLanguage = translationLanguages.find(
      (lang) => lang.language === languageLocalization
    );

    return foundLanguage?.languageInEn || '';
  }

  return {
    sourceLanguage,
    targetLanguage,
    translationLanguages,
    getPlaceholderByLanguage,
    handleSourceLanguageSelection,
    handleTargetLanguageSelection,
    switchLanguages,
    getLanguageInEn,
  };
}

export default useTranslationLanguages;
