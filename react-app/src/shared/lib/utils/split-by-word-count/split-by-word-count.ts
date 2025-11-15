/**
 * Утилитарная функция которая делит строку на две части:
 * [первые N слов, остальная строка].
 * Функция является чистой (Pure Function) и следует SRP.
 *
 * @param str - Входная строка.
 * @param count - Количество слов для первой части.
 * @returns [string, string] - Массив из двух частей.
 */
const splitByWordCount = (str: string, count: number): [string, string] => {
  // Обработка крайних случаев для обеспечения чистоты
  if (!str) {
    return ['', ''];
  }

  const words = str.split(/\s+/);

  const part1 = words.slice(0, count).join(' ');
  const part2 = words.slice(count).join(' ');

  return [part1, part2];
};

export default splitByWordCount;
