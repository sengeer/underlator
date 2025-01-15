import React from 'react';
import PdfIcon from 'shared/assets/icons/pdf-icon';
import SettingsIcon from 'shared/assets/icons/settings-icon';
import TranslateIcon from 'shared/assets/icons/translate-icon';
import IconButton from 'shared/ui/icon-button';
import SideNavigate from 'shared/ui/side-navigate';
import PdfViewer from '../../widgets/pdf-viewer';
import TextTranslator from '../../widgets/text-translator';
import './index.scss';

function Main() {
  return (
    <main className='main'>
      <SideNavigate>
        <IconButton>
          <TranslateIcon />
        </IconButton>
        <IconButton>
          <PdfIcon />
        </IconButton>
        <IconButton>
          <SettingsIcon />
        </IconButton>
      </SideNavigate>
      <h2>Многоязычный перевод с помощью машинного обучения!</h2>

      <TextTranslator />
      <PdfViewer />
    </main>
  );
}

export default Main;
