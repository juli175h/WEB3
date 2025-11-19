import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { onPending } from "./services/api";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Start pending subscription in the browser so pending$ gets fed for the app lifetime
// (onPending is a noop on the server/SSR side)
try {
  onPending(() => {});
} catch (err) {
  // swallow — onPending may be a noop if not supported
}
