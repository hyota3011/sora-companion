/**
 * Application entry point.
 * Initializes the React root and renders the main Chat component.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Chat from './Chat.jsx'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Chat />
  </React.StrictMode>
);