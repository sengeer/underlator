import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

export default defineConfig({
  sourceLocale: 'ru',
  locales: ['ru', 'en'],
  catalogs: [
    {
      path: 'src/shared/lib/i18n/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
