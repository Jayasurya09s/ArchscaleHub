import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import seedBackup from './data/orbit-backup-seed.json';
import './styles.css';

const STORAGE_KEY = 'orbit.workspace.v4';

function seedLocalBackup() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const data = seedBackup?.data;
    if (!data || typeof data !== 'object') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 4,
        savedAt: new Date().toISOString(),
        data,
        seededFrom: seedBackup.exportedAt || 'orbit-backup-seed.json',
      }),
    );
  } catch (error) {
    console.warn('[startup] local seed skipped:', error);
  }
}

seedLocalBackup();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
