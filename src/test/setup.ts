import '@testing-library/jest-dom/vitest'

// jsdom'da mavjud bo'lmagan API'lar — komponentlar halol tekshiradi
if (!('speechSynthesis' in window)) {
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true })
}

// matchMedia (theme: system) uchun stoyka
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia
