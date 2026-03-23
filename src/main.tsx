import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Firefox: WebSocket "insecure" Fehler abfangen damit die App nicht crasht
// Tritt auf wenn Realtime-Subscriptions in bestimmten Kontexten blockiert werden
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('insecure') || event.reason?.message?.includes('WebSocket')) {
    event.preventDefault();
    console.warn('[WebSocket] Connection blocked (non-fatal):', event.reason?.message);
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
