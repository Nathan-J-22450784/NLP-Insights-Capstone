import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/ttc.css"; 
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { withApiBase } from "./apiBase"; 

// --- install one-time runtime patch BEFORE anything renders ---

// Patch fetch so any "http://localhost:8000/..." is rewritten to API_BASE
const _fetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === "string") {
    return _fetch(withApiBase(input), init);
  }
  try {
    const req = new Request(withApiBase(input.url), input);
    return _fetch(req, init);
  } catch {
    return _fetch(input, init);
  }
};

// Patch XMLHttpRequest.open (covers upload code using XHR)
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  return _open.call(this, method, withApiBase(url), ...rest);
};

// --- normal React bootstrapping ---
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
