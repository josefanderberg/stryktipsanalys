// Statistik över sparade omgångar. Strategiernas rader sparas inte i databasen,
// så varje omgång spelas om med enbart den historik som var sparad före
// omgångens spelstopp – samma underlag som appen hade när raden byggdes.
import { SIGNS } from './data.js'
import { withContext, flattenRounds, strategyRows, systemForBudget, signalsFor } from './model.js'

export const BUDGETS = [128, 192, 256]

// Raderna som jämförs. De tre sista är jämförelserader, inte strategier.
export const ROWS = [
  { key: 'adaptive', name: '★ Adaptiv', short: 'A' },
  { key: 'hist', name: '◷ Historiskt mönster', short: 'H' },
  { key: 'diff', name: '◎ Mönster + differens', short: 'H+D' },
  { key: 'model', name: '▥ Sammanvägd modell', short: 'M' },
  { key: 'odds', name: 'Ren oddsrad', short: 'Odds', ref: true },
  { key: 'saved', name: 'Sparad rad', short: 'Sparad', ref: true },
  { key: 'nille', name: 'Nilles rad', short: 'Nille', ref: true },
]

const EMPTY = { stryktipset: [], europatipset: [] }

// Spelstopp i svensk tid → UTC-tidsstämpel, jämförbar med savedAt
function closeTime(r) {
  const m = /(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(r.label || '')
  if (!m) return r.date ? `${r.date}T21:59:59.000Z` : r.savedAt || ''
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const part = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(guess)).find((p) => p.type === 'hour')
  const offset = ((Number(part.value) - h + 36) % 24) - 12
  return new Date(guess - offset * 3600e3).toISOString()
}

const toRad = (strs) => strs.map((s) => String(s).split('').map((c) => SIGNS.indexOf(c)))
const countHits = (rad, res) => rad.filter((s, i) => s.includes(res[i])).length
const usable = (r) =>
  Array.isArray(r.matchdata) && r.matchdata.length === 13 &&
  r.matchdata.every((m) => SIGNS.includes(m.resultat) && m.odds && m.folk) &&
  Array.isArray(r.experter) && r.experter.length > 0

export function runBacktest({ stryktipset = [], europatipset = [], nille = [] }) {
  const all = [
    ...stryktipset.map((r) => ({ ...r, game: 'stryktipset' })),
    ...europatipset.map((r) => ({ ...r, game: 'europatipset' })),
  ]
    .filter(usable)
    .map((r) => ({ ...r, close: closeTime(r) }))
    .sort((a, b) => a.close.localeCompare(b.close))

  return all.map((r) => {
    const prior = all.filter((x) => x.id !== r.id && (x.savedAt || '') < r.close)
    const history = {
      stryktipset: flattenRounds(prior.filter((x) => x.game === 'stryktipset'), 'stryktipset'),
      europatipset: flattenRounds(prior.filter((x) => x.game === 'europatipset'), 'europatipset'),
    }
    const ctx = {
      game: r.game,
      matches: r.matchdata.map((m) => ({ name: m.namn, folk: m.folk, odds: m.odds })),
    }
    const experts = r.experter
      .slice()
      .sort((a, b) => a.expert - b.expert)
      .map((e) => e.tecken.map((t) => String(t).split('')))
    const res = r.matchdata.map((m) => SIGNS.indexOf(m.resultat))

    const { rows, histN } = withContext(ctx, history, () => ({
      rows: Object.fromEntries(
        BUDGETS.map((b) => {
          const st = strategyRows(experts, b)
          return [b, {
            adaptive: systemForBudget(experts, b).rad,
            hist: st.hist.rad,
            diff: st.diff.rad,
            model: st.model.rad,
          }]
        }),
      ),
      histN: ctx.matches.map((_, i) => signalsFor(experts, i).hist.n),
    }))
    // Tom historik ⇒ modellen är lika med oddsen: samma radbygge, bara odds
    const oddsRows = withContext(ctx, EMPTY, () =>
      Object.fromEntries(BUDGETS.map((b) => [b, strategyRows(experts, b).model.rad])),
    )
    BUDGETS.forEach((b) => (rows[b].odds = oddsRows[b]))

    const n = nille.find((x) => x.game === r.game && x.drawNumber === r.drawNumber)
    return {
      id: r.id,
      game: r.game,
      date: r.date || '',
      res,
      rows,
      saved: Array.isArray(r.minRad) && r.minRad.length === 13 ? toRad(r.minRad) : null,
      nille: n && Array.isArray(n.rad) && n.rad.length === 13 ? toRad(n.rad) : null,
      matches: r.matchdata.map((m, i) => ({ odds: m.odds, folk: m.folk, res: res[i], histN: histN[i] })),
    }
  })
}

// Raden för en omgång: strategier och oddsrad beror på budget, sparade rader inte
export const radOf = (round, key, budget) =>
  key === 'saved' || key === 'nille' ? round[key] : round.rows[budget][key]

export function hitsOf(round, key, budget) {
  const rad = radOf(round, key, budget)
  return rad ? countHits(rad, round.res) : null
}

export function summarize(rounds, key, budget) {
  const hits = rounds.map((r) => hitsOf(r, key, budget)).filter((h) => h !== null)
  const n = hits.length
  return {
    n,
    avg: n ? hits.reduce((s, h) => s + h, 0) / n : null,
    best: n ? Math.max(...hits) : null,
    c10: hits.filter((h) => h >= 10).length,
    c11: hits.filter((h) => h >= 11).length,
    c12: hits.filter((h) => h === 12).length,
    c13: hits.filter((h) => h === 13).length,
  }
}

// Kronologisk delning: första halvan mot senaste
export function halves(rounds) {
  const cut = Math.ceil(rounds.length / 2)
  return [rounds.slice(0, cut), rounds.slice(cut)]
}

// Andel matcher där det fanns historik för det exakta expertmönstret
export function histCoverage(rounds) {
  const ns = rounds.flatMap((r) => r.matches.map((m) => m.histN))
  return ns.length ? ns.filter((n) => n > 0).length / ns.length : null
}

export const CHOICES = ['1', 'X', '2', '1X', '12', 'X2']
export const BANDS = [
  { label: '70 % eller mer', lo: 70, hi: 101 },
  { label: '60–69 %', lo: 60, hi: 70 },
  { label: '50–59 %', lo: 50, hi: 60 },
  { label: '40–49 %', lo: 40, hi: 50 },
  { label: 'Under 40 %', lo: 0, hi: 40 },
]
export const DIFFS = [
  { label: 'Överstreckad (+5 eller mer)', test: (d) => d >= 5 },
  { label: 'Neutral (−4 till +4)', test: (d) => d > -5 && d < 5 },
  { label: 'Understreckad (−5 eller mer)', test: (d) => d <= -5 },
]

// Var uppstår felen för en rad? Alla tal är { n, miss }.
export function missStats(rounds, key, budget) {
  const picks = rounds.flatMap((r) => {
    const rad = radOf(r, key, budget)
    return rad ? r.matches.map((m, i) => ({ ...m, pick: rad[i], miss: !rad[i].includes(m.res) })) : []
  })
  const tally = (list) => ({ n: list.length, miss: list.filter((p) => p.miss).length })
  const spikes = picks.filter((p) => p.pick.length === 1)
  const fav = (p) => p.odds.indexOf(Math.max(...p.odds))
  return {
    total: tally(picks),
    spikes: tally(spikes),
    byChoice: CHOICES.map((c) => tally(picks.filter((p) => p.pick.map((i) => SIGNS[i]).join('') === c))),
    byBand: BANDS.map((b) => tally(spikes.filter((p) => p.odds[p.pick[0]] >= b.lo && p.odds[p.pick[0]] < b.hi))),
    byDiff: DIFFS.map((d) => tally(spikes.filter((p) => d.test(p.folk[p.pick[0]] - p.odds[p.pick[0]])))),
    // Per faktiskt utfall: hur ofta saknades tecknet på raden?
    byOutcome: SIGNS.map((_, si) => tally(picks.filter((p) => p.res === si))),
    favIn: tally(picks.filter((p) => p.pick.includes(fav(p)))),
    favOut: tally(picks.filter((p) => !p.pick.includes(fav(p)))),
  }
}
