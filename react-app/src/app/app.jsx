import { HashRouter, Routes, Route } from 'react-router-dom';
import Main from '../pages/main/ui/main';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path='/' element={<Main />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
