import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Provider } from 'react-redux';
import App from './App';
import { createAppStore } from './store/store';

export async function render(url: string, preloadedState?: any) {
  const store = createAppStore(preloadedState);

  const app = (
    <Provider store={store}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </Provider>
  );

  const html = renderToString(app);
  const state = store.getState();
  return { html, state };
}
