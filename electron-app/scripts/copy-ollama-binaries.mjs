import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import cpy from 'cpy';
import { sync as rimrafSync } from 'rimraf';

// Определяет путь к целевой директории в зависимости от платформы
function getTargetPath() {
  const platform = process.platform;
  const cwd = process.cwd();

  if (platform === 'win32') {
    // Windows: electron-app/out/win-unpacked/Ollama Binaries
    return path.join(cwd, './out/win-unpacked/Ollama Binaries');
  } else if (platform === 'darwin') {
    // macOS: electron-app/out/mac-arm64/Underlator.app/Contents/MacOS/Ollama Binaries
    return path.join(
      cwd,
      './out/mac-arm64/Underlator.app/Contents/MacOS/Ollama Binaries'
    );
  } else if (platform === 'linux') {
    // Linux: electron-app/out/linux-unpacked/Ollama Binaries
    return path.join(cwd, './out/linux-unpacked/Ollama Binaries');
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Скрипт запускается из electron-app
async function copyOllamaBinaries() {
  const sourcePath = path.join(process.cwd(), '../temp/Ollama Binaries');
  const targetPath = getTargetPath();

  // Проверяет существование исходной папки
  if (!existsSync(sourcePath)) {
    console.warn(`⚠️ Source directory does not exist: ${sourcePath}`);
    process.exit(1);
  }

  // Создает целевую директорию, если она не существует
  const targetDir = path.dirname(targetPath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Удаляет существующую папку Ollama Binaries в целевом месте, если она есть
  if (existsSync(targetPath)) {
    rimrafSync(targetPath);
  }

  // Создает целевую папку перед копированием
  mkdirSync(targetPath, { recursive: true });

  // Копирует содержимое папки Ollama Binaries в целевую папку
  await cpy([path.join(sourcePath, '**/*')], targetPath);
}

copyOllamaBinaries().catch(() => process.exit(1));
