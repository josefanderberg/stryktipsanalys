import { useEffect, useMemo, useState } from 'react'
import { SIGNS } from '../lib/data.js'
import {
  runBacktest, summarize, hitsOf, halves, histCoverage, missStats,
  ROWS, BUDGETS, CHOICES, BANDS, DIFFS,
} from '../lib/backtest.js'
import { Card, SecTitle, Note, Summary, Banner } from '../components/ui.jsx'

const GAME_FILTERS = [
  { key: 'alla', label: 'Alla' },
  { key: 'stryktipset', label: 'Stryktipset' },
  { key: 'europatipset', label: 'Europatipset' },
]
const PLAIN = {
  adaptive: 'Adaptiv', hist: 'Historiskt mönster', diff: 'Mönster + differens',
  model: 'Sammanvägd modell', odds: 'Ren oddsrad', saved: 'Sparad rad', nille: 'Nilles rad',
}
const STRATS = ROWS.filter((r) => !r.ref)
const REFS = ROWS.filter((r) => r.ref)

const dec = (x, d = 2) => (x == null ? '–' : x.toFixed(d).replace('.', ','))
const signed = (x) => (x == null ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '±') + dec(Math.abs(x)))
const share = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '–')
const missPct = (t) => share(t.miss, t.n)

const pill = (on) =>
  `rounded-[9px] px-3 py-2 font-bold text-[13px] border-2 ${
    on ? 'bg-royal border-royal text-white' : 'bg-white border-line text-[#153b61]'
  }`

// En rad i stapellistan: namn, värde och en stapel på skalan 0–13 rätt
function BarRow({ name, value, muted }) {
  return (
    <div className="py-[6px]">
      <div className="flex justify-between items-baseline gap-2 text-[13px]">
        <span className={muted ? '' : 'font-bold'}>{name}</span>
        <b className="tabular-nums">{dec(value)}</b>
      </div>
      <div
        className="h-2 mt-1 bg-[#dfe6ec] rounded-r-[4px]"
        title={`${name}: ${dec(value)} rätt i snitt`}
      >
        {value != null && (
          <span
            className="block h-full rounded-r-[4px]"
            style={{ width: `${(value / 13) * 100}%`, background: muted ? '#8a96a1' : 'var(--color-royal)' }}
          />
        )}
      </div>
    </div>
  )
}

// Felprocent med antal matcher bakom
const MissCell = ({ t }) =>
  t && t.n ? (
    <td>
      <b>{missPct(t)}</b> <span className="text-muted text-[11px]">· {t.n} st</span>
    </td>
  ) : (
    <td className="text-muted">–</td>
  )

function MissTable({ title, labels, model, nille, note }) {
  return (
    <>
      <SecTitle className="mt-4">{title}</SecTitle>
      <div className="tbl-wrap"><table className="tbl">
        <thead>
          <tr><th></th><th>Modell</th><th>Nille</th></tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={label}>
              <td>{label}</td>
              <MissCell t={model[i]} />
              <MissCell t={nille && nille[i]} />
            </tr>
          ))}
        </tbody>
      </table></div>
      {note && <Note className="mt-1.5 mb-0">{note}</Note>}
    </>
  )
}

export default function Statistik() {
  // null = laddar · false = gick inte att nå
  const [cloud, setCloud] = useState(null)
  const [game, setGame] = useState('alla')
  const [budget, setBudget] = useState(192)

  useEffect(() => {
    let alive = true
    import('../lib/db.js')
      .then(async ({ loadCol }) => {
        const [stryktipset, europatipset, nille] = await Promise.all([
          loadCol('stryktipset'),
          loadCol('europatipset'),
          loadCol('nille'),
        ])
        return { stryktipset, europatipset, nille }
      })
      .then((r) => alive && setCloud(r))
      .catch(() => alive && setCloud(false))
    return () => {
      alive = false
    }
  }, [])

  const all = useMemo(() => (cloud ? runBacktest(cloud) : []), [cloud])
  const rounds = useMemo(
    () => (game === 'alla' ? all : all.filter((r) => r.game === game)),
    [all, game],
  )
  const stats = useMemo(() => {
    if (!rounds.length) return null
    const sum = Object.fromEntries(ROWS.map((r) => [r.key, summarize(rounds, r.key, budget)]))
    const [first, last] = halves(rounds)
    return {
      sum,
      first,
      last,
      miss: { model: missStats(rounds, 'model', budget), nille: missStats(rounds, 'nille', budget) },
    }
  }, [rounds, budget])

  if (cloud === null || cloud === false || !stats) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Statistik</h2>
        <Note>
          {cloud === null
            ? 'Hämtar sparade omgångar från molndatabasen…'
            : cloud === false
              ? 'Kunde inte nå molndatabasen just nu – försök igen om en stund.'
              : 'Det finns inga rättade omgångar i databasen ännu. Statistiken fylls på när ni sparar omgångar under Resultat.'}
        </Note>
        {cloud && all.length > 0 && (
          <div className="flex gap-[7px] flex-wrap mt-2">
            {GAME_FILTERS.map((g) => (
              <button key={g.key} onClick={() => setGame(g.key)} className={pill(game === g.key)}>
                {g.label}
              </button>
            ))}
          </div>
        )}
      </Card>
    )
  }

  const { sum, first, last, miss } = stats
  const n = rounds.length
  const nStryk = rounds.filter((r) => r.game === 'stryktipset').length
  const ranked = STRATS.slice().sort((a, b) => sum[b.key].avg - sum[a.key].avg)
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  const top = (s) => s.c12 + s.c13
  const maxTop = Math.max(...STRATS.map((r) => top(sum[r.key])))
  const topNames = STRATS.filter((r) => top(sum[r.key]) === maxTop).map((r) => PLAIN[r.key])
  const hasNille = miss.nille.total.n > 0
  const vsOdds = sum[best.key].avg - sum.odds.avg

  // Utfallet som står för flest fel i modellraden
  const mo = miss.model.byOutcome
  const worstOutcome = [0, 1, 2].sort((a, b) => mo[b].miss - mo[a].miss)[0]

  return (
    <>
      <Card>
        <SecTitle>Urval</SecTitle>
        <div className="flex gap-[7px] flex-wrap">
          {GAME_FILTERS.map((g) => (
            <button key={g.key} onClick={() => setGame(g.key)} className={pill(game === g.key)}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex gap-[7px] flex-wrap mt-2">
          {BUDGETS.map((b) => (
            <button key={b} onClick={() => setBudget(b)} className={pill(budget === b)}>
              {b} kr
            </button>
          ))}
        </div>
        <Note className="mt-2 mb-0">
          Allt nedan gäller urvalet. Antal rätt är den bästa raden i systemet, alltså hur många av
          13 matcher där raden täckte rätt tecken.
        </Note>
      </Card>

      <Summary
        title="STATISTIK"
        items={[
          {
            label: 'Rättade omgångar',
            value: String(n),
            sub: game === 'alla' ? `${nStryk} Stryktipset · ${n - nStryk} Europatipset` : `${budget} kr-rader`,
          },
          { label: 'Högst snitt', value: `${dec(sum[best.key].avg)} rätt`, sub: PLAIN[best.key] },
          {
            label: '12 eller 13 rätt',
            value: maxTop ? `${maxTop} ${maxTop === 1 ? 'gång' : 'gånger'}` : 'Ingen ännu',
            sub: maxTop ? topNames.join(' · ') : 'Bästa strategin',
          },
          { label: 'Ren oddsrad', value: `${dec(sum.odds.avg)} rätt`, sub: 'Jämförelse: bara odds' },
        ]}
      />

      <Card>
        <SecTitle>Snitt antal rätt per omgång</SecTitle>
        {STRATS.map((r) => (
          <BarRow key={r.key} name={r.name} value={sum[r.key].avg} />
        ))}
        <SecTitle className="mt-3">Jämförelse</SecTitle>
        {REFS.map((r) => (
          <BarRow key={r.key} name={r.name} value={sum[r.key].avg} muted />
        ))}
        <Note className="mt-2 mb-0">
          Skala 0–13 rätt. <b>Ren oddsrad</b> är samma radstorlek byggd enbart på oddsen: lägst
          odds spikas och garderingarna läggs där nästa tecken är starkast. <b>Sparad rad</b> är
          raden ni sparade under Resultat.
        </Note>
      </Card>

      <Card>
        <SecTitle>I korthet</SecTitle>
        <ul className="m-0 pl-[18px] list-disc text-[12.5px] leading-relaxed">
          {sum[best.key].avg !== sum[worst.key].avg && (
            <li>
              <b>{PLAIN[best.key]}</b> har högst snitt ({dec(sum[best.key].avg)} rätt),{' '}
              {PLAIN[worst.key]} lägst ({dec(sum[worst.key].avg)}).
            </li>
          )}
          <li>
            Ren oddsrad snittar {dec(sum.odds.avg)}. {PLAIN[best.key]} ligger{' '}
            {dec(Math.abs(vsOdds))} {vsOdds >= 0 ? 'över' : 'under'} den.
          </li>
          {miss.model.total.miss > 0 && (
            <li>
              {share(mo[worstOutcome].miss, miss.model.total.miss)} av felen i modellraden är
              matcher som slutade {SIGNS[worstOutcome]}.
            </li>
          )}
          {hasNille && miss.nille.favOut.n > 0 && (
            <li>
              Nilles rad saknar oddsfavoriten i {share(miss.nille.favOut.n, miss.nille.total.n)} av
              matcherna. Där blir det fel i {missPct(miss.nille.favOut)}, mot{' '}
              {missPct(miss.nille.favIn)} när favoriten är med.
            </li>
          )}
        </ul>
        {n < 60 && (
          <Note className="mt-2 mb-0">
            Underlaget är {n} {n === 1 ? 'omgång' : 'omgångar'}. Skillnader på några tiondelar kan
            vara slump.
          </Note>
        )}
      </Card>

      <Card>
        <SecTitle>Höga resultat – antal omgångar</SecTitle>
        <div className="tbl-wrap"><table className="tbl">
          <thead>
            <tr><th>Rad</th><th>10+</th><th>11+</th><th>12</th><th>13</th><th>Bäst</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const s = sum[r.key]
              return (
                <tr key={r.key}>
                  <td>{PLAIN[r.key]}</td>
                  {s.n ? (
                    <>
                      <td>{s.c10}</td><td>{s.c11}</td><td>{s.c12}</td><td>{s.c13}</td><td>{s.best}</td>
                    </>
                  ) : (
                    <td colSpan={5} className="text-muted">–</td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </Card>

      <Card>
        <SecTitle>Utveckling – första halvan mot senaste</SecTitle>
        {last.length < 2 ? (
          <Note className="mb-0">Jämförelsen visas när det finns minst fyra omgångar i urvalet.</Note>
        ) : (
          <>
            <div className="tbl-wrap"><table className="tbl">
              <thead>
                <tr>
                  <th>Rad</th><th>Första {first.length}</th><th>Senaste {last.length}</th><th>Förändring</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.filter((r) => r.key !== 'saved').map((r) => {
                  const a = summarize(first, r.key, budget).avg
                  const b = summarize(last, r.key, budget).avg
                  return (
                    <tr key={r.key}>
                      <td>{PLAIN[r.key]}</td>
                      <td>{dec(a)}</td>
                      <td>{dec(b)}</td>
                      <td>{a == null || b == null ? '–' : signed(b - a)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
            <Note className="mt-2 mb-0">
              Stiger oddsraden lika mycket som en strategi har omgångarna blivit lättare, inte
              strategin bättre. Andel matcher där det fanns historik för expertmönstret:{' '}
              <b>{share(histCoverage(first), 1)}</b> i första halvan, <b>{share(histCoverage(last), 1)}</b>{' '}
              i senaste.
            </Note>
          </>
        )}
      </Card>

      <Card>
        <h2 className="m-0 mb-1 text-[17px] font-bold">Var uppstår felen?</h2>
        <Note className="mt-0 mb-0">
          Felprocent per match för modellraden och Nilles egna rader, med antal matcher bakom
          varje tal. Totalt: modellraden {missPct(miss.model.total)} fel
          {hasNille ? `, Nille ${missPct(miss.nille.total)}` : ''}.
        </Note>
        <MissTable
          title="Per teckenval"
          labels={CHOICES.map((c) => (c.length === 1 ? `Spik ${c}` : c))}
          model={miss.model.byChoice}
          nille={hasNille && miss.nille.byChoice}
          note="Helgarderingar (1X2) kan inte bli fel och visas inte."
        />
        <MissTable
          title="Spikar efter oddsprocent"
          labels={BANDS.map((b) => b.label)}
          model={miss.model.byBand}
          nille={hasNille && miss.nille.byBand}
        />
        <MissTable
          title="Spikar efter differens (folket − odds)"
          labels={DIFFS.map((d) => d.label)}
          model={miss.model.byDiff}
          nille={hasNille && miss.nille.byDiff}
        />
        <MissTable
          title="Missade utfall"
          labels={SIGNS.map((s) => `Matchen slutade ${s}`)}
          model={miss.model.byOutcome}
          nille={hasNille && miss.nille.byOutcome}
          note="Andel av matcherna med utfallet där tecknet saknades på raden."
        />
      </Card>

      <Card>
        <SecTitle>Omgång för omgång</SecTitle>
        <div className="tbl-wrap"><table className="tbl">
          <thead>
            <tr>
              <th>Datum</th><th>Spel</th>
              {ROWS.filter((r) => r.key !== 'saved').map((r) => <th key={r.key}>{r.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {rounds.slice().reverse().map((r) => (
              <tr key={r.id}>
                <td>{r.date || '–'}</td>
                <td>{r.game === 'stryktipset' ? 'S' : 'E'}</td>
                {ROWS.filter((row) => row.key !== 'saved').map((row) => {
                  const h = hitsOf(r, row.key, budget)
                  return (
                    <td key={row.key} className={h >= 12 ? 'font-bold bg-[#eaf6ee]' : ''}>
                      {h ?? '–'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table></div>
        <Note className="mt-2 mb-0">
          A = Adaptiv · H = Historiskt mönster · H+D = Mönster + differens · M = Sammanvägd modell.
          Markerade rutor är 12 rätt eller fler.
        </Note>
      </Card>

      <Banner>
        <b>Så räknas det.</b> Strategiernas rader sparas inte i databasen. Varje omgång spelas
        därför om med bara de omgångar som var sparade före spelstopp – samma underlag som appen
        hade när raden byggdes. Odds och Svenska folket är de värden som sparades med omgången.
      </Banner>
    </>
  )
}
