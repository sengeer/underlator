import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';
import { DEFAULT_LOCALE } from './src/shared/lib/constants';

export default defineConfig({
  sourceLocale: DEFAULT_LOCALE,
  locales: ['ru', 'en'],
  catalogs: [
    {
      path: 'src/shared/lib/i18n/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
