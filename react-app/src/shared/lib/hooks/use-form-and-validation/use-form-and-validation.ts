import { useState, useCallback } from 'react';
import { Values } from './types/use-form-and-validation';

function useFormAndValidation() {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(true);
  const [isBtnEnabled, setIsBtnEnabled] = useState(false);

  function handleChange(e: any) {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: e.target.validationMessage });
    setIsValid(e.target.closest('form')?.checkValidity());
    setIsBtnEnabled(e.target.closest('form')?.checkValidity());
  }

  const resetForm = useCallback(
    (newValues = {}, newErrors = {}, newIsValid = true) => {
      setValues(newValues);
      setErrors(newErrors);
      setIsValid(newIsValid);
    },
    [setValues, setErrors, setIsValid]
  );

  return {
    values,
    handleChange,
    errors,
    isValid,
    resetForm,
    setValues,
    setIsValid,
    isBtnEnabled,
    setIsBtnEnabled,
  };
}

export default useFormAndValidation;
