import { SIGNS, COMBO_ORDER, INTERVALS, ROUND, GAMES } from './data.js'

/* ---------- Grundläggande hjälpfunktioner ---------- */

export const comboKey = (arr) => SIGNS.filter((s) => arr.includes(s)).join('')

// Normaliserat expertmönster: ordningen på experterna räknas bort
export function patternOf(experts, mi) {
  const counts = {}
  experts.forEach((e) => {
    const k = comboKey(e[mi])
    if (k) counts[k] = (counts[k] || 0) + 1
  })
  return COMBO_ORDER.filter((k) => counts[k])
    .map((k) => `${k}×${counts[k]}`)
    .join(' · ')
}

// Differens: Svenska folket − oddsprocent, per tecken + totalsumma av absolutvärden
export function diffOf(mi) {
  const m = ROUND.matches[mi]
  const d = m.folk.map((f, i) => f - m.odds[i])
  return { d, total: d.reduce((s, x) => s + Math.abs(x), 0) }
}

export const intervalOf = (t) =>
  t < 10 ? '0–9' : t < 20 ? '10–19' : t < 30 ? '20–29' : t < 40 ? '30–39' : '40+'

// Expertröster per tecken (en halvgardering ger 1/2 röst per tecken osv.)
export function votesOf(experts, mi) {
  const w = [0, 0, 0]
  experts.forEach((e) => {
    const c = e[mi]
    if (!c.length) return
    c.forEach((s) => (w[SIGNS.indexOf(s)] += 1 / c.length))
  })
  const t = w[0] + w[1] + w[2] || 1
  return w.map((x) => x / t)
}

export const expertFilled = (experts, ei) => experts[ei].every((c) => c.length > 0)
export const filledCount = (experts, ei) => experts[ei].filter((c) => c.length > 0).length
export const allFilled = (experts) => experts.every((_, i) => expertFilled(experts, i))

// Normalisera till heltal som summerar till 100
function pct3(a) {
  const t = a[0] + a[1] + a[2] || 1
  const p = [Math.round((a[0] / t) * 100), Math.round((a[1] / t) * 100)]
  p.push(100 - p[0] - p[1])
  return p
}

export const starStr = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)
export const relStars = (n) => (n >= 100 ? 5 : n >= 60 ? 4 : n >= 30 ? 3 : n >= 12 ? 2 : 1)
export const signStr = (signs) => signs.map((i) => SIGNS[i]).join('')
export const matchWord = (n) => (n === 1 ? 'match' : 'matcher')

/* ---------- Riktig historik från Firestore ---------- */

let HISTORY = { stryktipset: [], europatipset: [], loaded: false }

export const setHistory = (h) => {
  HISTORY = {
    stryktipset: h.stryktipset || [],
    europatipset: h.europatipset || [],
    loaded: true,
  }
}
export const historyReady = () => HISTORY.loaded
export const historyCount = (game) => (HISTORY[game] || []).length

// Utfallsfördelning för ett urval sparade matcher – null när underlag saknas
function dist(entries) {
  if (!entries.length) return null
  const c = [0, 0, 0]
  entries.forEach((e) => {
    const i = SIGNS.indexOf(e.resultat)
    if (i >= 0) c[i]++
  })
  return c[0] + c[1] + c[2] ? pct3(c) : null
}

function parsePattern(p) {
  const out = {}
  String(p || '')
    .split(' · ')
    .forEach((part) => {
      const [k, n] = part.split('×')
      if (k) out[k] = +n || 0
    })
  return out
}

// Andel gemensamma expertval mellan två mönster (0–1)
function patternSim(a, b) {
  const A = parsePattern(a)
  const B = parsePattern(b)
  const size = Object.values(A).reduce((s, x) => s + x, 0)
  if (!size) return 0
  let overlap = 0
  Object.keys(A).forEach((k) => (overlap += Math.min(A[k], B[k] || 0)))
  return overlap / size
}

export function historyFor(experts, mi) {
  const pattern = patternOf(experts, mi)
  const iv = intervalOf(diffOf(mi).total)
  const own = HISTORY[ROUND.game] || []
  const other = HISTORY[GAMES[ROUND.game].other] || []
  const exact = pattern ? own.filter((e) => e.monster === pattern) : []
  const inIv = exact.filter((e) => e.intervall === iv)
  const similar = pattern
    ? own.filter((e) => e.monster !== pattern && patternSim(pattern, e.monster) >= 0.66)
    : []
  const crossE = other.filter((e) => e.intervall === iv)
  return {
    pattern,
    iv,
    total: exact.length,
    base: dist(exact),
    ih: { n: inIv.length, p: dist(inIv) },
    intervals: INTERVALS.map((label) => {
      const es = exact.filter((e) => e.intervall === label)
      return { label, n: es.length, p: dist(es) }
    }),
    sim: { n: similar.length, p: dist(similar) },
    cross: { n: crossE.length, p: dist(crossE) },
    samples: exact.slice(0, 5).map((e) => ({ datum: e.datum, diff: e.intervall, res: e.resultat })),
  }
}

/* ---------- Modellbedömning ---------- */

// Vikterna skalas med underlagets storlek; det som saknas i historik
// bärs av oddsprocenten. Tom databas ⇒ modellen = marknaden.
export function modelFor(experts, mi) {
  const h = historyFor(experts, mi)
  const m = ROUND.matches[mi]
  const parts = [
    { key: 'diff', label: 'Mönster + dagens differens', p: h.ih.p, n: h.ih.n, w: 0.4 * Math.min(1, h.ih.n / 30) },
    { key: 'base', label: 'Exakt mönster', p: h.base, n: h.total, w: 0.2 * Math.min(1, h.total / 20) },
    { key: 'sim', label: 'Liknande mönster', p: h.sim.p, n: h.sim.n, w: 0.15 * Math.min(1, h.sim.n / 20) },
    { key: 'cross', label: `Stöd från ${GAMES[ROUND.game].otherLabel}`, p: h.cross.p, n: h.cross.n, w: 0.1 * Math.min(1, h.cross.n / 20) },
  ].filter((x) => x.p && x.w > 0)
  const wO = 1 - parts.reduce((s, x) => s + x.w, 0)
  const score = pct3(
    [0, 1, 2].map((i) => wO * m.odds[i] + parts.reduce((s, x) => s + x.w * x.p[i], 0)),
  )
  return { score, iv: h.iv, ih: h.ih, h, weights: { parts, wO } }
}

export function recFor(experts, mi) {
  const { score } = modelFor(experts, mi)
  const folk = ROUND.matches[mi].folk
  const ord = [0, 1, 2].sort((a, b) => score[b] - score[a])
  let type, signs
  if (score[ord[0]] >= 60 && score[ord[0]] - score[ord[1]] >= 25) {
    type = 'SPIK'
    signs = [ord[0]]
  } else if (score[ord[0]] >= 48) {
    type = 'LÅS'
    signs = [ord[0], ord[1]].sort((a, b) => a - b)
  } else if (score[ord[0]] < 40) {
    type = 'HELGARDERING'
    signs = [0, 1, 2]
  } else {
    type = 'GARDERA'
    signs = [ord[0], ord[1]].sort((a, b) => a - b)
  }
  let skr = null
  let best = 0
  ;[0, 1, 2].forEach((i) => {
    const g = score[i] - folk[i]
    if (folk[i] <= 25 && g >= 8 && g > best) {
      best = g
      skr = i
    }
  })
  return { type, signs, skr, ord, score }
}

/* ---------- Kuponganalysens lyftpunkter ---------- */

export function highlights(experts) {
  if (!allFilled(experts) || !ROUND.matches) return null
  const hl = {}
  let v

  v = -1
  ROUND.matches.forEach((_, i) => {
    const s = modelFor(experts, i).score
    const t = Math.max(...s)
    if (t > v) {
      v = t
      hl.spik = { mi: i, sign: s.indexOf(t), pct: t }
    }
  })

  v = -1
  ROUND.matches.forEach((m, i) => {
    const s = modelFor(experts, i).score
    ;[0, 1, 2].forEach((k) => {
      const g = s[k] - m.folk[k]
      if (m.folk[k] >= 26 && g > v) {
        v = g
        hl.varde = { mi: i, sign: k, model: s[k], folk: m.folk[k] }
      }
    })
  })

  v = -1
  ROUND.matches.forEach((m, i) => {
    const s = modelFor(experts, i).score
    ;[0, 1, 2].forEach((k) => {
      const g = s[k] - m.folk[k]
      if (m.folk[k] <= 25 && g > v) {
        v = g
        hl.skrall = { mi: i, sign: k, model: s[k], folk: m.folk[k] }
      }
    })
  })

  v = -1
  ROUND.matches.forEach((m, i) => {
    const s = modelFor(experts, i).score
    ;[0, 1, 2].forEach((k) => {
      const g = m.folk[k] - s[k]
      if (m.folk[k] >= 55 && g > v) {
        v = g
        hl.farlig = { mi: i, sign: k, model: s[k], folk: m.folk[k] }
      }
    })
  })

  v = -1
  ROUND.matches.forEach((_, i) => {
    const mx = Math.max(...votesOf(experts, i))
    if (mx > v) {
      v = mx
      hl.enig = i
    }
  })

  v = 2
  ROUND.matches.forEach((_, i) => {
    const mx = Math.max(...votesOf(experts, i))
    if (mx < v) {
      v = mx
      hl.oenig = i
    }
  })

  return hl
}

/* ---------- Strategier och radbygge efter budget ---------- */

export const STRATEGIES = [
  { key: 'adaptive', name: '★ Adaptiv', desc: 'Väljer signal match för match utifrån historiskt underlag och signalstyrka.' },
  { key: 'hist', name: '◷ Historiskt mönster', desc: 'Följer baslinjen från exakt expertmönster oavsett dagens förutsättningar.' },
  { key: 'diff', name: '◎ Mönster + differens', desc: 'Följer exakt mönster justerat med dagens differensprofil.' },
  { key: 'model', name: '▥ Sammanvägd modell', desc: 'Följer modellens procentbedömning.' },
]

// Teckenval ur en sannolikhetsfördelning: spik, halvgardering eller helgardering
export function signsFromDist(p) {
  const ord = [0, 1, 2].sort((a, b) => p[b] - p[a])
  if (p[ord[0]] >= 60 && p[ord[0]] - p[ord[1]] >= 25) return [ord[0]]
  if (p[ord[0]] < 40) return [0, 1, 2]
  return [ord[0], ord[1]].sort((a, b) => a - b)
}

// Signalerna för en match (null-p = underlag saknas ännu)
export function signalsFor(experts, mi) {
  const { score, h } = modelFor(experts, mi)
  const other = GAMES[ROUND.game]?.otherLabel || 'andra spelet'
  return {
    hist: { p: h.base, n: h.total, label: 'Historiskt mönster' },
    diff: { p: h.ih.p, n: h.ih.n, label: 'Mönster + differens' },
    sim: { p: h.sim.p, n: h.sim.n, label: 'Liknande mönster' },
    cross: { p: h.cross.p, n: h.cross.n, label: `Stöd från ${other}` },
    model: { p: score, n: h.ih.n, label: 'Sammanvägd modell' },
  }
}

// Adaptiv strategi: den signal som har starkast stöd, viktat med underlaget.
// Utan historik faller den tillbaka på den sammanvägda modellen (= marknaden).
export function adaptiveChoice(experts, mi) {
  const sig = signalsFor(experts, mi)
  const cand = [
    sig.hist.p && { key: 'hist', ...sig.hist, strength: Math.max(...sig.hist.p) * Math.min(1, sig.hist.n / 60) },
    sig.diff.p && { key: 'diff', ...sig.diff, strength: Math.max(...sig.diff.p) * Math.min(1, sig.diff.n / 30) },
    { key: 'model', ...sig.model, strength: Math.max(...sig.model.p) * 0.85 },
  ].filter(Boolean)
  cand.sort((a, b) => b.strength - a.strength)
  return cand[0]
}

// Bygg en budgetanpassad rad utifrån en fördelning per match
function buildRadFromDists(dists, budget) {
  const per = dists.map((p) => ({ ord: [0, 1, 2].sort((a, b) => p[b] - p[a]), p }))
  const chosen = per.map((x) => [x.ord[0]])
  const cost = () => chosen.reduce((c, s) => c * s.length, 1)
  for (;;) {
    let best = -1
    let bestGain = -1
    per.forEach((x, i) => {
      const k = chosen[i].length
      if (k >= 3) return
      const factor = k === 1 ? 2 : 1.5
      if (cost() * factor > budget) return
      // Föredra halvgarderingar framför helgarderingar
      const gain = x.p[x.ord[k]] - (k === 2 ? 12 : 0)
      if (gain > bestGain) {
        bestGain = gain
        best = i
      }
    })
    if (best < 0) break
    chosen[best].push(per[best].ord[chosen[best].length])
  }
  return chosen.map((c) => c.slice().sort((a, b) => a - b))
}

/* ---------- Riktiga R-system från Svenska Spel ---------- */

// whole = helgarderingar, half = halvgarderingar, rows = spelade rader efter
// reducering, guarantee = garanterat antal rätt när systemets villkor uppfylls.
export const R_SYSTEMS = [
  { name: 'R 0-7-16', whole: 0, half: 7, rows: 16, guarantee: 12 },
  { name: 'R 0-11-16', whole: 0, half: 11, rows: 16, guarantee: 10 },
  { name: 'R 2-5-12', whole: 2, half: 5, rows: 12, guarantee: 11 },
  { name: 'R 3-3-24', whole: 3, half: 3, rows: 24, guarantee: 12 },
  { name: 'R 4-0-9', whole: 4, half: 0, rows: 9, guarantee: 12 },
  { name: 'R 4-4-24', whole: 4, half: 4, rows: 24, guarantee: 11 },
  { name: 'R 4-4-144', whole: 4, half: 4, rows: 144, guarantee: 12 },
  { name: 'R 4-5-48', whole: 4, half: 5, rows: 48, guarantee: 11 },
  { name: 'R 4-6-24', whole: 4, half: 6, rows: 24, guarantee: 10 },
  { name: 'R 4-6-72', whole: 4, half: 6, rows: 72, guarantee: 11 },
  { name: 'R 4-7-48', whole: 4, half: 7, rows: 48, guarantee: 10 },
  { name: 'R 4-7-144', whole: 4, half: 7, rows: 144, guarantee: 11 },
  { name: 'R 5-0-18', whole: 5, half: 0, rows: 18, guarantee: 11 },
  { name: 'R 5-3-36', whole: 5, half: 3, rows: 36, guarantee: 11 },
  { name: 'R 5-5-108', whole: 5, half: 5, rows: 108, guarantee: 11 },
  { name: 'R 6-3-24', whole: 6, half: 3, rows: 24, guarantee: 10 },
  { name: 'R 6-3-72', whole: 6, half: 3, rows: 72, guarantee: 11 },
  { name: 'R 6-4-44', whole: 6, half: 4, rows: 44, guarantee: 10 },
  { name: 'R 7-0-36', whole: 7, half: 0, rows: 36, guarantee: 11 },
  { name: 'R 7-2-34', whole: 7, half: 2, rows: 34, guarantee: 10 },
  { name: 'R 7-2-108', whole: 7, half: 2, rows: 108, guarantee: 11 },
  { name: 'R 8-0-27', whole: 8, half: 0, rows: 27, guarantee: 10 },
  { name: 'R 8-0-81', whole: 8, half: 0, rows: 81, guarantee: 11 },
  { name: 'R 8-2-324', whole: 8, half: 2, rows: 324, guarantee: 11 },
  { name: 'R 9-0-222', whole: 9, half: 0, rows: 222, guarantee: 11 },
  { name: 'R 9-0-243', whole: 9, half: 0, rows: 243, guarantee: 10 },
  { name: 'R 10-0-153', whole: 10, half: 0, rows: 153, guarantee: 10 },
  { name: 'R 10-0-567', whole: 10, half: 0, rows: 567, guarantee: 11 },
  { name: 'R 11-0-729', whole: 11, half: 0, rows: 729, guarantee: 11 },
]

// Fullt system (oreducerat) för ett givet antal hel-/halvgarderingar
export const fullRows = (whole, half) => 3 ** whole * 2 ** half

// Matcherna sorterade från mest till minst osäker: lägst toppprocent först,
// därefter minst avstånd ner till tvåan.
export function uncertaintyRank(experts) {
  return ROUND.matches
    .map((_, i) => {
      const p = modelFor(experts, i).score
      const sorted = p.slice().sort((a, b) => b - a)
      return { i, max: sorted[0], gap: sorted[0] - sorted[1] }
    })
    .sort((a, b) => a.max - b.max || a.gap - b.gap)
}

// Bygg ett system med exakt angivet antal hel- och halvgarderingar:
// de mest osäkra matcherna helgarderas, nästa halvgarderas, resten spikas.
export function buildSystem(experts, whole, half) {
  const rank = uncertaintyRank(experts).map((x) => x.i)
  const wholeSet = new Set(rank.slice(0, whole))
  const halfSet = new Set(rank.slice(whole, whole + half))
  return ROUND.matches.map((_, i) => {
    const p = modelFor(experts, i).score
    const ord = [0, 1, 2].sort((a, b) => p[b] - p[a])
    if (wholeSet.has(i)) return [0, 1, 2]
    if (halfSet.has(i)) return [ord[0], ord[1]].sort((a, b) => a - b)
    return [ord[0]]
  })
}

// Väljer det R-system ur katalogen som bäst matchar omgångens riskprofil.
// Helt öppna matcher (ingen favorit alls) motiverar helgardering, matcher utan
// tydlig favorit motiverar halvgardering. maxRows håller raden spelbar.
export function chooseReducedSystem(experts, maxRows = 250) {
  const rank = uncertaintyRank(experts)
  // Helt öppen: låg topp OCH tätt mellan de två bästa tecknen
  const open = rank.filter((x) => x.max < 40 && x.gap < 12).length
  // Osäker: ingen tydlig favorit
  const uncertain = rank.filter((x) => x.max < 48).length
  const fits = R_SYSTEMS.filter((s) => s.whole + s.half <= 13 && s.rows <= maxRows)
  const pool = fits.length ? fits : R_SYSTEMS.filter((s) => s.whole + s.half <= 13)
  const scored = pool.map((s) => ({
    ...s,
    miss: Math.abs(s.whole - open) * 1.5 + Math.abs(s.whole + s.half - uncertain),
  }))
  scored.sort(
    (a, b) => a.miss - b.miss || b.guarantee - a.guarantee || a.rows - b.rows,
  )
  return { ...scored[0], open, uncertain }
}

// Systempaket för en vald budget – exakt systemstorlek och färdig rad
export function systemForBudget(experts, budget) {
  if (budget === 'reduced') {
    const r = chooseReducedSystem(experts)
    return {
      ...r,
      reduced: true,
      rad: buildSystem(experts, r.whole, r.half),
      fullRows: fullRows(r.whole, r.half),
    }
  }
  const kr = Number(budget)
  // 128 = 2^7, 192 = 3 × 2^6, 256 = 2^8
  const shape =
    kr === 128 ? { whole: 0, half: 7 } : kr === 256 ? { whole: 0, half: 8 } : { whole: 1, half: 6 }
  return {
    name: `${kr} kr`,
    ...shape,
    reduced: false,
    rows: fullRows(shape.whole, shape.half),
    rad: buildSystem(experts, shape.whole, shape.half),
  }
}

// Radstorlek som strategierna byggs mot ("Bästa reducerade" utgår från sitt
// oreducerade fullsystem så att teckenfördelningen blir densamma)
export const budgetKr = (budget) => (budget === 'reduced' ? 192 : Number(budget))

// Alla fyra strategiernas rader, byggda för samma budget
export function strategyRows(experts, budget) {
  const kr = budgetKr(budget)
  const sig = ROUND.matches.map((_, i) => signalsFor(experts, i))
  const adaptive = ROUND.matches.map((_, i) => adaptiveChoice(experts, i))
  const or = (p, i) => p || ROUND.matches[i].odds
  return {
    adaptive: { rad: buildRadFromDists(adaptive.map((a, i) => or(a.p, i)), kr), sources: adaptive },
    hist: { rad: buildRadFromDists(sig.map((x, i) => or(x.hist.p, i)), kr) },
    diff: { rad: buildRadFromDists(sig.map((x, i) => or(x.diff.p, i)), kr) },
    model: { rad: buildRadFromDists(sig.map((x, i) => or(x.model.p, i)), kr) },
  }
}

export const radCost = (rad) => (rad ? rad.reduce((c, s) => c * s.length, 1) : 0)

export function radCounts(rad) {
  const c = { spik: 0, halv: 0, hel: 0 }
  ;(rad || []).forEach((s) => {
    if (s.length === 1) c.spik++
    else if (s.length === 2) c.halv++
    else c.hel++
  })
  return c
}
