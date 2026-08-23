import { useApp } from '../store.jsx'
import { ROUND, SIGNS } from '../lib/data.js'
import { modelFor, diffOf, radCost, signStr } from '../lib/model.js'
import { Card, SecTitle, Note, Coupon, CouponRow, Banner } from '../components/ui.jsx'

const PURPLE = '#6d35c5'
const STEPS = ['1 · Rad', '2 · Analys', '3 · Min rad', '4 · Resultat']

// Analysera Nilles rad mot modellsignalerna
function analyze(experts, rad) {
  const per = ROUND.matches.map((m, i) => {
    const { score } = modelFor(experts, i)
    const sel = rad[i]
    const ord = [0, 1, 2].sort((a, b) => score[b] - score[a])
    const adds = [0, 1, 2]
      .filter((si) => !sel.includes(si) && score[si] >= 22)
      .map((si) => ({
        mi: i,
        si,
        pts: Math.min(96, Math.round(score[si] + Math.max(0, (m.odds[si] - m.folk[si]) * 1.5))),
        why:
          m.odds[si] > m.folk[si] + 3
            ? `${SIGNS[si]} undervärderad av folket`
            : score[si] >= 40
              ? 'Starkt modellstöd'
              : 'Öppen match',
      }))
    const rems =
      sel.length > 1
        ? sel
            .filter((si) => score[si] <= 30)
            .map((si) => ({
              mi: i,
              si,
              pts: Math.min(94, Math.round((35 - score[si]) * 2 + Math.max(0, m.folk[si] - score[si]))),
              why:
                m.folk[si] - score[si] >= 10
                  ? 'Överstreckat tecken'
                  : score[si] < 18
                    ? 'Svagt historiskt stöd'
                    : 'Frigör gardering',
            }))
        : []
    const verdict = !sel.includes(ord[0])
      ? 'change'
      : sel.some((si) => score[si] < 15 && sel.length > 1) || (sel.length === 1 && score[sel[0]] < 45)
        ? 'unsure'
        : 'good'
    return { i, score, sel, ord, adds, rems, verdict }
  })
  const adds = per.flatMap((p) => p.adds).sort((a, b) => b.pts - a.pts).slice(0, 5)
  const rems = per.flatMap((p) => p.rems).sort((a, b) => b.pts - a.pts).slice(0, 5)
  const counts = {
    change: per.filter((p) => p.verdict === 'change').length,
    unsure: per.filter((p) => p.verdict === 'unsure').length,
    good: per.filter((p) => p.verdict === 'good').length,
  }
  const addSigns = adds.map((x) => x.si)
  const dom = [0, 1, 2].map((si) => addSigns.filter((x) => x === si).length)
  const domSign = dom.indexOf(Math.max(...dom))
  const tendency =
    adds.length === 0
      ? 'Raden ligger nära signalerna – ingen tydlig systematisk miss den här omgången.'
      : domSign === 2
        ? 'Raden lämnar bort 2 för ofta i öppna matcher där oddsen värderar tvåan högre än Svenska folket.'
        : domSign === 1
          ? 'Raden garderar för sällan med X i jämna matcher där krysset har starkt stöd i signalerna.'
          : 'Raden undervärderar ettan i matcher där hemmalaget har starkare signal än folket ger den.'
  return { per, adds, rems, counts, tendency }
}

// Förbättrad rad: ta bort svaga tecken, lägg till starka – inom samma systempris
function improve(rad, adds, rems) {
  const out = rad.map((r) => r.slice())
  const changed = new Set()
  const budget = radCost(rad)
  let n = 0
  const tryRemove = (r) => {
    if (n >= 5) return
    if (out[r.mi].length > 1 && out[r.mi].includes(r.si)) {
      out[r.mi] = out[r.mi].filter((x) => x !== r.si)
      changed.add(r.mi)
      n++
    }
  }
  const tryAdd = (a) => {
    if (n >= 5) return
    if (!out[a.mi].includes(a.si)) {
      const test = out.map((r, i) => (i === a.mi ? [...r, a.si] : r))
      if (radCost(test) <= budget) {
        out[a.mi] = [...out[a.mi], a.si].sort((x, y) => x - y)
        changed.add(a.mi)
        n++
      }
    }
  }
  // Max tre borttag först (frigör garderingar), sedan tillägg, sedan ev. fler borttag
  rems.slice(0, 3).forEach(tryRemove)
  adds.forEach(tryAdd)
  rems.slice(3).forEach(tryRemove)
  return { out, changed: [...changed].sort((x, y) => x - y), n }
}

export default function Nille() {
  const { s, set, toast } = useApp()
  const rad = s.nille.rad
  const step = s.nille.step
  const cost = radCost(rad)
  const a = analyze(s.experts, rad)
  const imp = improve(rad, a.adds, a.rems)

  const setStep = (i) => {
    set((prev) => ({ nille: { ...prev.nille, step: i } }))
    window.scrollTo(0, 0)
  }
  const toggle = (mi, si) => {
    const sel = rad[mi]
    if (sel.includes(si) && sel.length === 1) {
      toast('Minst ett tecken per match')
      return
    }
    set((prev) => ({
      nille: {
        ...prev.nille,
        rad: prev.nille.rad.map((r, i) =>
          i !== mi ? r : r.includes(si) ? r.filter((x) => x !== si) : [...r, si].sort((x, y) => x - y),
        ),
      },
    }))
  }

  const allResults = s.results.every((r) => r !== null)
  const nilleHits = allResults ? s.results.filter((r, i) => rad[i].includes(r)).length : null
  const impHits = allResults ? s.results.filter((r, i) => imp.out[i].includes(r)).length : null
  const risk = a.adds[0]

  return (
    <>
      <div className="mb-2">
        <h2 className="m-0 text-[17px] font-bold" style={{ color: PURPLE }}>NILLE-analysen</h2>
        <Note className="mt-0.5">Komplex motor – enkel app. Personlig analys av din inlagda rad.</Note>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2">
        {STEPS.map((l, i) => (
          <button
            key={l}
            onClick={() => setStep(i)}
            className={`shrink-0 rounded-[18px] px-3 py-[7px] font-bold text-xs border ${
              i === step
                ? 'text-white border-transparent'
                : i < step
                  ? 'bg-[#efe8fb] text-[#5627a6] border-transparent'
                  : 'bg-white text-[#153b61] border-line'
            }`}
            style={i === step ? { background: PURPLE } : undefined}
          >
            {l}
          </button>
        ))}
      </div>

      {step === 0 && (
        <>
          <Card>
            <h3 className="m-0 mb-1 text-[15px] font-bold">1 · Rad</h3>
            <Note>Lägg in Nilles rad – tecken för tecken, precis som den spelades.</Note>
            <div className="mt-2 text-[12.5px] text-[#2e7c4a] font-bold">
              ✓ Folk · ✓ Odds · ✓ Differens hämtas automatiskt
            </div>
          </Card>
          <Card className="!p-[13px]">
            <Coupon title="NILLES RAD" sub={`${cost} kr`}>
              {ROUND.matches.map((m, i) => (
                <CouponRow key={i} nr={i + 1} name={m.name} active={rad[i]} onPick={(si) => toggle(i, si)} />
              ))}
            </Coupon>
          </Card>
        </>
      )}

      {step === 1 && (
        <>
          <Card>
            <h3 className="m-0 mb-2 text-[15px] font-bold">2 · Analys</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[10px] p-3 text-center bg-[#fdeceb] text-[#a6322e]">
                <b className="block text-[24px]">{a.counts.change}</b>
                <span className="text-[12px]">Bör ändras</span>
              </div>
              <div className="rounded-[10px] p-3 text-center bg-[#fff5df] text-[#8c6500]">
                <b className="block text-[24px]">{a.counts.unsure}</b>
                <span className="text-[12px]">Osäkra</span>
              </div>
              <div className="rounded-[10px] p-3 text-center bg-[#eaf7ee] text-[#216d3e]">
                <b className="block text-[24px]">{a.counts.good}</b>
                <span className="text-[12px]">Ser bra ut</span>
              </div>
            </div>
            <div className="mt-3 bg-[#fff6e4] border-l-[5px] border-[#e9a421] p-3 rounded-lg">
              <b className="text-[13px]">Viktigaste tendensen</b>
              <p className="m-0 mt-1 text-[12.5px] leading-relaxed">{a.tendency}</p>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-[11px]">
            <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-l-[5px] border-go">
              <h3 className="m-0 mb-2 text-[14px] font-bold">Topp {a.adds.length} · Lägg till</h3>
              {a.adds.length === 0 && <Note>Inga tydliga tillägg den här omgången.</Note>}
              <ol className="m-0 pl-5">
                {a.adds.map((x, k) => (
                  <li key={k} className="mb-2.5 text-[13px]">
                    <b>M{x.mi + 1} → +{SIGNS[x.si]}</b>
                    <span className="float-right font-black">{x.pts}/100</span>
                    <small className="block text-muted mt-0.5">{x.why}</small>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-l-[5px] border-mark">
              <h3 className="m-0 mb-2 text-[14px] font-bold">Topp {a.rems.length} · Ta bort</h3>
              {a.rems.length === 0 && <Note>Inga tydliga borttag den här omgången.</Note>}
              <ol className="m-0 pl-5">
                {a.rems.map((x, k) => (
                  <li key={k} className="mb-2.5 text-[13px]">
                    <b>M{x.mi + 1} → −{SIGNS[x.si]}</b>
                    <span className="float-right font-black">{x.pts}/100</span>
                    <small className="block text-muted mt-0.5">{x.why}</small>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {risk && (
            <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-l-[5px] border-mark mb-[11px]">
              <div className="flex justify-between items-center gap-2">
                <h3 className="m-0 text-[13.5px] font-bold">
                  Match {risk.mi + 1} · {ROUND.matches[risk.mi].name}
                </h3>
                <span className="shrink-0 bg-[#fde9e7] text-[#a9302b] rounded-full px-2.5 py-1 text-[11px] font-black">
                  HÖG RISK
                </span>
              </div>
              <p className="my-2 text-[13px]">
                <b>
                  Nilles val: {signStr(rad[risk.mi])} → Förslag: {signStr(imp.out[risk.mi])}
                </b>
              </p>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th></th><th>1</th><th>X</th><th>2</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Folket</td>{ROUND.matches[risk.mi].folk.map((x, k) => <td key={k}>{x}%</td>)}</tr>
                    <tr><td>Odds</td>{ROUND.matches[risk.mi].odds.map((x, k) => <td key={k}>{x}%</td>)}</tr>
                    <tr><td><b>Diff</b></td>{diffOf(risk.mi).d.map((x, k) => <td key={k}><b>{x > 0 ? '+' : ''}{x}</b></td>)}</tr>
                  </tbody>
                </table>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer font-bold text-[13px]">Varför detta val?</summary>
                <p className="text-[12.5px] leading-relaxed">
                  {modelFor(s.experts, risk.mi).ih.n} liknande situationer i underlaget. Utfallet{' '}
                  {SIGNS[risk.si]} har {a.per[risk.mi].score[risk.si]}% i modellen medan folket bara ger
                  det {ROUND.matches[risk.mi].folk[risk.si]}%. {risk.why}.
                </p>
              </details>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <Card>
            <h3 className="m-0 mb-1 text-[15px] font-bold">3 · Min rad – förbättrad NILLE-rad</h3>
            <p className="m-0 mb-2 text-[13px]">
              <b>
                {imp.n} ändringar · fortfarande {radCost(imp.out)} kr (≤ {cost} kr)
              </b>
            </p>
            {imp.changed.length === 0 ? (
              <Note>Inga ändringar föreslås – raden följer redan signalerna väl.</Note>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>#</th><th>Nille</th><th>Förslag</th><th>Varför?</th></tr>
                  </thead>
                  <tbody>
                    {imp.changed.map((mi) => {
                      const why = [
                        ...a.rems.filter((x) => x.mi === mi && !imp.out[mi].includes(x.si)).map((x) => `−${SIGNS[x.si]} ${x.why.toLowerCase()}`),
                        ...a.adds.filter((x) => x.mi === mi && imp.out[mi].includes(x.si)).map((x) => `+${SIGNS[x.si]} ${x.why.toLowerCase()}`),
                      ].join(' · ')
                      return (
                        <tr key={mi}>
                          <td>{mi + 1}</td>
                          <td>{signStr(rad[mi])}</td>
                          <td><b>{signStr(imp.out[mi])}</b></td>
                          <td className="!whitespace-normal">{why}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-t-4 mb-[11px]" style={{ borderTopColor: PURPLE }}>
            <h3 className="m-0 mb-1 text-[14px] font-bold">⭐ Bästa reducerade</h3>
            <p className="m-0 text-[13px]"><b>R5-3-XX</b> rekommenderas för dagens riskprofil (demo).</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-bold text-[13px]">Varför detta system?</summary>
              <p className="text-[12.5px] leading-relaxed">
                Fem matcher är tydligt öppna, tre har starka tvåutfallsprofiler och fem är bra
                spikkandidater. Riktig reduceringsmotor kopplas på när databasen byggts upp.
              </p>
            </details>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card>
            <h3 className="m-0 mb-2 text-[15px] font-bold">4 · Resultat</h3>
            {allResults ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-line rounded-[13px] p-3">
                    <span className="block text-muted text-[12px]">Nilles rad</span>
                    <b className="text-[22px]">{nilleHits} rätt</b>
                  </div>
                  <div className="border border-[#d8c9f2] rounded-[13px] p-3">
                    <span className="block text-muted text-[12px]">NILLE-förslag</span>
                    <b className="text-[22px]" style={{ color: PURPLE }}>{impHits} rätt</b>
                  </div>
                </div>
                <div className="text-center text-[26px] font-black mt-3" style={{ color: PURPLE }}>
                  {impHits - nilleHits >= 0 ? '+' : ''}{impHits - nilleHits} rätt
                </div>
              </>
            ) : (
              <Note>
                Omgången är inte rättad ännu. Hämta resultatet under <b>5 · Resultat</b> när
                matcherna är färdigspelade – då jämförs Nilles rad och NILLE-förslaget här.
              </Note>
            )}
          </Card>
          {allResults && (
            <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-l-[5px] border-go mb-[11px]">
              <h3 className="m-0 mb-1 text-[14px] font-bold">
                {imp.changed.filter((mi) => imp.out[mi].includes(s.results[mi]) && !rad[mi].includes(s.results[mi])).length}{' '}
                av {imp.n} ändringar förbättrade raden
              </h3>
              <Note>Ändringar som täckte rätt utfall räknas som förbättringar.</Note>
            </div>
          )}
          <Card>
            <b className="text-[13.5px]">NILLE-databasen uppdaterad ✓</b>
            <Note className="mt-1">
              Motorn lär sig vidare i bakgrunden – misstag, träffar och förbättringsmönster sparas
              för samma tippare. (Demo tills databasen byggts upp.)
            </Note>
          </Card>
        </>
      )}

      <Banner>
        NILLE-profileringen bygger tills vidare på modellsignalerna och demodata. När omgångar
        sparas i databasen lär sig motorn Nilles verkliga tendenser.
      </Banner>
    </>
  )
}
