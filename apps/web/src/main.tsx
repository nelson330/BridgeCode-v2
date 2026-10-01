import '@fontsource-variable/outfit/index.css'
import '@fontsource-variable/plus-jakarta-sans/index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './lib/i18n'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
