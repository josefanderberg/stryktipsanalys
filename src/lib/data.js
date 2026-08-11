export const SIGNS = ['1', 'X', '2']
export const COMBO_ORDER = ['1', 'X', '2', '1X', '12', 'X2', '1X2']
export const INTERVALS = ['0–9', '10–19', '20–29', '30–39', '40+']
// Demodata som reserv om riktig data inte kan hämtas
export const DEMO_MATCHES = [
  { name: 'Nottingham – Arsenal',   folk: [20, 26, 54], odds: [23, 27, 50] },
  { name: 'Chelsea – Brentford',    folk: [71, 17, 12], odds: [58, 24, 18] },
  { name: 'Leeds – Fulham',         folk: [44, 30, 26], odds: [40, 30, 30] },
  { name: 'Liverpool – Burnley',    folk: [78, 14, 8],  odds: [75, 16, 9] },
  { name: 'Tottenham – West Ham',   folk: [48, 27, 25], odds: [44, 29, 27] },
  { name: 'Sunderland – C Palace',  folk: [35, 32, 33], odds: [32, 31, 37] },
  { name: 'Charlton – Sheffield U', folk: [54, 28, 18], odds: [50, 25, 25] },
  { name: 'Oxford – Bristol City',  folk: [48, 33, 19], odds: [39, 31, 30] },
  { name: 'Preston – Derby',        folk: [33, 33, 34], odds: [31, 33, 36] },
  { name: 'Southampton – Hull',     folk: [52, 27, 21], odds: [49, 28, 23] },
  { name: 'Stoke – QPR',            folk: [70, 20, 10], odds: [56, 26, 18] },
  { name: 'Swansea – Birmingham',   folk: [38, 31, 31], odds: [36, 30, 34] },
  { name: 'Wrexham – Norwich',      folk: [41, 30, 29], odds: [38, 30, 32] },
]

// Sex demoexpertrader (Match 7 ger mönstret 1×2 · 1X×3 · X2×1 från kravexemplet)
export const DEMO_EXPERTS = [
  [['2'], ['1'], ['1', 'X'], ['1'], ['1', 'X'], ['X', '2'], ['1', 'X'], ['2'], ['X', '2'], ['1'], ['1'], ['1', 'X'], ['1']],
  [['X', '2'], ['1'], ['1'], ['1'], ['1'], ['X', '2'], ['1'], ['2'], ['X', '2'], ['1'], ['2'], ['1', 'X'], ['1', 'X']],
  [['2'], ['1', 'X'], ['1', 'X'], ['1'], ['1', 'X'], ['X'], ['X', '2'], ['X', '2'], ['1', 'X', '2'], ['1', 'X'], ['X'], ['1'], ['1']],
  [['X', '2'], ['1'], ['1', 'X'], ['1'], ['1', 'X', '2'], ['X', '2'], ['1', 'X'], ['2'], ['X', '2'], ['1'], ['1', 'X'], ['1', '2'], ['1', 'X']],
  [['2'], ['1', 'X'], ['1', '2'], ['1'], ['1', 'X'], ['1', 'X'], ['1', 'X'], ['X', '2'], ['1', 'X', '2'], ['1', 'X'], ['X', '2'], ['X', '2'], ['1']],
  [['X', '2'], ['1'], ['1', 'X'], ['1'], ['X'], ['X', '2'], ['1'], ['1', '2'], ['X', '2'], ['1'], ['1', '2'], ['1', 'X'], ['1', 'X', '2']],
]

// Demoresultat (index i SIGNS) – bl.a. fälls den överstreckade favoriten i match 2
export const DEMO_RESULTS = [2, 2, 0, 0, 0, 1, 0, 2, 1, 1, 0, 1, 0]

export const emptyExperts = () =>
  Array.from({ length: 6 }, () => Array.from({ length: 13 }, () => []))

// Aktuell omgång – börjar som demo och byts ut när riktig data hämtats
// (public/data/omgang.json, bakad av scripts/fetch-omgang.mjs via GitHub Actions).
export const ROUND = {
  source: 'demo',
  drawNumber: null,
  label: 'Demo-omgång · Lördag 15 augusti 2026',
  date: '2026-08-15',
  updated: null,
  matches: DEMO_MATCHES,
  result: null,
  prevResult: null,
}

export function setRound(data) {
  if (!data || !Array.isArray(data.matches) || data.matches.length !== 13) return false
  ROUND.source = 'live'
  ROUND.drawNumber = data.drawNumber
  ROUND.label = data.label || `Stryktipset omgång ${data.drawNumber}`
  ROUND.date = data.date || ''
  ROUND.updated = data.updated || null
  ROUND.matches = data.matches
  ROUND.result = data.result || null
  ROUND.prevResult = data.prevResult || null
  return true
}
