import { useState, useEffect, useCallback } from 'react';

type Status = 'idle' | 'translating' | 'success' | 'error';

export function usePdfBlockTranslator() {
  const [status, setStatus] = useState<Status>('idle');
  const [translatedChunks, setTranslatedChunks] = useState<
    Record<number, string>
  >({});
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = useCallback((message: any) => {
    switch (message.status) {
      case 'block-chunk':
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
        break;
      case 'block-error':
        setError(message.error || 'Unknown error');
        setStatus('error');
        break;
      default:
        // Игнорируем другие статусы
        break;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.onStatus(handleStatusUpdate);
    return () => {
      unsubscribe();
    };
  }, [handleStatusUpdate]);

  const translateBlock = async (
    texts: string[],
    language: 'en-ru' | 'ru-en'
  ) => {
    setStatus('translating');
    setTranslatedChunks({});
    setError(null);

    const DELIM = '␟'; // U+241F
    const joinedText = texts.join(DELIM);

    try {
      // Адаптируем вызов под API, которое ожидает `useTranslate`
      await window.electron.run({
        translate: language,
        text: joinedText,
        isBlockTranslation: true, // Добавим флаг, чтобы основной процесс понял, что это блочный перевод
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
    translatedChunks,
    error,
    translateBlock,
    reset,
  };
}
