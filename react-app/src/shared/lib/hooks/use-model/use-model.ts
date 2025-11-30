/**
 * @module UseModel
 * Основной хук UseModel для работы с LLM моделями.
 * Предоставляет единый интерфейс для взаимодействия с LLM.
 * Поддерживает перевод, инструкции, контекстный перевод и streaming ответы.
 */

import { useLingui } from '@lingui/react/macro';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectActiveProviderSettings } from '../../../models/provider-settings-slice';
import { selectTranslationLanguages } from '../../../models/translation-languages-slice';
import { DEFAULT_URL } from '../../constants';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import useTranslationLanguages from '../use-translation-languages/use-translation-languages';
import featureProvider from './feature-provider';
import { ModelRequestContext } from './types/feature-provider';
import { Status } from './types/use-model';

// Определяет тип для ключей фич
type FeatureType = keyof typeof featureProvider;

/**
 * Хук для работы с LLM моделями.
 * Управляет состоянием генерации, переключением языков и обработкой ответов.
 * Поддерживает различные провайдеры и режимы работы.
 *
 * @returns Объект с методами и состоянием для работы с моделями.
 */
function useModel() {
  // Контроллер для отмены операций
  const abortControllerRef = useRef<AbortController | null>(null);
  const { getLanguageInEn } = useTranslationLanguages();

  const dispatch = useDispatch();
  const { t } = useLingui();

  // Состояние выполнения операции
  const [status, setStatus] = useState<Status>('idle');
  // Сгенерированный ответ (строка или объект с индексами)
  const [generatedResponse, setGeneratedResponse] = useState<
    string | Record<number, string>
  >('');

  // Ошибка выполнения операции
  const [error, setError] = useState<string | null>(null);
  // Настройки активного провайдера из Redux store
  const providerSettings = useSelector(selectActiveProviderSettings);

  const { sourceLanguage, targetLanguage } = useSelector(
    selectTranslationLanguages
  );

  /**
   * Обрабатывает ответы от модели.
   * Обновляет состояние в зависимости от режима ответа (arrayStream/stringStream).
   *
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
   * Функция для выполнения генерации.
   * Принимает `featureType` для динамического вызова метода из `featureProvider`.
   *
   * @param texts - Текст или массив текстов для обработки.
   * @param params - Параметры генерации.
   * @param options - Дополнительные опции модели.
   * @param featureType - Тип использования.
   */
  async function executeGeneration(
    texts: string[] | string,
    params: UseModelParams,
    options: GenerateOptions,
    featureType: FeatureType
  ) {
    setStatus('process');
    setGeneratedResponse(params.responseMode === 'arrayStream' ? {} : '');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Собирает контекст запроса
      const requestContext: ModelRequestContext = {
        config: {
          id: (providerSettings.settings as any)?.id || 'embedded-ollama',
          url: providerSettings.settings.url || DEFAULT_URL,
        },
        ragConfig: {
          topK: providerSettings.rag.topK,
          similarityThreshold: providerSettings.rag.similarityThreshold,
          embeddingModel: providerSettings.rag.model,
        },
        model: providerSettings.settings.model,
        text: texts,
        sourceLanguage: getLanguageInEn(sourceLanguage),
        targetLanguage: getLanguageInEn(targetLanguage),
        onModelResponse: (response: ModelResponse) =>
          handleResponse(response, params),
        params: params,
        options: options,
        signal: controller.signal,
        t,
        dispatch,
        chatId: params.chatId,
        saveHistory: params.saveHistory,
      };

      const featureMethod = featureProvider[featureType];

      if (typeof featureMethod !== 'function') {
        throw new Error(`Invalid feature type: ${featureType}`);
      }

      await featureMethod(requestContext);

      setStatus('success');
    } catch (erorr) {
      const errMsg = `Failed to generate text: ${(erorr as Error).message}`;

      if (
        (erorr as Error).message !==
        'IPC Operation failed: model:generate: ❌ Operation was cancelled'
      )
        callANotificationWithALog(
          dispatch,
          t`Request error, check the settings`,
          errMsg
        );

      setError(errMsg);
      setStatus('error');
    } finally {
      abortControllerRef.current = null;
    }
  }

  /**
   * Функция для запуска процесса генерации с параметрами контекста.
   * Принимает аргументы и возвращает объект с асинхронными методами
   * для запуска конкретной фичи.
   *
   * @param texts - Текст или массив текстов для обработки.
   * @param params - Параметры генерации.
   * @param options - Дополнительные опции модели.
   * @returns Объект с методами (chat, translate, instruct, contextualTranslate).
   */
  function generate(
    texts: string[] | string,
    params: UseModelParams,
    options: GenerateOptions
  ) {
    // Возвращает "fluent" API
    return {
      /**
       * Выполняет генерацию в режиме чата.
       */
      chat: async () => {
        await executeGeneration(texts, params, options, 'chat');
      },
      /**
       * Выполняет простой перевод.
       */
      translate: async () => {
        await executeGeneration(texts, params, options, 'translate');
      },
      /**
       * Выполняет генерацию по инструкции.
       */
      instruct: async () => {
        await executeGeneration(texts, params, options, 'instruct');
      },
      /**
       * Выполняет контекстный перевод.
       */
      contextualTranslate: async () => {
        await executeGeneration(texts, params, options, 'contextualTranslate');
      },
    };
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
   * Отменяет HTTP запрос и дополнительно останавливает IPC.
   */
  function stop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();

      window.electron.model.stop().catch((error: Error) => {
        callANotificationWithALog(
          dispatch,
          t`Failed to stop generation`,
          `Failed to stop generation via IPC: ${error}`
        );
      });
    }
  }

  /**
   * Обрабатывает нажатие клавиши Space для остановки генерации.
   */
  useEffect(() => {
    function handleStoppingByKey(e: KeyboardEvent) {
      if (e.code === 'Space' && status === 'process') {
        stop();
      }
    }
    document.addEventListener('keydown', handleStoppingByKey);

    return () => document.removeEventListener('keydown', handleStoppingByKey);
  }, [status === 'process']);

  return {
    /** Статус выполнения операции */
    status,
    /** Сгенерированный ответ от модели */
    generatedResponse,
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
