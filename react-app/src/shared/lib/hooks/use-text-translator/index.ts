import { useState, useEffect, useCallback } from 'react';

interface Progress {
  file: string;
  progress: number;
}

type Status = 'idle' | 'translating' | 'success' | 'error';

export function useTextTranslator() {
  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });
  const [status, setStatus] = useState<Status>('idle');
  const [translateLanguage, setTranslateLanguage] = useState<'en-ru' | 'ru-en'>(
    'en-ru'
  );

  const toggleTranslateLanguage = () => {
    setTranslateLanguage((prev) => (prev === 'en-ru' ? 'ru-en' : 'en-ru'));
  };

  const [translatedChunks, setTranslatedChunks] = useState<
    Record<number, string>
  >({});
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = useCallback((message: any) => {
    switch (message.status) {
      case 'progress':
        if (message.data) setProgressItems(message.data);
        break;
      case 'chunk':
        if (
          message.data?.idx !== undefined &&
          message.data?.text !== undefined
        ) {
          setTranslatedChunks((prev) => ({
            ...prev,
            [message.data.idx]: message.data.text,
          }));
        }
        break;
      case 'complete':
        setStatus('success');
        setProgressItems({ file: '', progress: 0 });
        break;
      case 'error':
        setError(message.error || 'Unknown error');
        setStatus('error');
        break;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.onStatus(handleStatusUpdate);
    return () => {
      unsubscribe();
    };
  }, [handleStatusUpdate]);

  const translateChunks = async (texts: string[]) => {
    setStatus('translating');
    setTranslatedChunks({});
    setError(null);

    const DELIM = '␟'; // U+241F
    const joinedText = texts.join(DELIM);

    try {
      await window.electron.run({
        translate: translateLanguage,
        text: joinedText,
        delimiter: DELIM,
      });
    } catch (e) {
      const err = e as Error;
      console.error(err.message);
      setError(err.message);
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setTranslatedChunks({});
    setError(null);
  };

  return {
    status,
    progressItems,
    translatedChunks,
    translateLanguage,
    toggleTranslateLanguage,
    error,
    translateChunks,
    reset,
  };
}
