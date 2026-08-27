import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { emptyExperts, emptyRad, setRound, resetRound, GAMES, ROUND, SIGNS } from './lib/data.js'
import { patternOf, diffOf, intervalOf, signStr, comboKey, setHistory } from './lib/model.js'

const VIEWS = ['start', 'experter', 'analys', 'match', 'rad', 'resultat', 'databas', 'nille']

const defaultState = (game = 'stryktipset') => ({
  view: 'start',
  game,
  fetched: false,
  fetchError: null,
  currentExpert: 0,
  experts: emptyExperts(GAMES[game].experts),
  budget: 192,
  rad: null,
  results: Array(13).fill(null),
  saved: false,
  detail: 0,
  roundData: null,
  nille: { step: 0, rad: emptyRad(), saved: false },
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
    const saved = load('sta4_state')
    if (saved && VIEWS.includes(saved.view) && GAMES[saved.game || 'stryktipset']) {
      const merged = { ...defaultState(saved.game || 'stryktipset'), ...saved }
      if (merged.roundData) setRound(merged.roundData, merged.game)
      return merged
    }
    return defaultState()
  })
  const [historyRev, setHistoryRev] = useState(0)
  const [toastMsg, setToastMsg] = useState(null)
  const timer = useRef()

  useEffect(() => {
    try {
      localStorage.setItem('sta4_state', JSON.stringify(s))
    } catch { /* privat läge m.m. */ }
  }, [s])

  // Ladda hela historiken från Firestore en gång vid start –
  // modellen räknar sedan på riktiga sparade omgångar.
  useEffect(() => {
    let alive = true
    import('./lib/db.js')
      .then(({ loadAllHistory }) => loadAllHistory())
      .then((h) => {
        if (!alive) return
        setHistory(h)
        setHistoryRev((r) => r + 1)
      })
      .catch(() => {
        if (!alive) return
        setHistory({ stryktipset: [], europatipset: [] })
        setHistoryRev((r) => r + 1)
      })
    return () => {
      alive = false
    }
  }, [])

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

  // Byt spelform: omgångsdata, expertrader och rad nollställs
  const setGame = (game) => {
    if (game === s.game) return
    resetRound(game)
    setS((prev) => ({ ...defaultState(game), view: prev.view, budget: prev.budget }))
    toast(GAMES[game].label + ' valt – hämta omgången')
  }

  // Hämtar aktuell omgång (bakad JSON från Svenska Spels API via GitHub Actions)
  const fetchRound = async () => {
    const game = s.game
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}data/${game}.json`, { cache: 'no-store' })
      if (!r.ok) throw new Error()
      const data = await r.json()
      if (data.available === false) {
        resetRound(game)
        set({ fetched: false, roundData: null, fetchError: `Ingen ${GAMES[game].label}-omgång är öppen just nu. Nästa omgång hämtas automatiskt när Svenska Spel öppnar den.` })
        return false
      }
      if (!setRound(data, game)) throw new Error()
      set((prev) => {
        const newDraw = prev.roundData?.drawNumber !== data.drawNumber
        return {
          fetched: true,
          fetchError: null,
          roundData: data,
          ...(newDraw
            ? {
                experts: emptyExperts(GAMES[game].experts),
                currentExpert: 0,
                rad: null,
                results: Array(13).fill(null),
                saved: false,
                nille: { step: 0, rad: emptyRad(), saved: false },
              }
            : {}),
        }
      })
      toast('Omgång hämtad från Svenska Spel')
      return true
    } catch {
      resetRound(game)
      set({ fetched: false, roundData: null, fetchError: 'Kunde inte nå datakällan – kontrollera uppkopplingen och försök igen.' })
      return false
    }
  }

  // Hämtar resultat för den omgång användaren arbetar med, när det finns
  const fetchResults = async () => {
    if (!s.roundData) {
      toast('Hämta omgången först')
      return
    }
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}data/${s.game}.json`, { cache: 'no-store' })
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
        toast('Resultatet är inte klart ännu – omgången avgörs ' + (s.roundData.date || 'på matchdagen'))
      }
    } catch {
      toast('Kunde inte hämta resultat just nu')
    }
  }

  // Spara omgången: fullt dataset till spelets egen Firestore-samling
  const saveRound = async () => {
    if (s.saved || !s.rad || !ROUND.matches) return
    const hits = s.results.filter((r, i) => s.rad[i].includes(r)).length
    set({ saved: true })
    const payload = {
      id: `omgang-${ROUND.drawNumber}`,
      game: s.game,
      drawNumber: ROUND.drawNumber,
      label: ROUND.label,
      date: ROUND.date,
      savedAt: new Date().toISOString(),
      matcher: 13,
      ratt: hits,
      minRad: s.rad.map(signStr),
      resultat: s.results.map((r) => SIGNS[r]),
      // Firestore tillåter inte nästlade arrayer – varje expertrad blir ett objekt
      experter: s.experts.map((e, i) => ({ expert: i + 1, tecken: e.map((c) => comboKey(c)) })),
      matchdata: ROUND.matches.map((m, i) => ({
        nr: i + 1,
        namn: m.name,
        folk: m.folk,
        odds: m.odds,
        monster: patternOf(s.experts, i),
        diff: diffOf(i).total,
        intervall: intervalOf(diffOf(i).total),
        resultat: SIGNS[s.results[i]],
      })),
    }
    try {
      const { saveDocTo, loadAllHistory } = await import('./lib/db.js')
      await saveDocTo(s.game, payload)
      toast('Omgången sparad i databasen ✓ 13 datapunkter')
      // Uppdatera historiken som modellen räknar på
      const h = await loadAllHistory()
      setHistory(h)
      setHistoryRev((r) => r + 1)
    } catch {
      set({ saved: false })
      toast('Kunde inte spara – kontrollera uppkopplingen och försök igen')
    }
  }

  // Spara Nilles rad i NILLE-databasen
  const saveNille = async () => {
    if (s.nille.saved || !ROUND.matches) return
    const payload = {
      id: `nille-${s.game}-${ROUND.drawNumber}`,
      game: s.game,
      drawNumber: ROUND.drawNumber,
      date: ROUND.date,
      savedAt: new Date().toISOString(),
      rad: s.nille.rad.map(signStr),
    }
    try {
      const { saveDocTo } = await import('./lib/db.js')
      await saveDocTo('nille', payload)
      set((prev) => ({ nille: { ...prev.nille, saved: true } }))
      toast('NILLE-raden sparad i databasen ✓')
    } catch {
      toast('Kunde inte spara NILLE-raden just nu')
    }
  }

  const newRound = () => {
    resetRound(s.game)
    setS((prev) => ({ ...defaultState(prev.game), budget: prev.budget }))
    window.scrollTo(0, 0)
  }

  return (
    <Ctx.Provider
      value={{ s, set, show, toastMsg, toast, newRound, fetchRound, fetchResults, setGame, saveRound, saveNille, historyRev }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
