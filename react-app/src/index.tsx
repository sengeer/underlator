import React from 'react';
import ReactDOM from 'react-dom/client';
import './app/styles/root.scss';
import { Provider } from 'react-redux';
import App from './app';
import store from './app/models/store';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
}

// Если вы хотите начать измерять производительность в своем приложении, передайте функцию
// для регистрации результатов (например, reportWebVitals(console.log))
// или отправьте в конечную точку аналитики. Подробнее: https://bit.ly/CRA-vitals
