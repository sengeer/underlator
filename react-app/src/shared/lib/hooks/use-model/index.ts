import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveProviderSettings } from '../../../models/provider-settings-slice';
import { getTranslationProvider } from '../../providers';

type Status = 'idle' | 'translating' | 'success' | 'error';

export function useModel() {
  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });
  const [status, setStatus] = useState<Status>('idle');
  const [generatedResponse, setGeneratedResponse] = useState<
    Record<number, string>
  >({});
  const [error, setError] = useState<string | null>(null);

  const [translateLanguage, setTranslateLanguage] = useState<'en-ru' | 'ru-en'>(
    'en-ru'
  );
  const toggleTranslateLanguage = () => {
    setTranslateLanguage((prev) => (prev === 'en-ru' ? 'ru-en' : 'en-ru'));
  };

  const providerSettings = useSelector(selectActiveProviderSettings);

  const handleChunk = useCallback((chunk: { idx: number; text: string }) => {
    setGeneratedResponse((prev) => ({
      ...prev,
      [chunk.idx]: (prev[chunk.idx] || '') + chunk.text, // Concatenation
    }));
  }, []);

  const handleProgress = useCallback((progress: Progress) => {
    setProgressItems(progress);
  }, []);

  const generate = async (texts: string[]) => {
    setStatus('translating');
    setGeneratedResponse({});
    setError(null);

    try {
      const provider = getTranslationProvider(providerSettings.provider);
      const finalResult = await provider.generate({
        ...providerSettings,
        text: texts,
        translateLanguage,
        onChunk: handleChunk,
        onProgress: handleProgress,
      });

      // If the provider does not stream, but returns the full result
      if (finalResult) {
        setGeneratedResponse(finalResult);
      }
      setStatus('success');
    } catch (e) {
      const err = e as Error;
      console.error(err.message);
      setError(err.message);
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setGeneratedResponse({});
    setError(null);
  };

  return {
    status,
    progressItems,
    generatedResponse,
    translateLanguage,
    toggleTranslateLanguage,
    error,
    generate,
    reset,
  };
}
