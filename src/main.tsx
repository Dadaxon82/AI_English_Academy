import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Xatolar oqibati — foydalanuvchi ko'rmaydigan "jim" xatolarni oldini olish
window.addEventListener('error', (e) => {
  console.error('[AEA runtime]', e.message)
})

const el = document.getElementById('root')
if (!el) throw new Error('#root topilmadi — index.html tekshiring')

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker ro'yxatdan o'tishi vite-plugin-pwa (injectRegister: 'auto')
// tomonidan prod build'ga avtomatik qo'shiladi — bu yerda takrorlamaymiz.
