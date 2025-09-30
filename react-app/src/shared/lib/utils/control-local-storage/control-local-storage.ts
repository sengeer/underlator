/**
 * @module ControlLocalStorage
 * Утилиты для работы с localStorage.
 * Предоставляет безопасные методы для чтения, записи и очистки данных в браузерном хранилище.
 * Обеспечивает автоматическую сериализацию/десериализацию JSON данных.
 */

/**
 * Безопасно читает данные из localStorage.
 * Автоматически парсит JSON и возвращает пустую строку при ошибках.
 * Используется для восстановления состояния приложения (настройки провайдеров, локаль, цвета).
 * @param name - Ключ для поиска в localStorage.
 * @returns Распарсенные данные или пустая строка при отсутствии/ошибке.
 */
export function getStorageWrite(name: string) {
  const item = localStorage.getItem(name);
  if (item === null) return '';
  try {
    return JSON.parse(item);
  } catch {
    return '';
  }
}

/**
 * Безопасно записывает данные в localStorage.
 * Автоматически сериализует данные в JSON формат.
 * Используется для сохранения состояния приложения между сессиями.
 * @param name - Ключ для записи в localStorage.
 * @param data - Данные для сохранения (будут сериализованы в JSON).
 */
export function setStorageWrite(name: string, data: any) {
  localStorage.setItem(name, JSON.stringify(data));
}

/**
 * Полностью очищает localStorage.
 * Удаляет все сохраненные данные приложения.
 * Используется для сброса всех пользовательских настроек.
 */
export function clearAllStorageWrite() {
  localStorage.clear();
}
