import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import LanguageFlags from '../components/LanguageFlags'
import { LANGUAGES, activeLanguage, languageHref } from '../lib/languages'

afterEach(cleanup)

describe('til bayroqlari', () => {
  it('beşta til: Angliya, Germaniya, Rossiya, Xitoy, Koreya', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'de', 'ru', 'zh', 'ko'])
  })

  it('ingliz tili — asosiy kurs, qolganlari — til sahifasi', () => {
    expect(languageHref('en')).toBe('/dashboard')
    expect(languageHref('de')).toBe('/lang/de')
    expect(languageHref('ko')).toBe('/lang/ko')
  })

  it('faol til manzildan aniqlanadi', () => {
    expect(activeLanguage('/dashboard')).toBe('en')
    expect(activeLanguage('/lang/zh')).toBe('zh')
    expect(activeLanguage('/lang/xx')).toBe('en')
  })

  it('header bayroqlari tegişli sahifaga olib boradi', () => {
    render(
      <MemoryRouter initialEntries={['/lang/ru']}>
        <LanguageFlags />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/dashboard', '/lang/de', '/lang/ru', '/lang/zh', '/lang/ko'])
    expect(screen.getByRole('link', { name: /Rus tili/ }).getAttribute('aria-current')).toBe('page')
  })
})
