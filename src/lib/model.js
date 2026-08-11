import { SIGNS, COMBO_ORDER, INTERVALS, ROUND } from './data.js'

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

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}
function makeRng(seed) {
  let s = seed || 1
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    return s / 4294967296
  }
}
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

/* ---------- Demodatabas: historik per expertmönster ---------- */

const HIST_CACHE = new Map()

export function historyFor(experts, mi) {
  const pattern = patternOf(experts, mi)
  const iv = intervalOf(diffOf(mi).total)
  const key = `${ROUND.drawNumber ?? 'demo'}|${pattern}|${iv}`
  if (HIST_CACHE.has(key)) return HIST_CACHE.get(key)

  let h
  if (pattern === '1×2 · 1X×3 · X2×1') {
    // Exemplet från kravspecifikationen (Match 7)
    h = {
      pattern,
      total: 126,
      base: [49, 27, 24],
      intervals: [
        { label: '0–9', n: 18, p: [39, 33, 28] },
        { label: '10–19', n: 47, p: [62, 17, 21] },
        { label: '20–29', n: 39, p: [43, 31, 26] },
        { label: '30–39', n: 22, p: [32, 23, 45] },
        { label: '40+', n: 0, p: [0, 0, 0] },
      ],
      sim: [
        { label: '100 % samma mönster', n: 126, p: [49, 27, 24] },
        { label: '95–99 % likhet', n: 241, p: [47, 27, 26] },
        { label: '90–94 % likhet', n: 514, p: [44, 28, 28] },
      ],
    }
  } else {
    const rng = makeRng(hash(pattern || 'tom rad'))
    const v = votesOf(experts, mi)
    const prior = [0.38, 0.3, 0.32]
    let base = v.map((x, i) => 0.65 * x + 0.35 * prior[i] + (rng() - 0.5) * 0.08)
    base = pct3(base.map((x) => Math.max(0.05, x)))
    const total = 40 + Math.floor(rng() * 160)
    const wInt = [0.16, 0.3, 0.26, 0.18, 0.1].map((x) => x * (0.7 + rng() * 0.6))
    const wSum = wInt.reduce((a, b) => a + b, 0)
    const counts = wInt.map((x) => Math.max(3, Math.round((total * x) / wSum)))
    counts[4] = Math.max(0, total - counts[0] - counts[1] - counts[2] - counts[3])
    const top = base.indexOf(Math.max(...base))
    const intervals = INTERVALS.map((label, k) => {
      const p = base.map((x) => Math.max(3, x + (rng() - 0.5) * 16))
      if (label === iv) p[top] += 6 + rng() * 8
      return { label, n: counts[k], p: pct3(p) }
    })
    const pull = (a, b, f) => a.map((x, i) => x * (1 - f) + b[i] * f)
    const priorPct = prior.map((x) => x * 100)
    const sim = [
      { label: '100 % samma mönster', n: total, p: base },
      { label: '95–99 % likhet', n: Math.round(total * (1.7 + rng() * 0.6)), p: pct3(pull(base, priorPct, 0.3)) },
      { label: '90–94 % likhet', n: Math.round(total * (3.2 + rng() * 1.2)), p: pct3(pull(base, priorPct, 0.5)) },
    ]
    h = { pattern, total, base, intervals, sim }
  }

  // Exempelrader till "Visa historiska matcher"
  const rng2 = makeRng(hash(`${key}::rows`))
  const ivRow = h.intervals.find((x) => x.label === iv) || { p: h.base }
  h.samples = Array.from({ length: 5 }, () => {
    const day = 1 + Math.floor(rng2() * 28)
    const mon = 1 + Math.floor(rng2() * 12)
    const lik = rng2() < 0.6 ? '100%' : rng2() < 0.5 ? '95–99%' : '90–94%'
    const lo = iv === '0–9' ? 0 : iv === '10–19' ? 10 : iv === '20–29' ? 20 : iv === '30–39' ? 30 : 40
    const dTot = lo + Math.floor(rng2() * 10)
    const r = rng2() * 100
    const res = r < ivRow.p[0] ? '1' : r < ivRow.p[0] + ivRow.p[1] ? 'X' : '2'
    return { datum: `${day}/${mon}`, lik, diff: dTot, res }
  })

  HIST_CACHE.set(key, h)
  return h
}

/* ---------- Modellbedömning ---------- */

export function modelFor(experts, mi) {
  const h = historyFor(experts, mi)
  const iv = intervalOf(diffOf(mi).total)
  const ih = h.intervals.find((x) => x.label === iv) || { n: 0, p: h.base }
  const odds = ROUND.matches[mi].odds
  const sim = h.sim[2].p
  // Prototypvikter – kalibreras mot verkliga resultat när databasen växer.
  // Differenshistoriken viktas ned när underlaget är litet.
  const wD = 0.4 * Math.min(1, ih.n / 30)
  const wB = 0.2
  const wS = 0.15
  const wO = 1 - wD - wB - wS
  const score = pct3(
    [0, 1, 2].map((i) => wD * ih.p[i] + wB * h.base[i] + wS * sim[i] + wO * odds[i]),
  )
  return { score, iv, ih, h, weights: { wD, wB, wS, wO } }
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
  if (!allFilled(experts)) return null
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

/* ---------- Radbygge efter budget ---------- */

export function buildRad(experts, budget) {
  const per = ROUND.matches.map((_, i) => {
    const { score } = modelFor(experts, i)
    const ord = [0, 1, 2].sort((a, b) => score[b] - score[a])
    return { ord, score }
  })
  const chosen = per.map((p) => [p.ord[0]])
  const cost = () => chosen.reduce((c, s) => c * s.length, 1)
  for (;;) {
    let best = -1
    let bestGain = -1
    per.forEach((p, i) => {
      const k = chosen[i].length
      if (k >= 3) return
      const factor = k === 1 ? 2 : 1.5
      if (cost() * factor > budget) return
      // Föredra halvgarderingar framför helgarderingar
      const gain = p.score[p.ord[k]] - (k === 2 ? 12 : 0)
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
