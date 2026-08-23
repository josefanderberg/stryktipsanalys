import { useEffect, useState } from 'react'
import { useApp } from '../store.jsx'
import { ROUND, SIGNS, STRATEGY_PERF } from '../lib/data.js'
import {
  allFilled, radCost, radCounts, recFor, signStr, strategyRows, STRATEGIES,
} from '../lib/model.js'
import { Card, SecTitle, Note, Cta, DetailBtn, Coupon, CouponRow, NrBadge } from '../components/ui.jsx'

const STRAT_COLOR = {
  adaptive: 'text-[#258345]',
  hist: 'text-ink',
  diff: 'text-[#e34e32]',
  model: 'text-[#6f45b9]',
}
const SRC_SHORT = { hist: 'Hist. mönster', diff: 'Mönster+diff', model: 'Modell' }

// Teckentagg i strategijämförelsen: grön spik, gul halvgardering, röd helgardering
function Tag({ signs }) {
  const cls =
    signs.length === 1
      ? 'bg-[#dff2e5] text-[#20703e]'
      : signs.length === 2
        ? 'bg-[#fff0c8] text-[#9c6700]'
        : 'bg-[#fde0dd] text-[#bd3228]'
  return (
    <span className={`inline-block min-w-[34px] text-center px-1.5 py-1 rounded-[5px] font-black text-[12px] ${cls}`}>
      {signStr(signs)}
    </span>
  )
}

export default function Rad() {
  const { s, set, show, toast } = useApp()
  const [onlyDiff, setOnlyDiff] = useState(false)
  const filled = allFilled(s.experts)
  const strat = filled ? strategyRows(s.experts, s.budget) : null

  useEffect(() => {
    if (filled && !s.rad) set({ rad: strategyRows(s.experts, s.budget).adaptive.rad })
  }, [filled, s.rad]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!filled) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Min rad</h2>
        <Note>Fyll i alla sex expertrader och analysera kupongen först.</Note>
        <Cta tone="blue" onClick={() => show('experter')}>Till expertraderna</Cta>
      </Card>
    )
  }
  if (!s.rad) return null

  const cost = radCost(s.rad)
  const c = radCounts(s.rad)
  const over = cost > s.budget

  // Enighet mellan strategierna, match för match
  const rowsOf = (key) => strat[key].rad
  const perMatch = ROUND.matches.map((_, i) => {
    const sets = STRATEGIES.map((st) => signStr(rowsOf(st.key)[i]))
    return { distinct: new Set(sets).size, same: new Set(sets).size === 1 }
  })
  const agree = perMatch.filter((x) => x.same).length
  const conflicts = perMatch
    .map((x, i) => ({ ...x, i }))
    .filter((x) => !x.same)
    .sort((a, b) => b.distinct - a.distinct)
    .slice(0, 4)

  // Adaptiva radens källfördelning
  const srcCounts = strat.adaptive.sources.reduce((acc, src) => {
    acc[src.key] = (acc[src.key] || 0) + 1
    return acc
  }, {})

  const useRad = (key, name) => {
    set({ rad: strat[key].rad.map((r) => r.slice()), saved: false })
    toast(`Raden bytt till ${name}`)
  }

  const radToggle = (mi, si) => {
    const sel = s.rad[mi]
    if (sel.includes(si) && sel.length === 1) {
      toast('Minst ett tecken per match')
      return
    }
    set((prev) => ({
      rad: prev.rad.map((r, i) =>
        i !== mi ? r : r.includes(si) ? r.filter((x) => x !== si) : [...r, si].sort((a, b) => a - b),
      ),
      saved: false,
    }))
  }

  const copyRad = () => {
    const txt =
      `STRYKTIPSET ${ROUND.date} – MIN RAD\n` +
      ROUND.matches.map((m, i) => `${i + 1}. ${m.name}: ${signStr(s.rad[i])}`).join('\n') +
      `\nSystempris: ${cost} kr · Spikar ${c.spik} · Halva ${c.halv} · Hela ${c.hel}`
    const done = () => toast('Raden kopierad – klistra in hos Svenska Spel')
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = txt
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        done()
      } catch {
        toast('Kunde inte kopiera')
      }
      document.body.removeChild(ta)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(done, fallback)
    else fallback()
  }

  return (
    <>
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Budget</h2>
        <SecTitle>Hur mycket vill du spela för?</SecTitle>
        <div className="flex gap-[7px] flex-wrap mt-2">
          {[96, 144, 288, 432, 576].map((b) => (
            <button
              key={b}
              onClick={() => set({ budget: b, rad: null, saved: false })}
              className={`rounded-[9px] px-3 py-2 font-bold text-[13px] border-2 ${
                s.budget === b ? 'bg-royal border-royal text-white' : 'bg-white border-line text-[#153b61]'
              }`}
            >
              {b} kr
            </button>
          ))}
        </div>
        <Note className="mt-2">
          Alla strategier bygger sin rad för samma budget (1 kr per rad), så att de går att jämföra
          rättvist. Din egen rad kan du sedan ändra tecken för tecken.
        </Note>
      </Card>

      <h2 className="m-0 mb-2 mt-1 text-[17px] font-bold">Jämför strategier</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-[11px]">
        {STRATEGIES.map((st) => {
          const rad = rowsOf(st.key)
          const sc = radCounts(rad)
          return (
            <div key={st.key} className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001]">
              <h3 className={`m-0 mb-1 text-[14px] font-black ${STRAT_COLOR[st.key]}`}>
                {st.name}
                {st.key === 'adaptive' && (
                  <span className="ml-2 align-middle inline-block bg-[#e7f5eb] text-[#1c6c3b] rounded-[12px] px-2 py-0.5 text-[11px]">
                    Rekommenderad
                  </span>
                )}
              </h3>
              <b className="text-[13px]">
                {sc.spik} spikar · {sc.halv} halva · {sc.hel} hela · {radCost(rad)} kr
              </b>
              <p className="my-1.5 text-[12.5px] text-[#445465] leading-relaxed">{st.desc}</p>
              {st.key === 'adaptive' && (
                <div className="bg-[#edf7ef] rounded-lg p-2 text-[11.5px] mb-1.5">
                  Denna kupong:{' '}
                  {Object.entries(srcCounts).map(([k, n]) => `${SRC_SHORT[k]} ${n}`).join(' · ')}
                </div>
              )}
              <DetailBtn onClick={() => useRad(st.key, st.name)}>Använd denna rad</DetailBtn>
            </div>
          )
        })}
      </div>

      <div className="border border-[#cbd9e6] bg-[#f9fbfd] rounded-[10px] p-3 mb-[11px] text-[13px]">
        <b>Strategierna är överens i {agree} av 13 matcher</b>
        <span className="text-muted"> · {13 - agree} matcher kan förändra kupongen.</span>
      </div>

      <Card>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <h2 className="m-0 text-[15px] font-bold">Jämför rader</h2>
          <button
            onClick={() => setOnlyDiff(!onlyDiff)}
            className="border border-line bg-white rounded-lg px-2.5 py-2 text-[12px] font-bold text-[#153b61]"
          >
            {onlyDiff ? 'Visa alla matcher' : 'Visa endast där vi skiljer oss'}
          </button>
        </div>
        <div className="tbl-wrap mt-2">
          <table className="tbl" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Match</th>
                <th>★ Adaptiv</th>
                <th>Historiskt</th>
                <th>Mönster+diff</th>
                <th>Modell</th>
              </tr>
            </thead>
            <tbody>
              {ROUND.matches.map((m, i) => {
                if (onlyDiff && perMatch[i].same) return null
                return (
                  <tr key={i}>
                    <td>{!perMatch[i].same ? '🔥 ' : ''}{i + 1}</td>
                    <td>{m.name}</td>
                    {STRATEGIES.map((st) => (
                      <td key={st.key}><Tag signs={rowsOf(st.key)[i]} /></td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {conflicts.length > 0 && (
        <>
          <h2 className="m-0 mb-2 text-[15px] font-bold">Där strategierna skiljer sig mest</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-[11px]">
            {conflicts.map(({ i }) => {
              const src = strat.adaptive.sources[i]
              const top = Math.max(...src.p)
              return (
                <div key={i} className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001]">
                  <h3 className="m-0 mb-2 text-[13px] font-black">
                    <span className="text-[#e7452d]">🔥</span> {i + 1}. {ROUND.matches[i].name}
                  </h3>
                  {STRATEGIES.map((st) => (
                    <div
                      key={st.key}
                      className="flex justify-between items-center gap-2 py-1 border-b border-[#eef1f3] text-[12px]"
                    >
                      <span className={STRAT_COLOR[st.key]}>{st.name}</span>
                      <Tag signs={rowsOf(st.key)[i]} />
                    </div>
                  ))}
                  <p className="my-2 text-[12px] leading-relaxed">
                    <b>Varför väljer adaptiva raden {signStr(strat.adaptive.rad[i])}?</b>
                    <br />
                    {src.label} har starkast stöd här: {top}% på {SIGNS[src.p.indexOf(top)]}
                    {src.n ? ` (${src.n} matcher i underlaget)` : ''}.
                  </p>
                  <DetailBtn
                    onClick={() => {
                      set({ detail: i })
                      show('match')
                    }}
                  >
                    Visa detaljerad analys →
                  </DetailBtn>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">MIN RAD – {s.budget} KR</h2>
        {ROUND.matches.map((m, i) => {
          const r = recFor(s.experts, i)
          const sel = s.rad[i]
          const tag =
            sel.length === 3
              ? 'Helgardering'
              : sel.length === 2
                ? 'Halvgardering'
                : r.type === 'SPIK' && sel[0] === r.signs[0]
                  ? '🔒 Spik'
                  : 'Spik'
          return (
            <div
              key={i}
              className="grid grid-cols-[30px_1fr_132px] gap-1.5 items-center px-2 py-2 border-b border-line last:border-b-0 text-[12.5px]"
            >
              <NrBadge n={i + 1} />
              <div>
                {m.name}
                <div className="text-[11px] text-muted">
                  {tag}
                  {r.skr !== null && sel.includes(r.skr) ? ' · 💥 skrälltecken med' : ''}
                </div>
              </div>
              <div className="flex gap-1 justify-end">
                {[0, 1, 2].map((si) => (
                  <button
                    key={si}
                    onClick={() => radToggle(i, si)}
                    className={`w-[38px] h-[33px] border-2 rounded-[5px] font-black text-sm ${
                      sel.includes(si)
                        ? 'bg-mark border-mark text-white'
                        : 'bg-[#fafafa] border-[#c6cdd3] text-[#b7bdc3]'
                    }`}
                  >
                    {SIGNS[si]}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="grid grid-cols-4 gap-[7px] mt-2.5">
          <div className={`rounded-[9px] px-1.5 py-2 text-center text-[11px] ${over ? 'bg-[#fde0dd]' : 'bg-[#e7eef5]'}`}>
            <b className={`block text-base ${over ? 'text-[#a02c21]' : 'text-navy'}`}>{cost} kr</b>
            <span className="text-muted">Systempris</span>
          </div>
          <div className="rounded-[9px] px-1.5 py-2 text-center text-[11px] bg-[#e7eef5]">
            <b className="block text-base text-navy">{c.spik}</b>
            <span className="text-muted">Spikar</span>
          </div>
          <div className="rounded-[9px] px-1.5 py-2 text-center text-[11px] bg-[#e7eef5]">
            <b className="block text-base text-navy">{c.halv}</b>
            <span className="text-muted">Halva</span>
          </div>
          <div className="rounded-[9px] px-1.5 py-2 text-center text-[11px] bg-[#e7eef5]">
            <b className="block text-base text-navy">{c.hel}</b>
            <span className="text-muted">Hela</span>
          </div>
        </div>
        {over && (
          <Note className="mt-2 !text-[#a02c21]">
            <b>Systempriset överstiger budgeten.</b> Ta bort garderingar eller höj budgeten.
          </Note>
        )}

        <DetailBtn onClick={() => useRad('adaptive', '★ Adaptiv')}>
          Återställ till ★ Adaptiv
        </DetailBtn>
        <Cta tone="blue" onClick={copyRad}>Kopiera rad</Cta>
      </Card>

      <Card>
        <SecTitle>Kupongvy</SecTitle>
        <Coupon title="STRYKTIPSET" sub={`${cost} rader`}>
          {ROUND.matches.map((m, i) => (
            <CouponRow
              key={i}
              nr={i + 1}
              name={m.name}
              active={s.rad[i]}
              onPick={(si) => radToggle(i, si)}
            />
          ))}
        </Coupon>
      </Card>

      <Card>
        <h2 className="m-0 mb-2 text-[15px] font-bold">Så har strategierna presterat historiskt*</h2>
        <div className="tbl-wrap">
          <table className="tbl" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Strategi</th>
                <th>Teckentäckning</th>
                <th>Snitt rätt</th>
                <th>13 rätt / 1000</th>
                <th>Omgångar</th>
                <th>Kommentar</th>
              </tr>
            </thead>
            <tbody>
              {STRATEGY_PERF.map((r) => (
                <tr key={r.name} className={r.best ? 'hl' : ''}>
                  <td>{r.name}</td>
                  <td>{r.tack}</td>
                  <td>{r.ratt}</td>
                  <td>{r.full}</td>
                  <td>{r.omg}</td>
                  <td className="!whitespace-normal">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note className="mt-2">* Demodata i prototypen – fylls på när omgångar sparas i databasen.</Note>
      </Card>
    </>
  )
}
