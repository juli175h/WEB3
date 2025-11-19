import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { onPending } from './services/api';

const container = document.getElementById('root')!;

hydrateRoot(
  container,
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Start subscriptions in the browser
try {
  onPending(() => {});
} catch (err) {
  // noop
}
