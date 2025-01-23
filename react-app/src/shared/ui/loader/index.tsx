import React from 'react';
import './index.scss';

function Loader({ isLoading }: { isLoading: boolean }) {
  return (
    <svg
      className={`loader${isLoading ? ' loader_show' : ''}`}
      viewBox='0 0 16 16'
      height='48'
      width='48'>
      <circle r='7px' cy='8px' cx='8px'></circle>
    </svg>
  );
}

export default Loader;
