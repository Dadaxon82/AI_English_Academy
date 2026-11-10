/** Short sahnalari va personajlari (suhbat id'si va rol nomi bo'yicha). */

const ROLE_EMOJI: Record<string, string> = {
  Teacher: '🧑‍🏫',
  Classmate: '🧑‍🎓',
  Colleague: '🧑‍💻',
  Doctor: '🧑‍⚕️',
  Friend: '🧑',
  'New friend': '🙋',
  Landlord: '👴',
  Manager: '🧑‍💼',
  'Passer-by': '🚶',
  'Shop assistant': '👩‍💼',
  'Ticket clerk': '💁',
  Waiter: '🤵',
}

const SCENES: { match: RegExp; emoji: string; labelUz: string; bg: string }[] = [
  { match: /first-class/, emoji: '🏫', labelUz: 'Sinfxona', bg: 'from-indigo-700 to-violet-800' },
  { match: /family/, emoji: '🖼️', labelUz: 'Uyda', bg: 'from-violet-700 to-fuchsia-800' },
  { match: /meeting-time/, emoji: '⏰', labelUz: 'Şahar', bg: 'from-sky-700 to-indigo-800' },
  { match: /new-flat/, emoji: '🏠', labelUz: 'Yangi kvartira', bg: 'from-emerald-700 to-teal-800' },
  { match: /cafe/, emoji: '☕', labelUz: 'Kafe', bg: 'from-amber-700 to-orange-800' },
  { match: /weekend-plan/, emoji: '🌳', labelUz: 'Bog‘', bg: 'from-green-700 to-emerald-800' },
  { match: /directions/, emoji: '🗺️', labelUz: 'Köça', bg: 'from-slate-700 to-sky-800' },
  { match: /holiday/, emoji: '🏖️', labelUz: 'Ta’tildan keyin', bg: 'from-cyan-700 to-blue-800' },
  { match: /childhood/, emoji: '🧸', labelUz: 'Xotiralar', bg: 'from-rose-700 to-pink-800' },
  { match: /train/, emoji: '🚆', labelUz: 'Vokzal', bg: 'from-blue-700 to-indigo-800' },
  { match: /weather/, emoji: '🌦️', labelUz: 'Ob-havo', bg: 'from-sky-700 to-cyan-800' },
  { match: /interview/, emoji: '💼', labelUz: 'Iş suhbati', bg: 'from-slate-700 to-indigo-800' },
  { match: /doctor/, emoji: '🏥', labelUz: 'Şifoxona', bg: 'from-teal-700 to-cyan-800' },
  { match: /market/, emoji: '🛒', labelUz: 'Bozor', bg: 'from-orange-700 to-red-800' },
]

/** Suhbat id'si → sahna (fon, belgi, nom). */
export function sceneOf(dialogueId: string) {
  return SCENES.find((s) => s.match.test(dialogueId)) ?? { emoji: '💬', labelUz: 'Suhbat', bg: 'from-indigo-700 to-violet-800' }
}


export function roleEmoji(role: string): string {
  return ROLE_EMOJI[role] ?? '🙂'
}
