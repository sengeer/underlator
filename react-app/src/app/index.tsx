import loadPixelperfect from 'pixelperfect-tool';
import React from 'react';
import Main from 'pages/main/ui';

loadPixelperfect({
  page: 'index',
  breakpoints: [1920],
  folder: 'pixelperfect',
  ext: 'png',
});

function App() {
  return <Main />;
}

export default App;
