import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../../app/';
import logo from '../../../shared/assets/images/logo.svg';
import useElectronTranslation from '../../../shared/lib/hooks/use-electron-translation';
import ProgressBar from '../../../shared/ui/progress-bar';
import { splashScreenApi } from '../apis/splash-screen-api';
import {
  setStatus,
  setProgress,
  setError,
  hide,
  complete,
  fetchSplashStatus,
  selectSplashScreenState,
} from '../models/splash-screen-slice';
import type {
  SplashScreenProps,
  SplashStatusData,
} from '../types/splash-screen.types';
import '../styles/splash-screen.scss';

/**
 * @description Компонент SplashScreen для отображения процесса инициализации
 * Показывает прогресс запуска приложения с анимированным логотипом и статусом
 *
 * @param props - Пропсы компонента
 * @returns JSX элемент компонента SplashScreen
 *
 * @example
 * Базовое использование
 * <SplashScreen />
 *
 * @example
 * Использование с дополнительными классами
 * <SplashScreen className="custom-splash" />
 */
const SplashScreen: React.FC<SplashScreenProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const splashState = useSelector(selectSplashScreenState);

  const { translations } = useElectronTranslation();

  /**
   * @description Обработчик обновления статуса
   * Обновляет статус в Redux store при получении обновлений от Electron
   */
  const handleStatusUpdate = useCallback(
    (status: SplashStatusData) => {
      dispatch(setStatus(status));
    },
    [dispatch]
  );

  /**
   * @description Обработчик обновления прогресса
   * Обновляет прогресс в Redux store при получении обновлений от Electron
   */
  const handleProgressUpdate = useCallback(
    (progress: number) => {
      dispatch(setProgress(progress));
    },
    [dispatch]
  );

  /**
   * @description Обработчик завершения инициализации
   * Скрывает splash screen при завершении инициализации
   */
  const handleComplete = useCallback(() => {
    dispatch(complete());

    // Задержка перед скрытием для плавного перехода
    setTimeout(() => {
      dispatch(hide());
    }, 1000);
  }, [dispatch]);

  /**
   * @description Обработчик ошибок инициализации
   * Отображает ошибку в splash screen
   */
  const handleError = useCallback(
    (error: string) => {
      dispatch(setError(error));
    },
    [dispatch]
  );

  /**
   * @description Настраивает подписки на события splash screen
   * Подписывается на обновления статуса, прогресса и ошибок от Electron
   */
  useEffect(() => {
    // Получает начальный статус splash screen
    dispatch(fetchSplashStatus());

    // Подписывается на обновления статуса
    const unsubscribeStatus =
      splashScreenApi.onStatusUpdate(handleStatusUpdate);

    // Подписывается на обновления прогресса
    const unsubscribeProgress =
      splashScreenApi.onProgressUpdate(handleProgressUpdate);

    // Подписывается на завершение инициализации
    const unsubscribeComplete = splashScreenApi.onComplete(handleComplete);

    // Подписывается на ошибки
    const unsubscribeError = splashScreenApi.onError(handleError);

    // Очищает подписки при размонтировании компонента
    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [handleStatusUpdate, handleProgressUpdate, handleComplete, handleError]);

  // Не рендерит компонент если splash screen скрыт
  if (!splashState.visible) {
    return null;
  }

  /**
   * @description Определяет CSS классы для контейнера
   * Добавляет классы состояния на основе текущего статуса
   */
  const containerClasses = [
    'splash-screen',
    splashState.status?.status
      ? `splash-screen_status_${splashState.status.status}`
      : '',
    splashState.error ? 'splash-screen_status_error' : '',
    !splashState.visible ? 'splash-screen_hidden' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} data-status={splashState.status?.status}>
      {/* Логотип с анимацией */}
      <img src={logo} alt='Underlator' className='splash-screen__logo' />

      {/* Cтатус */}
      <div className='splash-screen__text splash-screen__text_color_foreground'>
        {splashState.status?.message
          ? splashState.status?.message
          : translations.DOWNLOADING_APP}
      </div>

      {/* Дополнительная информация если доступна */}
      {splashState.status?.details && (
        <div className='splash-screen__text splash-screen__text_color_main'>
          {splashState.status.details}
        </div>
      )}

      {/* Прогресс-бар */}
      <ProgressBar percentage={splashState.progress} />

      <div className='splash-screen__text splash-screen__text_color_main'>
        {splashState.progress}%
      </div>

      {/* Отображение ошибки если она есть */}
      {splashState.error && (
        <div className='splash-screen__text splash-screen__text_color_accent'>
          {splashState.error}
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
