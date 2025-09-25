/**
 * @interface ChunkOperationResult
 * @description Алгебраический тип для результатов операций с текстовыми фрагментами
 * Обеспечивает типобезопасную обработку успешных и ошибочных результатов операций
 * @template T - Тип данных, возвращаемых при успешном выполнении операции
 * @property {true} success - Флаг успешного выполнения операции
 * @property {T} data - Данные результата операции при успешном выполнении
 * @property {false} success - Флаг неуспешного выполнения операции
 * @property {string} error - Сообщение об ошибке при неуспешном выполнении операции
 */
export type ChunkOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
