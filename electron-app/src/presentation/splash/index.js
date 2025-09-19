/**
 * @module SplashScript
 * @description Скрипт для обработки обновлений splash screen
 * Обрабатывает IPC сообщения от main процесса и обновляет UI в реальном времени
 */

console.log('🔍 Проверяем window.electron:', window.electron);
console.log('🔍 Тип window.electron:', typeof window.electron);
console.log(
  '🔍 Методы window.electron:',
  window.electron ? Object.keys(window.electron) : 'undefined'
);

// Проверяет доступность Electron API
if (typeof window !== 'undefined' && window.electron) {
  console.log('✅ Splash screen script загружен');
} else {
  console.warn('❌ Electron API недоступен в splash screen');
}

/**
 * @description Класс для управления splash screen в renderer процессе
 * Обрабатывает IPC сообщения и обновляет UI
 */
class SplashRenderer {
  constructor() {
    this.container = document.getElementById('splashContainer');
    this.logo = document.getElementById('splashLogo');
    this.statusText = document.getElementById('statusText');
    this.detailsText = document.getElementById('detailsText');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');

    this.currentStatus = 'initializing';
    this.currentProgress = 0;
    this.isVisible = true;

    this.init();
  }

  /**
   * @description Инициализирует splash screen
   * Настраивает обработчики событий и начальное состояние
   */
  init() {
    console.log('✅ Инициализация splash screen renderer');

    // Устанавливает начальное состояние
    this.updateStatus({
      status: 'initializing',
      message: 'Инициализация приложения...',
      progress: 0,
    });

    // Настраивает обработчики IPC событий если доступны
    if (window.electron) {
      this.setupIpcHandlers();
    } else {
      // Fallback для тестирования без Electron
      console.warn('❌ Electron API недоступен в splash screen');
      this.setupFallbackHandlers();
    }

    // Добавляет обработчик ошибок
    window.addEventListener('error', event => {
      console.error('❌ Splash screen error:', event.error);
      this.handleError(event.error.message || 'Unknown error');
    });

    console.log('✅ Splash screen renderer инициализирован');
  }

  /**
   * @description Настраивает обработчики IPC событий
   * Подписывается на события от main процесса
   */
  setupIpcHandlers() {
    // Проверяет доступность Electron API
    if (
      !window.electron ||
      !window.electron.splash ||
      typeof window.electron.splash.on !== 'function'
    ) {
      console.warn('❌ Electron splash API недоступен, используем fallback');
      this.setupFallbackHandlers();
      return;
    }

    console.log('✅ Electron splash API доступен, настраиваем IPC обработчики');

    // Обработчик обновления статуса
    window.electron.splash.on('splash:update-status', message => {
      console.log('🔄 Получено обновление статуса:', message);
      if (message.data) {
        this.updateStatus(message.data);
      }
    });

    // Обработчик обновления прогресса
    window.electron.splash.on('splash:set-progress', message => {
      console.log('🔄 Получено обновление прогресса:', message);
      if (typeof message.data === 'number') {
        this.setProgress(message.data);
      }
    });

    // Обработчик завершения инициализации
    window.electron.splash.on('splash:complete', message => {
      console.log('🔄 Получено событие завершения:', message);
      this.handleComplete();
    });

    // Обработчик ошибки
    window.electron.splash.on('splash:error', message => {
      console.log('❌ Получена ошибка:', message);
      this.handleError(message.data || 'Unknown error');
    });

    // Обработчик скрытия splash screen
    window.electron.splash.on('splash:hide', message => {
      console.log('🔄 Получено событие скрытия:', message);
      this.hide();
    });

    console.log('✅ IPC обработчики splash screen настроены');
  }

  /**
   * @description Настраивает fallback обработчики для тестирования
   * Используется для симуляции процесса инициализации когда Electron API недоступен
   */
  setupFallbackHandlers() {
    console.log('🔄 Настройка fallback обработчиков для тестирования');

    // Симуляция процесса инициализации
    setTimeout(() => {
      this.updateStatus({
        status: 'checking_ollama',
        message: 'Проверка Ollama...',
        details: 'Проверяем доступность Ollama сервера',
        progress: 10,
      });
    }, 1000);

    setTimeout(() => {
      this.updateStatus({
        status: 'starting_ollama',
        message: 'Запуск Ollama сервера...',
        details: 'Запускаем локальный Ollama сервер',
        progress: 25,
      });
    }, 2000);

    setTimeout(() => {
      this.updateStatus({
        status: 'ready',
        message: 'Готово!',
        details: 'Приложение готово к работе',
        progress: 100,
      });
    }, 3000);

    setTimeout(() => {
      this.handleComplete();
    }, 4000);
  }

  /**
   * @description Обновляет статус splash screen
   * @param statusData - Данные статуса для отображения
   */
  updateStatus(statusData) {
    try {
      this.currentStatus = statusData.status;

      // Обновляет текст статуса
      if (this.statusText) {
        this.statusText.textContent = statusData.message;
      }

      // Обновляет детали
      // if (this.detailsText) {
      //   if (statusData.details) {
      //     this.detailsText.textContent = statusData.details;
      //     this.detailsText.style.display = 'block';
      //   } else {
      //     this.detailsText.style.display = 'none';
      //   }
      // }

      // Обновляет атрибут статуса для CSS
      if (this.container) {
        this.container.setAttribute('data-status', statusData.status);
      }

      // Обновляет прогресс если указан
      if (typeof statusData.progress === 'number') {
        this.setProgress(statusData.progress);
      }

      console.log(
        `🔄 Статус обновлен: ${statusData.message} (${statusData.status})`
      );
    } catch (error) {
      console.error('❌ Ошибка обновления статуса:', error);
    }
  }

  /**
   * @description Устанавливает прогресс инициализации
   * @param progress - Прогресс в процентах (0-100)
   */
  setProgress(progress) {
    try {
      this.currentProgress = Math.max(0, Math.min(100, progress));

      // Обновляет полосу прогресса
      if (this.progressFill) {
        this.progressFill.style.width = `${this.currentProgress}%`;
      }

      // Обновляет текст прогресса
      if (this.progressText) {
        this.progressText.textContent = `${Math.round(this.currentProgress)}%`;
      }

      // Прогресс контейнер всегда видим
      if (this.progressContainer) {
        if (this.currentProgress > 0) {
          this.progressContainer.style.display = 'flex';
        } else {
          this.progressContainer.style.display = 'none';
        }
      }

      console.log(`🔄 Прогресс обновлен: ${this.currentProgress}%`);
    } catch (error) {
      console.error('❌ Ошибка установки прогресса:', error);
    }
  }

  /**
   * @description Обрабатывает завершение инициализации
   * Подготавливает splash screen к скрытию
   */
  handleComplete() {
    try {
      console.log('🔄 Обработка завершения инициализации');

      // Обновляет статус на "готово"
      this.updateStatus({
        status: 'ready',
        message: 'Готово!',
        details: 'Приложение готово к работе',
        progress: 100,
      });

      // Добавляет класс завершения для анимации
      if (this.container) {
        this.container.classList.add('splash-complete');
      }

      // Скрывает через небольшую задержку
      setTimeout(() => {
        this.hide();
      }, 1000);
    } catch (error) {
      console.error('❌ Ошибка обработки завершения:', error);
    }
  }

  /**
   * @description Обрабатывает ошибку инициализации
   * @param errorMessage - Сообщение об ошибке
   */
  handleError(errorMessage) {
    try {
      console.error('🔄 Обработка ошибки splash screen:', errorMessage);

      // Обновляет статус на "ошибка"
      this.updateStatus({
        status: 'error',
        message: 'Ошибка инициализации',
        details: errorMessage,
        progress: 0,
      });

      // Добавляет класс ошибки для стилизации
      if (this.container) {
        this.container.classList.add('splash-error');
      }
    } catch (error) {
      console.error('❌ Ошибка обработки ошибки:', error);
    }
  }

  /**
   * @description Скрывает splash screen
   * Выполняет анимацию скрытия и подготавливает к переходу
   */
  hide() {
    try {
      if (!this.isVisible) {
        console.log('🔄 Splash screen уже скрыт');
        return;
      }

      console.log('🔄 Скрытие splash screen');

      // Добавляет класс перехода
      if (this.container) {
        this.container.classList.add('splash-container_state_transitioning');
      }

      // Ждет завершения анимации и скрываем
      setTimeout(() => {
        if (this.container) {
          this.container.classList.add('splash-container_state_hidden');
        }
        this.isVisible = false;
        console.log('✅ Splash screen скрыт');
      }, 300); // Соответствует CSS transition duration
    } catch (error) {
      console.error('❌ Ошибка скрытия splash screen:', error);
    }
  }

  /**
   * @description Показывает splash screen
   * Выполняет анимацию появления
   */
  show() {
    try {
      if (this.isVisible) {
        console.log('🔄 Splash screen уже видим');
        return;
      }

      console.log('✅ Показ splash screen');

      // Убирает классы скрытия
      if (this.container) {
        this.container.classList.remove(
          'splash-container_state_hidden',
          'splash-container_state_transitioning'
        );
      }

      this.isVisible = true;
      console.log('✅Splash screen показан');
    } catch (error) {
      console.error('❌ Ошибка показа splash screen:', error);
    }
  }
}

// Инициализация splash screen при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM загружен, инициализация splash screen');

  // Создает экземпляр splash renderer
  window.splashRenderer = new SplashRenderer();

  console.log('✅ Splash screen готов к работе');
});
