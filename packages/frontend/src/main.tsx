import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

// Initialize theme from localStorage BEFORE React mounts to prevent flash
const initTheme = () => {
  try {
    const stored = localStorage.getItem('ui-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const theme = parsed?.state?.theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      // Default to dark theme
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
};

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
