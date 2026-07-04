import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initRemoteSync } from './store/initSync'
import './styles/global.css'

initRemoteSync()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
