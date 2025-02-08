import React from 'react';

export default function SyncIconM({ color }: { color: string }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'>
      <path
        fill={color}
        d='m7 21-5-5 5-5 1.425 1.4-2.6 2.6H21v2H5.825l2.6 2.6L7 21Zm10-8-1.425-1.4 2.6-2.6H3V7h15.175l-2.6-2.6L17 3l5 5-5 5Z'
      />
    </svg>
  );
}
