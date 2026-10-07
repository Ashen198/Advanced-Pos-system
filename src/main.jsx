// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import registerSW from virtual module provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Auto-update service worker without blocking the UI
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);