import React from 'react';
import ReactDOM from 'react-dom/client';
import { Router as AppRoutes } from './routes';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = import.meta.env.DEV ? '/sw.ts' : '/sw.js';
    navigator.serviceWorker.register(swUrl, { type: 'module' }).then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>
);