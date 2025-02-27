import { useState } from 'react';

export function useTranslate() {
  const [translateLanguage, setTranslateLanguage] = useState<'en-ru' | 'ru-en'>(
    'en-ru'
  );

  const [input, setInput] = useState('');

  const toggleTranslateLanguage = () => {
    setTranslateLanguage((prev) => (prev === 'en-ru' ? 'ru-en' : 'en-ru'));
  };

  const translate = async (text: string) => {
    try {
      await window.electron.run({
        translate: translateLanguage,
        text: input || text,
      });
    } catch (error) {
      console.error((error as Error).message);
    }
  };

  return {
    translateLanguage,
    setTranslateLanguage,
    input,
    setInput,
    toggleTranslateLanguage,
    translate,
  };
}
