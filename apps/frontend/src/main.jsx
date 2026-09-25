import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App.jsx';
import { initFontScale } from './lib/fontScale.js';
import './styles/tokens.css';

// Apply a saved "A+ Letra grande" choice before the first paint.
initFontScale();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
