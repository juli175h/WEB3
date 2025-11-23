import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createAppStore } from './store/store';
import { onPending } from './services/api';

const container = document.getElementById('root')!;

// Use server-provided initial state if available to hydrate the client store
const preloadedState = (window as any).__INITIAL_STATE__ as any | undefined;
const store = createAppStore(preloadedState);

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
