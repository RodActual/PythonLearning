import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Import global styles

/**
 * main.jsx
 * This is the entry file for the React application.
 * It mounts the App component into the root DOM element.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode runs checks and warnings only in development mode
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);