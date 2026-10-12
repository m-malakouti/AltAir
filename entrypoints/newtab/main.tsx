import { initializeTheme } from '@/features/appearance/theme-store';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../sidepanel/App';
import '@/styles/base.css';
initializeTheme();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App surface="newtab" />
  </React.StrictMode>,
);
