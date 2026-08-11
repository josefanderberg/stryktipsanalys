import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { emptyExperts } from './lib/data.js'

const VIEWS = ['start', 'experter', 'analys', 'match', 'rad', 'resultat', 'databas']

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
    if (saved && VIEWS.includes(saved.view)) return { ...defaultState(), ...saved }
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
    timer.current = setTimeout(() => setToastMsg(null), 2200)
  }

  const newRound = () => {
    setS({ ...defaultState(), view: 'start' })
    window.scrollTo(0, 0)
  }

  return (
    <Ctx.Provider value={{ s, set, show, db, setDb, toastMsg, toast, newRound }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
