import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import loadPixelperfect from 'pixelperfect-tool';
import { useEffect } from 'react';
import Main from '../pages/main/ui';
import { DEFAULT_LOCALE } from '../shared/lib/constants';
import { loadCatalog } from '../shared/lib/i18n';
import { getStorageWrite } from '../shared/lib/utils/control-local-storage';

// Re-exporting hooks via public API
export { useAppDispatch, useAppSelector } from './model/hooks';
loadPixelperfect({
  page: 'index',
  breakpoints: [1920],
  folder: 'pixelperfect',
  ext: 'png',
});

function App() {
  const localeFromStorage = getStorageWrite('locale');

  useEffect(() => {
    if (typeof localeFromStorage === 'string' && localeFromStorage !== '')
      loadCatalog(localeFromStorage);
    else loadCatalog(DEFAULT_LOCALE);
  }, [localeFromStorage, DEFAULT_LOCALE]);

  return (
    <I18nProvider i18n={i18n}>
      <Main />
    </I18nProvider>
  );
}

export default App;
