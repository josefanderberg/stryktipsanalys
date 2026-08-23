// Hämtar aktuell omgång för Stryktipset och Europatipset från Svenska Spels
// öppna API och skriver public/data/<spel>.json som appen läser.
// Körs av GitHub Actions före bygget.
import { writeFileSync, mkdirSync } from 'node:fs'

const GAMES = ['stryktipset', 'europatipset']

async function get(game, path) {
  const r = await fetch(`https://api.spela.svenskaspel.se/draw/1/${game}${path}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'stryktipsanalys-prototyp (github.com/josefanderberg/stryktipsanalys)',
    },
  })
  if (!r.ok) throw new Error(`${game}${path} → HTTP ${r.status}`)
  return r.json()
}

const num = (s) => parseFloat(String(s ?? '').replace(',', '.'))

// Normalisera till heltal som summerar till 100
function pct3(a) {
  const t = a[0] + a[1] + a[2] || 1
  const p = [Math.round((a[0] / t) * 100), Math.round((a[1] / t) * 100)]
  p.push(100 - p[0] - p[1])
  return p
}

async function resultFor(game, drawNumber) {
  try {
    const r = await get(game, `/draws/${drawNumber}/result`)
    const evs = r.result?.events || []
    const outcomes = evs.map((e) => e.outcome)
    if (outcomes.length === 13 && outcomes.every((o) => ['1', 'X', '2'].includes(o))) return outcomes
  } catch {
    /* resultat ej tillgängligt ännu */
  }
  return null
}

async function buildGame(game) {
  const list = await get(game, '/draws')
  const open = (list.draws || []).find((d) => d.drawState === 'Open') || (list.draws || [])[0]
  if (!open) return { available: false, updated: new Date().toISOString() }

  const { draw } = await get(game, `/draws/${open.drawNumber}`)
  const events = draw.drawEvents || []
  if (events.length !== 13) throw new Error(`${game}: väntade 13 matcher, fick ${events.length}`)

  const matches = events.map((e) => {
    const ps = e.match?.participants || []
    const home = ps.find((p) => p.type === 'home')?.name
    const away = ps.find((p) => p.type === 'away')?.name
    const name = home && away ? `${home} – ${away}` : String(e.eventDescription || '').replace(' - ', ' – ')
    const o = [num(e.odds?.one), num(e.odds?.x), num(e.odds?.two)]
    const odds = o.every((x) => x > 1) ? pct3(o.map((x) => 1 / x)) : [33, 33, 34]
    let folk = [num(e.svenskaFolket?.one), num(e.svenskaFolket?.x), num(e.svenskaFolket?.two)].map((x) =>
      Number.isFinite(x) ? Math.round(x) : 0,
    )
    if (folk[0] + folk[1] + folk[2] < 50) folk = odds // folket ej publicerat ännu
    return { name, folk, odds, start: e.match?.matchStart || null }
  })

  return {
    available: true,
    updated: new Date().toISOString(),
    drawNumber: draw.drawNumber,
    label: draw.regCloseDescription || draw.drawComment || `Omgång ${draw.drawNumber}`,
    date: String(draw.regCloseTime || '').slice(0, 10),
    closeTime: draw.regCloseTime || null,
    matches,
    result: await resultFor(game, draw.drawNumber),
    prevResult: await (async () => {
      const outcomes = await resultFor(game, draw.drawNumber - 1)
      return outcomes ? { drawNumber: draw.drawNumber - 1, outcomes } : null
    })(),
  }
}

mkdirSync('public/data', { recursive: true })
for (const game of GAMES) {
  try {
    const out = await buildGame(game)
    writeFileSync(`public/data/${game}.json`, JSON.stringify(out, null, 1))
    console.log(`OK ${game}: ${out.available ? `omgång ${out.drawNumber} (${out.label}), resultat: ${out.result ? 'ja' : 'nej'}` : 'ingen aktuell omgång'}`)
  } catch (e) {
    console.error(`FEL ${game}: ${e.message} – behåller ev. befintlig fil`)
    if (game === 'stryktipset') process.exitCode = 1
  }
}
