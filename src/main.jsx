import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Read Firebase config from Vite environment variable and set global variable
const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG || '{}';
console.log("Firebase Config String:", firebaseConfigString);
window.__firebase_config = firebaseConfigString;
window.__app_id = import.meta.env.VITE_APP_ID || 'default-coding-mentor';
window.__gemini_api_key = import.meta.env.VITE_GEMINI_API_KEY || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
