import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import loadPixelperfect from 'pixelperfect-tool';
import { useEffect } from 'react';
import Main from '../pages/main/ui';
import { loadCatalog } from '../shared/lib/i18n';

loadPixelperfect({
  page: 'index',
  breakpoints: [1920],
  folder: 'pixelperfect',
  ext: 'png',
});

function App() {
  useEffect(() => {
    loadCatalog('ru');
  }, []);

  return (
    <I18nProvider i18n={i18n}>
      <Main />
    </I18nProvider>
  );
}

export default App;
