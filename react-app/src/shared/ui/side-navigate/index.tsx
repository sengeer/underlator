import React from 'react';
import './index.scss';

function SideNavigate({ children }: { children: any }) {
  return <aside className='side-navigate'>{children}</aside>;
}

export default SideNavigate;
