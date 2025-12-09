import path from 'path';
import { fileURLToPath } from 'url';
import cpy from 'cpy';
import { sync as rimrafSync } from 'rimraf';

// Получение абсолютного пути к директории скрипта
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Перемещение собранных файлов React в директорию Electron приложения
async function moveBuildToElectron() {
  // Получает абсолютный путь к корню react-app (на уровень выше scripts/)
  const reactAppRoot = path.resolve(__dirname, '..');
  // Получает абсолютный путь к корню проекта (на два уровня выше react-app)
  const projectRoot = path.resolve(reactAppRoot, '..');
  // Путь к директории dist в electron-app
  const electronDistPath = path.join(projectRoot, 'electron-app', 'dist');
  // Путь к директории react в electron-app/dist
  const electronReactPath = path.join(electronDistPath, 'react');
  // Путь к директории dist в react-app
  const reactDistPath = path.join(reactAppRoot, 'dist');

  // Удаляет старую директорию dist в electron-app
  rimrafSync(electronDistPath);

  // Копирует собранные файлы в electron-app/dist/react
  await cpy(['dist/**/*'], electronReactPath, {
    cwd: reactAppRoot,
  });

  // Удаляет исходную директорию dist в react-app
  rimrafSync(reactDistPath);
}

moveBuildToElectron().catch(console.error);
