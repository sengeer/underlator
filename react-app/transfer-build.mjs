import path from 'path';
import cpy from 'cpy';
import { sync as rimrafSync } from 'rimraf';

async function transferReactBuild() {
  await cpy(['build/**/*'], path.join(process.cwd(), '../electron/src/'));

  rimrafSync(path.join(process.cwd(), 'build'));
}

transferReactBuild().catch(console.error);
