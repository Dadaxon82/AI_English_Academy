/**
 * 3D olam — mantiq qatlami: stansiyalar ketma-ket ochilishi, yulduz va tanga
 * hisobi, tanga do'koni, mukofot (haqiqiy farq), qahramon harakati.
 */
import { describe, expect, it } from 'vitest'
import { getBundle, findExercise, vocabQuizExercise } from '../content'
import type { VocabularyItem } from '../content/types'
import { Controls } from '../components/world3d/controls'
import { buildChain, exerciseIdsForSection, PLAN_ORDER } from '../lib/lessonChain'
import { reducer as reduce } from '../lib/reducer'
import { stepDoneChecker, stepScoreKey, stepScoreReader } from '../lib/stepProgress'
import { emptyData } from '../lib/types'
import type { AppData } from '../lib/types'
import {
  COINS_SPENT_KEY,
  FINISH_POS,
  INTERACT_RADIUS,
  ISLAND,
  STATION_POS,
  buildWorld,
  clampToIsland,
  coinBalance,
  coinBuy,
  coinsEarned,
  frontOf,
  nearestPoint,
  rewardFor,
  starsOf,
} from '../lib/world3d'

const bundle = getBundle('A1')
const day = bundle.days[0]!
const chain = buildChain(
  day,
  Object.fromEntries(
    day.sections.map((s) => [
      s.skill,
      exerciseIdsForSection(s, {
        vocabQuizIds: (ids) =>
          ids
            .map((id) => bundle.vocab.find((v) => v.id === id))
            .filter((v): v is VocabularyItem => v !== undefined)
            .map((v) => vocabQuizExercise(v).id),
        grammarExercises: (id) => bundle.grammar.find((g) => g.id === id)?.exercises ?? [],
        readingExercises: (id) => bundle.reading.find((r) => r.id === id)?.exercises ?? [],
        listeningExercises: (id) => bundle.listening.find((l) => l.id === id)?.exercises ?? [],
        findExercise,
      }),
    ]),
  ),
  0,
  true,
)

function withScores(scores: Record<string, number>, completedDays: string[] = []): AppData {
  const d = emptyData('u-world')
  const passedTests = Object.fromEntries(Object.entries(scores).map(([skill, v]) => [stepScoreKey(day.id, skill), v]))
  return { ...d, path: { ...d.path, passedTests, completedDays } }
}
const worldOf = (data: AppData) => buildWorld(chain, stepDoneChecker(data), stepScoreReader(data), data.path.completedDays.includes(day.id))

describe('olam tuzilişi', () => {
  it('olti stansiya reja tartibida, topşiriqlar soni kontentdan; oxirida Finiş (kun testi)', () => {
    const w = worldOf(withScores({}))
    expect(w.stations.map((s) => s.skill)).toEqual(PLAN_ORDER)
    for (const s of w.stations) expect(s.tasks, s.skill).toBeGreaterThan(0)
    expect(w.finish?.tasks).toBe(day.sectionTest!.exercises.length)
    expect(w.finish?.passScore).toBe(day.sectionTest!.passScore)
  })

  it('stansiyalar KETMA-KET oçiladi: faqat birinçisi oçiq, qolgani va Finiş qulf', () => {
    const w = worldOf(withScores({}))
    expect(w.stations.map((s) => s.state)).toEqual(['open', 'locked', 'locked', 'locked', 'locked', 'locked'])
    expect(w.finish?.state).toBe('locked')
    expect(w.target).toEqual(STATION_POS[0])
  })

  it('stansiya yakunlansa keyingisi oçiladi; hammasi tugasa — Finiş', () => {
    const w2 = worldOf(withScores({ vocabulary: 95, grammar: 72 }))
    expect(w2.stations.map((s) => s.state)).toEqual(['done', 'done', 'open', 'locked', 'locked', 'locked'])
    expect(w2.stations.map((s) => s.stars).slice(0, 3)).toEqual([3, 2, 0])
    const all = Object.fromEntries(PLAN_ORDER.map((s) => [s, 80]))
    const w6 = worldOf(withScores(all))
    expect(w6.finish?.state).toBe('open')
    expect(w6.target).toEqual(FINISH_POS)
    const done = worldOf(withScores(all, [day.id]))
    expect(done.finish?.state).toBe('done')
    expect(done.target).toBeNull()
  })

  it('2D xaritada oldinroq yeçilgan stansiya yakunlangan bölib qoladi, lekin oldingisi ötilmaguniça keyingilari qulf', () => {
    const w = worldOf(withScores({ grammar: 100 }))
    expect(w.stations.map((s) => s.state)).toEqual(['open', 'done', 'locked', 'locked', 'locked', 'locked'])
    expect(w.target).toEqual(STATION_POS[0])
  })

  it('NPC gaplari: inglizça va özbekça, javob gapi bor; stansiyalar orol içida', () => {
    const w = worldOf(withScores({}))
    for (const s of w.stations) {
      expect(s.npc.en.length).toBeGreaterThan(10)
      expect(s.npc.uz.length).toBeGreaterThan(5)
      expect(s.npc.replyEn.split(' ').length).toBeGreaterThanOrEqual(3)
      expect(clampToIsland(...s.pos)).toEqual(s.pos)
      expect(clampToIsland(...frontOf(s.pos))).toEqual(frontOf(s.pos))
    }
  })
})

describe('yulduz va tanga', () => {
  it('yulduz çegaralari', () => {
    expect(starsOf(100, true)).toBe(3)
    expect(starsOf(90, true)).toBe(3)
    expect(starsOf(89, true)).toBe(2)
    expect(starsOf(70, true)).toBe(2)
    expect(starsOf(40, true)).toBe(1)
    expect(starsOf(null, true)).toBe(1)
    expect(starsOf(100, false)).toBe(0)
  })

  it('tanga natijalardan hisoblanadi: yulduz × 10 + yakunlangan kun × 100', () => {
    expect(coinsEarned(withScores({}))).toBe(0)
    expect(coinsEarned(withScores({ vocabulary: 95, grammar: 72, reading: 30 }))).toBe(60)
    expect(coinsEarned(withScores({ vocabulary: 95 }, [day.id]))).toBe(130)
  })

  it('xarid: tanga kamayadi, buyum qöşiladi; yetmasa yoki çegarada — sabab, holat özgarmaydi', () => {
    const rich = withScores(Object.fromEntries(PLAN_ORDER.map((s) => [s, 95])), [day.id]) // 180 + 100
    expect(coinBalance(rich)).toBe(280)
    const gems = coinBuy(rich, 'gems')
    expect(gems.ok).toBe(true)
    expect(gems.data.game.gems).toBe(rich.game.gems + 20)
    expect(coinBalance(gems.data)).toBe(220)
    expect(gems.data.path.passedTests[COINS_SPENT_KEY]).toBe(60)

    const full = coinBuy(rich, 'heart') // yuraklar to'la
    expect(full).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/töla/) })
    expect(full.data).toBe(rich)

    const hurt = { ...rich, game: { ...rich.game, hearts: 2 } }
    expect(coinBuy(hurt, 'heart').data.game.hearts).toBe(3)

    const poor = withScores({ vocabulary: 95 })
    expect(coinBuy(poor, 'freeze')).toMatchObject({ ok: false, reasonUz: expect.stringMatching(/Tanga yetmadi: 150 kerak, sizda 30/) })
  })

  it('reducer: coin-buy saqlanadi; sarf kaliti kun testlari soniga qöşilmaydi', () => {
    const rich = withScores(Object.fromEntries(PLAN_ORDER.map((s) => [s, 95])))
    const next = reduce(rich, { type: 'coin-buy', item: 'gems' })
    expect(next.game.gems).toBe(rich.game.gems + 20)
    expect(coinBalance(next)).toBe(120)
    expect(Object.keys(next.path.passedTests).filter((k) => !k.includes(':'))).toHaveLength(0)
    expect(reduce(withScores({}), { type: 'coin-buy', item: 'gems' }).game.gems).toBe(0)
  })
})

describe('mukofot — faqat haqiqiy farq', () => {
  it('yangi natija yozilgan bölsa: yulduz, XP va tanga farqi', () => {
    const before = withScores({})
    const after = { ...withScores({ vocabulary: 92 }), xp: 140 }
    const r = rewardFor({ dayId: day.id, skill: 'vocabulary', xp: 20, coins: coinBalance(before), hadScore: false }, worldOf(after), after)
    expect(r).toMatchObject({ skill: 'vocabulary', score: 92, stars: 3, xp: 120, coins: 30 })
  })
  it('dars tugatilmagan (natija yöq) yoki boşqa kun — mukofot yöq', () => {
    const d = withScores({})
    expect(rewardFor({ dayId: day.id, skill: 'vocabulary', xp: 0, coins: 0, hadScore: false }, worldOf(d), d)).toBeNull()
    const done = withScores({ vocabulary: 92 })
    expect(rewardFor({ dayId: 'boshqa', skill: 'vocabulary', xp: 0, coins: 0, hadScore: false }, worldOf(done), done)).toBeNull()
    expect(rewardFor(null, worldOf(done), done)).toBeNull()
  })
  it('qayta öynalib, heç narsa qöşilmagan bölsa — mukofot oynasi çiqmaydi', () => {
    const done = { ...withScores({ vocabulary: 92 }), xp: 50 }
    expect(rewardFor({ dayId: day.id, skill: 'vocabulary', xp: 50, coins: coinBalance(done), hadScore: true }, worldOf(done), done)).toBeNull()
  })
})

describe('qahramon harakati', () => {
  it('klaviatura: W — oldinga (z kamayadi); orol çegarasidan çiqmaydi', () => {
    const c = new Controls([0, 15])
    c.keys.add('KeyW')
    for (let i = 0; i < 20; i++) c.step(0.05, [])
    expect(c.pos[1]).toBeLessThan(15)
    expect(c.moving).toBe(true)
    c.keys.clear()
    c.keys.add('KeyS')
    for (let i = 0; i < 400; i++) c.step(0.05, [])
    expect(c.pos[1]).toBeLessThanOrEqual(ISLAND.rz + 1e-6)
  })

  it('bosib yuriş: nuqtaga boradi va töxtaydi; bino içiga kirmaydi', () => {
    const c = new Controls([0, 15])
    const st = STATION_POS[0]!
    c.walkTo(frontOf(st))
    for (let i = 0; i < 200 && c.target; i++) c.step(0.05, [[st[0], st[1], 1.75]])
    expect(c.target).toBeNull()
    expect(Math.hypot(c.pos[0] - st[0], c.pos[1] - st[1])).toBeLessThanOrEqual(INTERACT_RADIUS)
    expect(Math.hypot(c.pos[0] - st[0], c.pos[1] - st[1])).toBeGreaterThanOrEqual(1.74)
    expect(nearestPoint(worldOf(withScores({})), c.pos[0], c.pos[1])).toMatchObject({ kind: 'station', station: { skill: 'vocabulary' } })
  })

  it('suhbat paytida (pauza) yurmaydi; joystik yönalişi', () => {
    const c = new Controls([0, 0])
    c.setJoy(1, 0)
    c.step(0.05, [])
    expect(c.pos[0]).toBeGreaterThan(0)
    const x = c.pos[0]
    c.setPaused(true)
    c.keys.add('KeyD')
    c.step(0.05, [])
    expect(c.pos[0]).toBe(x)
    expect(c.moving).toBe(false)
  })

  it('Finiş oldidagi nuqta suhbat masofasida', () => {
    const all = Object.fromEntries(PLAN_ORDER.map((s) => [s, 80]))
    const p = frontOf(FINISH_POS, true)
    expect(nearestPoint(worldOf(withScores(all)), p[0], p[1])).toEqual({ kind: 'finish' })
  })
})
