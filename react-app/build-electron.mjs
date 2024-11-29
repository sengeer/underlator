import path from 'path';
import cpy from 'cpy';
import { sync as rimrafSync } from 'rimraf';

async function moveBuild() {
  rimrafSync(path.join(process.cwd(), '../electron/src/*'), {
    glob: {
      ignore: ['index.js', 'index.css'],
    },
  });

  await cpy(['build/**/*'], path.join(process.cwd(), '../electron/src/'));
}

moveBuild().catch(console.error);
