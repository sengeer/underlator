/**
 * @module SplashConstants
 * @description Константы для работы с splash screen
 * Централизованная конфигурация для всех операций splash screen
 */

import type { SplashConfig, SplashMessages } from '../types/splash.types';

/**
 * @description Конфигурация по умолчанию для splash screen
 * Базовые настройки для управления splash screen
 */
export const DEFAULT_SPLASH_CONFIG: SplashConfig = {
  /** Минимальное время отображения splash screen (2 секунды) */
  minDisplayTime: 2000,
  /** Автоматически скрывать splash screen при готовности */
  autoHide: true,
  /** Показывать детальную информацию */
  showDetails: true,
} as const;

/**
 * @description Сообщения для различных статусов инициализации
 * Текстовые описания для отображения в splash screen
 */
export const SPLASH_MESSAGES: Record<string, SplashMessages> = {
  INITIALIZING: {
    status: 'initializing',
    message: 'Инициализация приложения...',
    progress: 0,
  },
  CHECKING_OLLAMA: {
    status: 'checking_ollama',
    message: 'Проверка Ollama...',
    details: 'Проверяем доступность Ollama сервера',
    progress: 10,
  },
  STARTING_OLLAMA: {
    status: 'starting_ollama',
    message: 'Запуск Ollama сервера...',
    details: 'Запускаем локальный Ollama сервер',
    progress: 25,
  },
  WAITING_FOR_SERVER: {
    status: 'waiting_for_server',
    message: 'Ожидание запуска сервера...',
    details: 'Ждем готовности Ollama сервера',
    progress: 40,
  },
  HEALTH_CHECK: {
    status: 'health_check',
    message: 'Проверка состояния сервера...',
    details: 'Выполняем проверку работоспособности',
    progress: 60,
  },
  CREATING_API: {
    status: 'creating_api',
    message: 'Создание API клиента...',
    details: 'Настраиваем подключение к Ollama API',
    progress: 75,
  },
  CREATING_CATALOG: {
    status: 'creating_catalog',
    message: 'Инициализация каталога моделей...',
    details: 'Подготавливаем каталог доступных моделей',
    progress: 90,
  },
  READY: {
    status: 'ready',
    message: 'Готово!',
    details: 'Приложение готово к работе',
    progress: 100,
  },
  ERROR: {
    status: 'error',
    message: 'Ошибка инициализации',
    details: 'Произошла ошибка при запуске приложения',
    progress: 0,
  },
} as const;

/**
 * @description Временные интервалы для splash screen
 * Настройки времени для различных операций
 */
export const SPLASH_TIMING = {
  /** Задержка перед показом splash screen */
  SHOW_DELAY: 100,
  /** Задержка перед скрытием splash screen */
  HIDE_DELAY: 500,
  /** Интервал обновления анимации */
  ANIMATION_INTERVAL: 16, // ~60 FPS
  /** Длительность анимации перехода */
  TRANSITION_DURATION: 300,
  /** Задержка между обновлениями статуса */
  STATUS_UPDATE_DELAY: 200,
} as const;

/**
 * @description IPC события для splash screen
 * События для коммуникации между main и renderer процессами
 */
export const SPLASH_IPC_EVENTS = {
  /** Обновление статуса */
  UPDATE_STATUS: 'splash:update-status',
  /** Установка прогресса */
  SET_PROGRESS: 'splash:set-progress',
  /** Завершение инициализации */
  COMPLETE: 'splash:complete',
  /** Ошибка инициализации */
  ERROR: 'splash:error',
  /** Скрытие splash screen */
  HIDE: 'splash:hide',
  /** Показ splash screen */
  SHOW: 'splash:show',
} as const;
