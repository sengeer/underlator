/**
 * @module useFormAndValidation
 * Хук UseFormAndValidation для управления состоянием формы с валидацией.
 * Предоставляет функциональность для работы с полями формы, их валидацией и сбросом состояния.
 */

import { useState, useCallback } from 'react';
import { Values } from './types/use-form-and-validation';

/**
 * Хук для управления состоянием формы с валидацией.
 *
 * @returns Объект с методами и состоянием для управления формой.
 */
function useFormAndValidation() {
  // Состояние значений полей формы
  const [values, setValues] = useState<Values>({});
  // Состояние ошибок валидации для каждого поля
  const [errors, setErrors] = useState({});
  // Общее состояние валидности формы
  const [isValid, setIsValid] = useState(true);
  // Состояние активности кнопки (дублирует isValid для совместимости)
  const [isBtnEnabled, setIsBtnEnabled] = useState(false);

  /**
   * Обработчик изменения полей формы.
   * Обновляет значения, ошибки валидации и общее состояние формы.
   *
   * @param e - Событие изменения поля формы.
   */
  function handleChange(e: any) {
    const { name, value } = e.target;
    // Обновление значений полей с сохранением предыдущих
    setValues({ ...values, [name]: value });
    // Сохранение сообщения валидации браузера для поля
    setErrors({ ...errors, [name]: e.target.validationMessage });
    // Проверка валидности всей формы через нативный API
    const formValidity = e.target.closest('form')?.checkValidity();
    setIsValid(formValidity);
    setIsBtnEnabled(formValidity);
  }

  /**
   * Сброс состояния формы к начальным значениям.
   *
   * @param newValues - Новые значения полей (по умолчанию пустой объект).
   * @param newErrors - Новые ошибки валидации (по умолчанию пустой объект).
   * @param newIsValid - Новое состояние валидности (по умолчанию true).
   */
  const resetForm = useCallback(
    (newValues = {}, newErrors = {}, newIsValid = true) => {
      setValues(newValues);
      setErrors(newErrors);
      setIsValid(newIsValid);
    },
    [setValues, setErrors, setIsValid]
  );

  return {
    /** Текущие значения полей формы */
    values,
    /** Обработчик изменения полей формы */
    handleChange,
    /** Ошибки валидации для каждого поля */
    errors,
    /** Общее состояние валидности формы */
    isValid,
    /** Функция сброса состояния формы */
    resetForm,
    /** Функция прямого обновления значений */
    setValues,
    /** Функция прямого обновления состояния валидности */
    setIsValid,
    /** Состояние активности кнопки */
    isBtnEnabled,
    /** Функция обновления состояния активности кнопки */
    setIsBtnEnabled,
  };
}

export default useFormAndValidation;
