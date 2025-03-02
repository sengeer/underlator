import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

const defaultLocale = import.meta.env.VITE_DEFAULT_LOCALE;

export default defineConfig({
  sourceLocale: defaultLocale,
  locales: ['ru', 'en'],
  catalogs: [
    {
      path: 'src/shared/lib/i18n/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
