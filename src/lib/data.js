export const SIGNS = ['1', 'X', '2']
export const COMBO_ORDER = ['1', 'X', '2', '1X', '12', 'X2', '1X2']
export const INTERVALS = ['0–9', '10–19', '20–29', '30–39', '40+']

// De två spelformerna. Vald spelform används alltid primärt – jämförbar
// historik från den andra används bara som sekundärt stöd.
// Beslutad färgprofil: Stryktipset blå, Europatipset grön.
export const GAMES = {
  stryktipset: {
    label: 'Stryktipset',
    experts: 6,
    other: 'europatipset',
    otherLabel: 'Europatipset',
    url: 'spela.svenskaspel.se/stryktipset',
    color: '#255c91',
  },
  europatipset: {
    label: 'Europatipset',
    experts: 3,
    other: 'stryktipset',
    otherLabel: 'Stryktipset',
    url: 'spela.svenskaspel.se/europatipset',
    color: '#2f7f4a',
  },
}

export const emptyExperts = (n = 6) =>
  Array.from({ length: n }, () => Array.from({ length: 13 }, () => []))

export const emptyRad = () => Array.from({ length: 13 }, () => [])

// Aktuell omgång – tom tills riktig data hämtats
// (public/data/<spel>.json, bakad av scripts/fetch-omgang.mjs via GitHub Actions).
export const ROUND = {
  game: 'stryktipset',
  source: 'none',
  drawNumber: null,
  label: 'Ingen omgång hämtad',
  date: '',
  updated: null,
  matches: null,
  result: null,
  prevResult: null,
}

export function resetRound(game = 'stryktipset') {
  ROUND.game = game
  ROUND.source = 'none'
  ROUND.drawNumber = null
  ROUND.label = 'Ingen omgång hämtad'
  ROUND.date = ''
  ROUND.updated = null
  ROUND.matches = null
  ROUND.result = null
  ROUND.prevResult = null
}

export function setRound(data, game = 'stryktipset') {
  if (!data || !Array.isArray(data.matches) || data.matches.length !== 13) return false
  ROUND.game = game
  ROUND.source = 'live'
  ROUND.drawNumber = data.drawNumber
  ROUND.label = data.label || `${GAMES[game].label} omgång ${data.drawNumber}`
  ROUND.date = data.date || ''
  ROUND.updated = data.updated || null
  ROUND.matches = data.matches
  ROUND.result = data.result || null
  ROUND.prevResult = data.prevResult || null
  return true
}
