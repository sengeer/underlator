import path from 'path';
import cpy from 'cpy';
import { sync as rimrafSync } from 'rimraf';

async function moveBuildToElectron() {
  rimrafSync(path.join(process.cwd(), '../../electron-app/dist'));

  await cpy(
    ['dist/**/*'],
    path.join(process.cwd(), '../../electron-app/dist/react')
  );

  rimrafSync(path.join(process.cwd(), 'dist'));
}

moveBuildToElectron().catch(console.error);
