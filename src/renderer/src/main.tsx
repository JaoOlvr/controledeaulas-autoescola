import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'
import { createWebApiClient } from './lib/api-web'

// Se estiver rodando no navegador (Tablet, Celular, etc.) sem o preload do Electron,
// inicializa o cliente Web que se comunica via HTTP com o servidor do PC
if (!window.api) {
  // @ts-ignore
  window.api = createWebApiClient()
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
