import { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveProviderSettings } from '../../../models/provider-settings-slice';
import { getTranslationProvider } from '../../providers';

type Status = 'idle' | 'process' | 'success' | 'error';

interface Params {
  responseMode: 'stream' | 'chunk' | string;
  instruction?: string;
}

const defaultParams = {
  responseMode: 'stream',
};

export function useModel() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });
  const [status, setStatus] = useState<Status>('idle');
  const [generatedResponse, setGeneratedResponse] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [translateLanguage, setTranslateLanguage] = useState<'en-ru' | 'ru-en'>(
    'en-ru'
  );
  function toggleTranslateLanguage() {
    setTranslateLanguage((prev) => (prev === 'en-ru' ? 'ru-en' : 'en-ru'));
  }

  const providerSettings = useSelector(selectActiveProviderSettings);

  const handleChunk = useCallback(
    (chunk: { idx: number; text: string }, params: Params) => {
      if (
        providerSettings.provider === 'Electron IPC' &&
        params.responseMode === 'chunk'
      )
        setGeneratedResponse(chunk.text);
      else setGeneratedResponse((prev) => prev + chunk.text);
    },
    []
  );

  const handleProgress = useCallback((progress: Progress) => {
    setProgressItems(progress);
  }, []);

  async function generate(texts: string[], params: Params = defaultParams) {
    setStatus('process');
    setGeneratedResponse('');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    function wrappedHandleChunk(chunk: { idx: number; text: string }) {
      handleChunk(chunk, params);
    }

    try {
      const provider = getTranslationProvider(providerSettings.provider);
      const finalResult = await provider.generate({
        ...providerSettings.settings,
        text: texts,
        translateLanguage,
        onChunk: wrappedHandleChunk,
        onProgress: handleProgress,
        prompt: params.instruction,
        signal: controller.signal,
      });

      // If the provider does not stream, but returns the full result
      if (finalResult) {
        setGeneratedResponse(Object.values(finalResult).join(' '));
      }
      setStatus('success');
    } catch (e) {
      const err = e as Error;
      console.error(err.message);
      setError(err.message);
      setStatus('error');
    } finally {
      abortControllerRef.current = null;
    }
  }

  function reset() {
    setStatus('idle');
    setGeneratedResponse('');
    setError(null);
  }

  function stop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  return {
    status,
    progressItems,
    generatedResponse,
    translateLanguage,
    toggleTranslateLanguage,
    error,
    generate,
    reset,
    stop,
  };
}
