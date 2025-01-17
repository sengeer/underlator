import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PdfIcon from 'shared/assets/icons/pdf-icon';
import SettingsIcon from 'shared/assets/icons/settings-icon';
import TranslateIcon from 'shared/assets/icons/translate-icon';
import IconButton from 'shared/ui/icon-button';
import './index.scss';

function SideNavigate() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  console.log(pathname);

  return (
    <aside className='side-navigate'>
      <IconButton
        isActiveStyle={pathname === '/text-translation'}
        onClick={() => navigate('/text-translation')}>
        <TranslateIcon />
      </IconButton>
      <IconButton
        isActiveStyle={pathname === '/pdf-translation'}
        onClick={() => navigate('/pdf-translation')}>
        <PdfIcon />
      </IconButton>
      <IconButton
        isActiveStyle={pathname === '/settings'}
        onClick={() => navigate('/settings')}>
        <SettingsIcon />
      </IconButton>
    </aside>
  );
}

export default SideNavigate;
