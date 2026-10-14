import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// import Movies from "./movies.tsx"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* <Movies/> */}
  </StrictMode>,
)
