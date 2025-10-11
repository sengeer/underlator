/**
 * @module UseModel
 * Основной хук UseModel для работы с LLM моделями.
 * Предоставляет единый интерфейс для взаимодействия с LLM.
 * Поддерживает перевод, инструкции, контекстный перевод и streaming ответы.
 */

import { useLingui } from '@lingui/react/macro';
import { useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addNotification } from '../../../models/notifications-slice/';
import { selectActiveProviderSettings } from '../../../models/provider-settings-slice';
import { selectTranslationLanguages } from '../../../models/translation-languages-slice';
import { DEFAULT_URL } from '../../constants';
import useTranslationLanguages from '../use-translation-languages/use-translation-languages';
import featureProvider from './feature-provider';
import { Status } from './types/use-model';

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
   * Генерирует текст через активный провайдер.
   * Запускает процесс генерации с параметрами контекста.
   *
   * @param texts - Текст или массив текстов для обработки.
   * @param params - Параметры генерации.
   * @param options - Дополнительные опции модели, например think.
   */
  async function generate(
    texts: string[] | string,
    params: UseModelParams,
    options: GenerateOptions
  ) {
    setStatus('process');
    setGeneratedResponse(params.responseMode === 'arrayStream' ? {} : '');
    setError(null);

    // Создание контроллера для отмены операции
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await featureProvider.generate({
        config: {
          id: (providerSettings.settings as any)?.id || 'embedded-ollama',
          url: providerSettings.settings.url || DEFAULT_URL,
        },
        model: providerSettings.settings.model,
        typeUse: providerSettings.settings.typeUse,
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
      });

      setStatus('success');
    } catch (e) {
      const err = e as Error;
      dispatch(
        addNotification({
          type: 'error',
          message: t`Request error, check the settings`,
        })
      );

      console.error('Failed to generate text: ' + err.message);
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
   * Отменяет HTTP запрос и дополнительно останавливает IPC.
   */
  function stop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();

      window.electron.model.stop().catch((error: Error) => {
        dispatch(
          addNotification({
            type: 'error',
            message: t`Failed to stop generation`,
          })
        );

        console.error('Failed to stop generation via IPC:', error);
      });
    }
  }

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
