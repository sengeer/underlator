import React, { ReactNode } from 'react';
import './index.scss';

function Settings({ isOpened }: { isOpened: boolean }) {
  return <section className={`settings${isOpened ? ' settings_open' : ''}`} />;
}

export default Settings;
