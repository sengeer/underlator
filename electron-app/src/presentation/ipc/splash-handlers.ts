/**
 * @module SplashHandlers
 * IPC обработчики для работы splash screen.
 */

import { ipcMain } from 'electron';

/**
 * @class SplashHandlers
 *
 * Класс для управления IPC обработчиками splash screen.
 */
export class SplashHandlers {
  /**
   * Регистрирует все IPC обработчики splash screen.
   */
  registerHandlers(): void {
    /**
     * Обработчик для получения текущего статуса splash screen.
     * React приложение использует это для получения актуального состояния.
     */
    ipcMain.handle('splash:get-status', async () => {
      // Возвращает базовый статус инициализации
      return {
        status: 'initializing',
        progress: 0,
      };
    });
  }

  /**
   * Удаляет все IPC обработчики splash screen.
   */
  removeHandlers(): void {
    console.log('🧹 Removing splash screen handlers...');

    ipcMain.removeHandler('splash:get-status');

    console.log('✅ Splash screen handlers removed successfully');
  }
}
