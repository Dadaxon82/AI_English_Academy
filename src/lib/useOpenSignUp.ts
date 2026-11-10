import { useNavigate } from 'react-router-dom'

/** Kirish sahifasini «Röyxatdan ötiş» rejimida ochadi (mehmon taklifi uchun). */
export function useOpenSignUp() {
  const nav = useNavigate()
  return () => nav('/login', { state: { mode: 'sign-up' } })
}
