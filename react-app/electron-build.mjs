import path from 'path';
import cpy from 'cpy';
import { sync as rimrafSync } from 'rimraf';

async function moveReactBuild() {
  await cpy(['build/**/*'], path.join(process.cwd(), '../electron/src/'));

  rimrafSync(path.join(process.cwd(), 'build'));
}

async function removeElectronOut() {
  rimrafSync(path.join(process.cwd(), '../electron/out'));
}

moveReactBuild().catch(console.error);
removeElectronOut().catch(console.error);
