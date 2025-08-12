import { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveProviderSettings } from '../../../models/provider-settings-slice';
import { getTranslationProvider } from '../../providers';

type Status = 'idle' | 'process' | 'success' | 'error';

const defaultParams = {
  responseMode: 'stringStream',
};

export function useModel() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });
  const [status, setStatus] = useState<Status>('idle');
  const [generatedResponse, setGeneratedResponse] = useState<
    string | Record<number, string>
  >('');
  const [error, setError] = useState<string | null>(null);

  const [translateLanguage, setTranslateLanguage] = useState<'en-ru' | 'ru-en'>(
    'en-ru'
  );
  function toggleTranslateLanguage() {
    setTranslateLanguage((prev) => (prev === 'en-ru' ? 'ru-en' : 'en-ru'));
  }

  const providerSettings = useSelector(selectActiveProviderSettings);

  const handleResponse = useCallback(
    (response: ModelResponse, params: Params) => {
      if (typeof response === 'string' && params.responseMode === 'stringChunk')
        setGeneratedResponse(response);
      else if (
        typeof response === 'object' &&
        params.responseMode === 'arrayStream'
      )
        setGeneratedResponse((prev) => {
          if (typeof prev === 'string') return { 0: prev + response.text };

          return {
            ...prev,
            [response.idx]: (prev[response.idx] || '') + response.text,
          };
        });
      else if (typeof response === 'object')
        setGeneratedResponse((prev) =>
          typeof prev === 'string' ? prev + response.text : ''
        );
    },
    [providerSettings]
  );

  const handleProgress = useCallback((progress: Progress) => {
    setProgressItems(progress);
  }, []);

  async function generate(
    texts: string[] | string,
    params: Params = defaultParams
  ) {
    setStatus('process');
    setGeneratedResponse(params.responseMode === 'arrayStream' ? {} : '');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const provider = getTranslationProvider(providerSettings.provider);
      await provider.generate({
        ...providerSettings.settings,
        text: texts,
        translateLanguage,
        onModelResponse: (response: ModelResponse) =>
          handleResponse(response, params),
        onProgress: handleProgress,
        signal: controller.signal,
        params: params,
      });

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
