/**
 * @module UseModel
 * Основной хук для работы с LLM моделями.
 * Предоставляет единый интерфейс для взаимодействия с различными провайдерами.
 * Поддерживает перевод, инструкции, контекстный перевод и streaming ответы.
 */

import { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveProviderSettings } from '../../../models/provider-settings-slice';
import { getModelUseProvider } from './get-model-use-provider';
import { Status } from './types/use-model';

/**
 * Хук для работы с LLM моделями.
 * Управляет состоянием генерации, переключением языков и обработкой ответов.
 * Поддерживает различные провайдеры (Ollama, Embedded Ollama) и режимы работы.
 * @returns Объект с методами и состоянием для работы с моделями.
 */
function useModel() {
  // Контроллер для отмены операций
  const abortControllerRef = useRef<AbortController | null>(null);

  // Состояние выполнения операции
  const [status, setStatus] = useState<Status>('idle');
  // Сгенерированный ответ (строка или объект с индексами)
  const [generatedResponse, setGeneratedResponse] = useState<
    string | Record<number, string>
  >('');
  // Ошибка выполнения операции
  const [error, setError] = useState<string | null>(null);

  // Направление перевода
  const [translateLanguage, setTranslateLanguage] = useState<'en-ru' | 'ru-en'>(
    'en-ru'
  );

  /**
   * Переключает направление перевода.
   * Меняет язык с en-ru на ru-en и обратно.
   */
  function toggleTranslateLanguage() {
    setTranslateLanguage((prev) => (prev === 'en-ru' ? 'ru-en' : 'en-ru'));
  }

  // Настройки активного провайдера из Redux store
  const providerSettings = useSelector(selectActiveProviderSettings);

  /**
   * Обрабатывает ответы от модели.
   * Обновляет состояние в зависимости от режима ответа (arrayStream/stringStream).
   * @param response - Ответ от модели (строка или объект с индексом).
   * @param params - Параметры генерации для определения режима.
   */
  const handleResponse = useCallback(
    (response: ModelResponse, params: UseModelParams) => {
      // Обработка массива ответов для контекстного перевода
      if (typeof response === 'object' && params.responseMode === 'arrayStream')
        setGeneratedResponse((prev) => {
          if (typeof prev === 'string') return { 0: prev + response.text };

          return {
            ...prev,
            [response.idx]: (prev[response.idx] || '') + response.text,
          };
        });
      // Обработка строкового ответа для простого перевода
      else if (
        typeof response === 'string' &&
        params.responseMode === 'stringStream'
      )
        setGeneratedResponse((prev) =>
          typeof prev === 'string' ? prev + response : ''
        );
    },
    [providerSettings]
  );

  /**
   * Генерирует текст через активный провайдер.
   * Запускает процесс генерации с указанными параметрами.
   * @param texts - Текст или массив текстов для обработки.
   * @param params - Параметры генерации (по умолчанию DEFAULT_PARAMS).
   * @param options - Дополнительные опции модели, например think.
   */
  async function generate(
    texts: string[] | string,
    params: UseModelParams,
    options: OllamaGenerateOptions
  ) {
    setStatus('process');
    setGeneratedResponse(params.responseMode === 'arrayStream' ? {} : '');
    setError(null);

    // Создание контроллера для отмены операции
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Получение провайдера по типу из настроек
      const provider = getModelUseProvider(providerSettings.provider);
      await provider.generate({
        ...providerSettings.settings,
        text: texts,
        translateLanguage,
        onModelResponse: (response: ModelResponse) =>
          handleResponse(response, params),
        params: params,
        options: options,
        signal: controller.signal,
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

  /**
   * Сбрасывает состояние хука.
   * Возвращает все значения к начальному состоянию.
   */
  function reset() {
    setStatus('idle');
    setGeneratedResponse('');
    setError(null);
  }

  /**
   * Останавливает текущую операцию генерации.
   * Отменяет HTTP запрос и дополнительно останавливает IPC для Embedded Ollama.
   */
  function stop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();

      // Дополнительно вызываем IPC остановку для Embedded Ollama
      if (providerSettings.provider === 'Embedded Ollama') {
        window.electron.ollama.stop().catch((error: Error) => {
          console.error('❌ Failed to stop generation via IPC:', error);
        });
      }
    }
  }

  return {
    /** Статус выполнения операции */
    status,
    /** Сгенерированный ответ от модели */
    generatedResponse,
    /** Текущее направление перевода */
    translateLanguage,
    /** Функция переключения направления перевода */
    toggleTranslateLanguage,
    /** Ошибка выполнения операции */
    error,
    /** Функция запуска генерации */
    generate,
    /** Функция сброса состояния */
    reset,
    /** Функция остановки операции */
    stop,
  };
}

export default useModel;
