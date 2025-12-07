import path from 'path';
import cpy from 'cpy';
import { sync as rimrafSync } from 'rimraf';

async function build() {
  rimrafSync(path.join(process.cwd(), '../../electron-app/dist'));

  await cpy(
    ['dist/**/*'],
    path.join(process.cwd(), '../../electron-app/dist/react')
  );

  rimrafSync(path.join(process.cwd(), 'dist'));
}

build().catch(console.error);
