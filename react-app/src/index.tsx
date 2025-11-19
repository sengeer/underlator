/**
 * @module Index
 * Точка входа приложения.
 * Настраивает Redux Provider и PersistGate для автоматического восстановления состояния.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './app/styles/root.scss';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import App from './app';
import store, { persistor } from './app/models/store';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    </React.StrictMode>
  );
}

// Если вы хотите начать измерять производительность в своем приложении, передайте функцию
// для регистрации результатов (например, reportWebVitals(console.log))
// или отправьте в конечную точку аналитики. Подробнее: https://bit.ly/CRA-vitals
