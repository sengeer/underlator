import loadPixelperfect from 'pixelperfect-tool';
import React from 'react';
import { HashRouter, Routes, Navigate, Route } from 'react-router-dom';
import PdfTranslator from 'pages/pdf-translator/ui';
import Settings from 'pages/settings/ui';
import TextTranslator from 'pages/text-translator/ui';

loadPixelperfect({
  page: 'index',
  breakpoints: [1920],
  folder: 'pixelperfect',
  ext: 'png',
});

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path='*' element={<Navigate to='/text-translation' replace />} />
        <Route path='/text-translation' element={<TextTranslator />} />
        <Route path='/pdf-translation' element={<PdfTranslator />} />
        <Route path='/settings' element={<Settings />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
