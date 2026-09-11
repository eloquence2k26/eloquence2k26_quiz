import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global guard against external/browser extension uncaught errors (e.g. reportAllChanges / startTime)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event?.message &&
      (event.message.includes('startTime') || event.message.includes('reportAllChanges'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (
      event?.reason?.message &&
      (event.reason.message.includes('startTime') || event.reason.message.includes('reportAllChanges'))
    ) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
