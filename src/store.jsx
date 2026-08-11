import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { emptyExperts, setRound, DEMO_RESULTS } from './lib/data.js'

const VIEWS = ['start', 'experter', 'analys', 'match', 'rad', 'resultat', 'databas']
const DATA_URL = import.meta.env.BASE_URL + 'data/omgang.json'

const defaultState = () => ({
  view: 'start',
  fetched: false,
  currentExpert: 0,
  experts: emptyExperts(),
  budget: 288,
  rad: null,
  results: Array(13).fill(null),
  saved: false,
  detail: 0,
  roundData: null,
})

const demoDb = () => ({
  rounds: [
    { datum: '2026-07-25', matcher: 13, ratt: 9 },
    { datum: '2026-08-01', matcher: 13, ratt: 10 },
    { datum: '2026-08-08', matcher: 13, ratt: 8 },
  ],
})

function load(key) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [s, setS] = useState(() => {
    const saved = load('sta3_state')
    if (saved && VIEWS.includes(saved.view)) {
      const merged = { ...defaultState(), ...saved }
      if (merged.roundData) setRound(merged.roundData)
      return merged
    }
    return defaultState()
  })
  const [db, setDb] = useState(() => load('sta3_db') || demoDb())
  const [toastMsg, setToastMsg] = useState(null)
  const timer = useRef()

  useEffect(() => {
    try {
      localStorage.setItem('sta3_state', JSON.stringify(s))
    } catch { /* privat läge m.m. */ }
  }, [s])
  useEffect(() => {
    try {
      localStorage.setItem('sta3_db', JSON.stringify(db))
    } catch { /* privat läge m.m. */ }
  }, [db])

  const set = (patch) =>
    setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  const show = (view) => {
    set({ view })
    window.scrollTo(0, 0)
  }

  const toast = (msg) => {
    setToastMsg(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastMsg(null), 2600)
  }

  // Hämtar aktuell omgång (bakad JSON från Svenska Spels API via GitHub Actions).
  // Faller tillbaka på demodata om filen inte kan nås (t.ex. lokalt utan nätverk).
  const fetchRound = async () => {
    try {
      const r = await fetch(DATA_URL, { cache: 'no-store' })
      if (!r.ok) throw new Error()
      const data = await r.json()
      if (!setRound(data)) throw new Error()
      set((prev) => {
        const newDraw = prev.roundData?.drawNumber !== data.drawNumber
        return {
          fetched: true,
          roundData: data,
          ...(newDraw
            ? { experts: emptyExperts(), currentExpert: 0, rad: null, results: Array(13).fill(null), saved: false }
            : {}),
        }
      })
      toast('Omgång hämtad från Svenska Spel')
      return true
    } catch {
      set({ fetched: true })
      toast('Kunde inte nå datakällan – visar demodata')
      return false
    }
  }

  // Hämtar resultat för den omgång användaren arbetar med, när det finns.
  const fetchResults = async () => {
    if (!s.roundData) {
      set({ results: DEMO_RESULTS.slice(), saved: false })
      toast('Demoresultat ifyllda')
      return
    }
    try {
      const r = await fetch(DATA_URL, { cache: 'no-store' })
      if (!r.ok) throw new Error()
      const data = await r.json()
      const dn = s.roundData.drawNumber
      let outcomes = null
      if (data.drawNumber === dn && data.result) outcomes = data.result
      else if (data.prevResult?.drawNumber === dn) outcomes = data.prevResult.outcomes
      const map = { 1: 0, X: 1, 2: 2 }
      if (outcomes && outcomes.length === 13) {
        set({ results: outcomes.map((o) => map[o]), saved: false })
        toast('Resultat hämtade från Svenska Spel')
      } else {
        toast('Resultatet är inte klart ännu – omgången avgörs ' + (s.roundData.date || 'på lördag'))
      }
    } catch {
      toast('Kunde inte hämta resultat just nu')
    }
  }

  const newRound = () => {
    setS({ ...defaultState(), view: 'start' })
    window.scrollTo(0, 0)
  }

  return (
    <Ctx.Provider
      value={{ s, set, show, db, setDb, toastMsg, toast, newRound, fetchRound, fetchResults }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
