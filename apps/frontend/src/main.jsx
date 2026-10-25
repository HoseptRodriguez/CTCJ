import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App.jsx';
import { initFontScale } from './lib/fontScale.js';
// Fonts served from this site (SIL Open Font License), not from Google: the
// visitor's IP never goes to a third party just to render text.
import '@fontsource/archivo/latin-400.css';
import '@fontsource/archivo/latin-400-italic.css';
import '@fontsource/archivo/latin-500.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-700.css';
import '@fontsource/archivo-narrow/latin-400.css';
import '@fontsource/archivo-narrow/latin-500.css';
import '@fontsource/archivo-narrow/latin-600.css';
import '@fontsource/archivo-narrow/latin-700.css';
import './styles/tokens.css';

// Apply a saved "A+ Letra grande" choice before the first paint.
initFontScale();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
