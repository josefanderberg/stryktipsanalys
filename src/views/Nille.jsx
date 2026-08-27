import { useState } from 'react'
import { useApp } from '../store.jsx'
import { ROUND, SIGNS } from '../lib/data.js'
import {
  modelFor, diffOf, radCost, signStr, signsFromDist, relStars, starStr, strategyRows, STRATEGIES, budgetKr, matchWord,
} from '../lib/model.js'
import { Card, SecTitle, Note, Cta, Coupon, CouponRow, Banner, NrBadge } from '../components/ui.jsx'

const PURPLE = '#6d35c5'
const STEPS = ['1 · Rad', '2 · Analys', '3 · Min rad', '4 · Resultat']

const eq = (a, b) => signStr(a) === signStr(b)

// Analys av Nilles rad mot modellen, match för match
function analyze(experts, rad) {
  return ROUND.matches.map((m, i) => {
    const { score, ih } = modelFor(experts, i)
    const orig = rad[i]
    const rec = signsFromDist(score)
    const ord = [0, 1, 2].sort((a, b) => score[b] - score[a])
    const top = ord[0]
    const risk = eq(orig, rec) ? 'SER BRA UT' : orig.includes(top) ? 'KONTROLLERA' : 'NILLE-FÄLLA'
    const small = ih.n < 5
    const why =
      risk === 'NILLE-FÄLLA'
        ? `Nilles rad saknar ${SIGNS[top]} trots att det är modellens starkaste tecken (${score[top]}%).` +
          (m.odds[top] > m.folk[top] + 3 ? ` Folket undervärderar dessutom tecknet (${m.folk[top]}% mot oddsens ${m.odds[top]}%).` : '')
        : risk === 'KONTROLLERA'
          ? `Rekommendationen justerar garderingen: ${signStr(rec)} täcker modellens starkaste utfall effektivare än ${signStr(orig)}.`
          : 'Valet ligger i linje med modellens bedömning.'
    return {
      i, m, score, ih, orig, rec, top, risk,
      why: why + (small ? ' Underlaget är litet ännu – bedömningen bygger främst på odds och differens.' : ''),
    }
  })
}

function heroSignals(per) {
  const best = (arr, f) => arr.reduce((a, x) => (f(x) > f(a) ? x : a), arr[0])
  const covered = per.filter((p) => p.orig.length > 0)
  const stark = best(covered, (p) => Math.max(...p.orig.map((si) => p.score[si])))
  const starkSi = stark.orig.slice().sort((a, b) => stark.score[b] - stark.score[a])[0]
  const varde = best(per, (p) => Math.max(...p.rec.map((si) => p.score[si] - p.m.folk[si])))
  const vardeSi = varde.rec.slice().sort((a, b) => (varde.score[b] - varde.m.folk[b]) - (varde.score[a] - varde.m.folk[a]))[0]
  const missed = per.filter((p) => !p.orig.includes(p.top))
  const falla = missed.length ? best(missed, (p) => p.score[p.top]) : null
  const favs = per.filter((p) => p.orig.length === 1 && p.m.folk[p.orig[0]] >= 45)
  const farlig = favs.length ? best(favs, (p) => p.m.folk[p.orig[0]] - p.score[p.orig[0]]) : null
  const ned = per.filter((p) => p.orig.length > p.rec.length)
  const nedB = ned.length ? best(ned, (p) => p.orig.length - p.rec.length) : null
  const upp = per.filter((p) => p.rec.length > p.orig.length)
  const uppB = upp.length ? best(upp, (p) => p.rec.length - p.orig.length) : null
  return { stark, starkSi, varde, vardeSi, falla, farlig, nedB, uppB }
}

// Topp 5 lägg till / ta bort
function topFive(per) {
  const adds = per
    .flatMap((p) =>
      [0, 1, 2]
        .filter((si) => !p.orig.includes(si) && p.score[si] >= 22)
        .map((si) => ({
          mi: p.i, si,
          pts: Math.min(96, Math.round(p.score[si] + Math.max(0, (p.m.odds[si] - p.m.folk[si]) * 1.5))),
          why: p.m.odds[si] > p.m.folk[si] + 3 ? `${SIGNS[si]} undervärderad av folket` : p.score[si] >= 40 ? 'Starkt modellstöd' : 'Öppen match',
        })),
    )
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 5)
  const rems = per
    .flatMap((p) =>
      p.orig.length > 1
        ? p.orig
            .filter((si) => p.score[si] <= 30)
            .map((si) => ({
              mi: p.i, si,
              pts: Math.min(94, Math.round((35 - p.score[si]) * 2 + Math.max(0, p.m.folk[si] - p.score[si]))),
              why: p.m.folk[si] - p.score[si] >= 10 ? 'Överstreckat tecken' : p.score[si] < 18 ? 'Svagt historiskt stöd' : 'Frigör gardering',
            }))
        : [],
    )
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 5)
  return { adds, rems }
}

export default function Nille() {
  const { s, set, show, toast, saveNille } = useApp()
  const [selIdx, setSelIdx] = useState(null)
  const [top5Open, setTop5Open] = useState(false)
  const [budget, setBudget] = useState('192')
  const [strategy, setStrategy] = useState('adaptive')

  if (!s.fetched || !ROUND.matches) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold" style={{ color: PURPLE }}>NILLE-analysen</h2>
        <Note>Hämta först omgången under <b>Start</b> – NILLE analyserar raden mot omgångens riktiga matcher.</Note>
        <Cta tone="blue" onClick={() => show('start')}>Till start</Cta>
      </Card>
    )
  }

  const rad = s.nille.rad
  const step = s.nille.step
  const complete = rad.every((r) => r.length > 0)
  const per = complete ? analyze(s.experts, rad) : null
  const hero = per ? heroSignals(per) : null
  const t5 = per ? topFive(per) : null

  const setStep = (i) => {
    set((prev) => ({ nille: { ...prev.nille, step: i } }))
    window.scrollTo(0, 0)
  }
  const toggle = (mi, si) => {
    set((prev) => ({
      nille: {
        ...prev.nille,
        saved: false,
        rad: prev.nille.rad.map((r, i) =>
          i !== mi ? r : r.includes(si) ? r.filter((x) => x !== si) : [...r, si].sort((x, y) => x - y),
        ),
      },
    }))
  }

  // Rekommenderad rad i steg 3 (vald strategi + budget)
  const recRows = per ? strategyRows(s.experts, budget === 'reduced' ? 'reduced' : +budget) : null
  const recRad = recRows ? recRows[strategy].rad : null
  const changes = per && recRad ? per.filter((p) => !eq(rad[p.i], recRad[p.i])) : []

  const allResults = s.results.every((r) => r !== null)
  const nilleHits = allResults && complete ? s.results.filter((r, i) => rad[i].includes(r)).length : null
  const recHits = allResults && recRad ? s.results.filter((r, i) => recRad[i].includes(r)).length : null

  const detail = selIdx !== null && per ? per[selIdx] : null

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
            onClick={() => (i === 0 || complete ? setStep(i) : toast('Fyll i raden först'))}
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
          <Card>
            <Coupon title="NILLES RAD" sub={complete ? `${radCost(rad)} kr` : `${rad.filter((r) => r.length).length}/13`}>
              {ROUND.matches.map((m, i) => (
                <CouponRow key={i} nr={i + 1} name={m.name} active={rad[i]} onPick={(si) => toggle(i, si)} />
              ))}
            </Coupon>
          </Card>
        </>
      )}

      {step === 1 && per && (
        <>
          <div className="rounded-[16px] p-4 mb-[11px] text-white" style={{ background: 'linear-gradient(135deg,#5b2aa8,#7b45d1)' }}>
            <h2 className="m-0 mb-3 text-[17px] font-bold">KUPONGANALYS – NILLE</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: '🔥 Starkast NILLE-val', v: `Match ${hero.stark.i + 1} – ${SIGNS[hero.starkSi]}`, sub: `Modellen ${hero.stark.score[hero.starkSi]}% / Folket ${hero.stark.m.folk[hero.starkSi]}%` },
                { l: '💎 Bästa värdetecken', v: `Match ${hero.varde.i + 1} – ${SIGNS[hero.vardeSi]}`, sub: `Modellen ${hero.varde.score[hero.vardeSi]}% / Folket ${hero.varde.m.folk[hero.vardeSi]}%` },
                hero.falla
                  ? { l: '💥 Största NILLE-fällan', v: `Match ${hero.falla.i + 1} – ${SIGNS[hero.falla.top]}`, sub: `Modellen ${hero.falla.score[hero.falla.top]}% / saknas i raden` }
                  : { l: '💥 Största NILLE-fällan', v: '–', sub: 'Raden täcker modellens toppval' },
                hero.farlig
                  ? { l: '⚠️ Farlig favorit', v: `Match ${hero.farlig.i + 1} – ${SIGNS[hero.farlig.orig[0]]}`, sub: `Folket ${hero.farlig.m.folk[hero.farlig.orig[0]]}% / Modellen ${hero.farlig.score[hero.farlig.orig[0]]}%` }
                  : { l: '⚠️ Farlig favorit', v: '–', sub: 'Ingen överstreckad spik' },
                hero.nedB
                  ? { l: '🤝 Mest nedgraderad', v: `Match ${hero.nedB.i + 1}`, sub: `Från ${signStr(hero.nedB.orig)} till ${signStr(hero.nedB.rec)}` }
                  : { l: '🤝 Mest nedgraderad', v: '–', sub: 'Inga garderingar tas bort' },
                hero.uppB
                  ? { l: '⚔️ Mest uppgraderad', v: `Match ${hero.uppB.i + 1}`, sub: `Från ${signStr(hero.uppB.orig)} till ${signStr(hero.uppB.rec)}` }
                  : { l: '⚔️ Mest uppgraderad', v: '–', sub: 'Inga garderingar läggs till' },
              ].map((x) => (
                <div key={x.l} className="bg-white/12 border border-white/20 rounded-[11px] p-2.5">
                  <span className="block opacity-80 text-[11px]">{x.l}</span>
                  <b className="block text-[15px] my-1">{x.v}</b>
                  <small className="opacity-80 text-[11px]">{x.sub}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[13px] overflow-hidden bg-white shadow-[0_2px_8px_#0001] mb-[11px]">
            <div className="grid grid-cols-[minmax(0,1fr)_74px_70px] gap-2 px-3 py-2.5 bg-[#f5f1fb] text-[#665b70] text-[10px] font-black uppercase tracking-wide">
              <span>Match</span><span className="text-center">Rek. val</span><span className="text-right">Modell-%</span>
            </div>
            {per.map((p) => (
              <button
                key={p.i}
                onClick={() => setSelIdx(p.i)}
                className={`w-full grid grid-cols-[minmax(0,1fr)_74px_70px] gap-2 items-center px-3 py-2.5 border-0 border-t border-line bg-white text-left text-[12.5px] ${
                  selIdx === p.i ? 'bg-[#faf7ff]' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <i className="not-italic shrink-0 w-6 h-6 rounded-md text-white flex items-center justify-center font-black text-[11px]" style={{ background: PURPLE }}>
                    {p.i + 1}
                  </i>
                  <span className="truncate">{p.m.name}</span>
                </span>
                <span className="text-center font-black text-[#422070]">{signStr(p.rec)}</span>
                <span className="text-right font-black text-[#267043]">
                  {p.score[p.top]}% <small className="text-[#a9b0b6]">›</small>
                </span>
              </button>
            ))}
          </div>

          {detail && (
            <Card>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <SecTitle className="!mb-0.5">MATCH {detail.i + 1} AV 13</SecTitle>
                  <h3 className="m-0 text-[15px] font-bold">{detail.m.name}</h3>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-black ${
                    detail.risk === 'NILLE-FÄLLA'
                      ? 'bg-[#fde9e7] text-[#a9302b]'
                      : detail.risk === 'KONTROLLERA'
                        ? 'bg-[#fff5df] text-[#8c6500]'
                        : 'bg-[#eaf7ee] text-[#216d3e]'
                  }`}
                >
                  {detail.risk}
                </span>
              </div>
              <p className="my-2 text-[14px]">
                Nilles val: <b>{signStr(detail.orig)}</b> → Rekommendation: <b>{signStr(detail.rec)}</b>
              </p>
              <div className="grid grid-cols-3 gap-2 my-2">
                {[
                  { l: 'Folket', v: detail.m.folk.join(' / ') },
                  { l: 'Odds', v: detail.m.odds.join(' / ') },
                  { l: 'Diff', v: diffOf(detail.i).d.map((x) => (x > 0 ? '+' + x : x)).join(' / ') },
                ].map((x) => (
                  <div key={x.l} className="bg-[#f7f8fa] border border-line rounded-[9px] p-2 text-center">
                    <span className="block text-muted text-[11px]">{x.l}</span>
                    <b className="block mt-1 text-[12px]">{x.v}</b>
                  </div>
                ))}
              </div>
              <div className="bg-night text-white rounded-[13px] p-3.5 my-3">
                <span className="text-[10.5px] tracking-[.08em] text-[#bac3cd] font-black">NILLE-MODELLBEDÖMNING</span>
                {[0, 1, 2].map((si) => (
                  <div key={si} className="grid grid-cols-[20px_1fr_46px] gap-2.5 items-center my-2">
                    <span>{SIGNS[si]}</span>
                    <div className="h-3 bg-[#3a4755] rounded-full overflow-hidden">
                      <i className="block h-full rounded-full bg-[#f0b750]" style={{ width: `${detail.score[si]}%` }} />
                    </div>
                    <b>{detail.score[si]}%</b>
                  </div>
                ))}
                <p className="text-[#c7d0d9] text-[12px] mt-2 mb-0">
                  <b>Underlag:</b> {detail.ih.n} matchande {detail.ih.n === 1 ? 'situation' : 'situationer'} i databasen ·{' '}
                  <b>Tillförlitlighet:</b> {starStr(relStars(detail.ih.n))}
                </p>
                <div className="mt-3 border-t border-[#3e4853] pt-2.5">
                  <b className="text-[12.5px]">Varför?</b>
                  <p className="m-0 mt-1 text-[12px] text-[#c7d0d9] leading-relaxed">{detail.why}</p>
                </div>
              </div>
              <div className="bg-[#f5effd] border border-[#d7c5f3] rounded-[11px] p-3 mb-3">
                <span className="block text-[#6e5f82] text-[11px]">Rekommendation</span>
                <b className="block text-[24px] my-0.5" style={{ color: '#5c2baa' }}>{signStr(detail.rec)}</b>
                <small className="text-[#6e5f82]">
                  {detail.risk === 'SER BRA UT' ? 'Samma som Nilles val – behåll.' : 'Starkare stöd än Nilles ursprungliga val.'}
                </small>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="border-0 rounded-[9px] py-2.5 font-bold text-[13px] bg-[#eaf0f4] text-navy"
                  onClick={() => setSelIdx((selIdx + 12) % 13)}
                >
                  ‹ Föregående
                </button>
                <button
                  className="border-0 rounded-[9px] py-2.5 font-bold text-[13px] text-white"
                  style={{ background: PURPLE }}
                  onClick={() => setSelIdx((selIdx + 1) % 13)}
                >
                  Nästa match ›
                </button>
              </div>
            </Card>
          )}

          <button
            onClick={() => setTop5Open(!top5Open)}
            className="w-full flex justify-between rounded-[10px] border border-[#c8afe9] bg-white text-[#5c2baa] font-black text-[13.5px] px-3.5 py-3 mb-[11px]"
          >
            <span>📈 Topp 5 – Lägg till / Ta bort</span>
            <span>{top5Open ? '⌄' : '›'}</span>
          </button>
          {top5Open && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-[11px]">
              <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-l-[5px] border-go">
                <h3 className="m-0 mb-2 text-[14px] font-bold">Topp {t5.adds.length} · Lägg till</h3>
                {t5.adds.length === 0 && <Note>Inga tydliga tillägg.</Note>}
                <ol className="m-0 pl-5">
                  {t5.adds.map((x, k) => (
                    <li key={k} className="mb-2.5 text-[13px]">
                      <b>M{x.mi + 1} → +{SIGNS[x.si]}</b>
                      <span className="float-right font-black">{x.pts}/100</span>
                      <small className="block text-muted mt-0.5">{x.why}</small>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-l-[5px] border-mark">
                <h3 className="m-0 mb-2 text-[14px] font-bold">Topp {t5.rems.length} · Ta bort</h3>
                {t5.rems.length === 0 && <Note>Inga tydliga borttag.</Note>}
                <ol className="m-0 pl-5">
                  {t5.rems.map((x, k) => (
                    <li key={k} className="mb-2.5 text-[13px]">
                      <b>M{x.mi + 1} → −{SIGNS[x.si]}</b>
                      <span className="float-right font-black">{x.pts}/100</span>
                      <small className="block text-muted mt-0.5">{x.why}</small>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </>
      )}

      {step === 2 && per && (
        <>
          <Card>
            <h3 className="m-0 mb-1 text-[15px] font-bold">3 · Min rad</h3>
            <Note>Modellens bästa förslag jämfört med din inlagda rad.</Note>
            <SecTitle className="mt-3">Välj budget</SecTitle>
            <div className="grid grid-cols-2 gap-2">
              {['128', '192', '256', 'reduced'].map((b) => (
                <button
                  key={b}
                  onClick={() => setBudget(b)}
                  className={`rounded-full px-3 py-2.5 font-bold text-[12.5px] border ${
                    budget === b ? 'text-white border-transparent' : 'bg-white border-line text-ink'
                  }`}
                  style={budget === b ? { background: PURPLE } : undefined}
                >
                  {b === 'reduced' ? '⭐ Bästa reducerade' : `${b} kr`}
                </button>
              ))}
            </div>
            <SecTitle className="mt-3">Välj strategi</SecTitle>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {STRATEGIES.map((st) => (
                <button
                  key={st.key}
                  onClick={() => setStrategy(st.key)}
                  className={`shrink-0 rounded-full px-3 py-2 font-bold text-[12px] border ${
                    strategy === st.key ? 'text-white border-transparent' : 'bg-white border-line text-ink'
                  }`}
                  style={strategy === st.key ? { background: PURPLE } : undefined}
                >
                  {st.name.replace('★ ', '').replace('◷ ', '').replace('◎ ', '').replace('▥ ', '')}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <h3 className="m-0 text-[14px] font-bold">
                JÄMFÖRELSE – {budget === 'reduced' ? 'BÄSTA REDUCERADE' : `${budget} KR`}
              </h3>
              <span className="bg-[#efe6fb] text-[#5b2aa8] rounded-full px-2.5 py-1 text-[11px] font-black">
                {changes.length} ändringar
              </span>
            </div>
            <div className="tbl-wrap mt-2">
              <table className="tbl" style={{ minWidth: 460 }}>
                <thead>
                  <tr><th>#</th><th>Match</th><th>Din rad</th><th>Rekommenderad</th><th>Varför ändring?</th></tr>
                </thead>
                <tbody>
                  {per.map((p) => {
                    const rr = recRad[p.i]
                    const added = rr.filter((si) => !rad[p.i].includes(si))
                    const removed = rad[p.i].filter((si) => !rr.includes(si))
                    const why = eq(rad[p.i], rr)
                      ? 'Behålls'
                      : added.length
                        ? `${SIGNS[added[0]]} har starkare stöd (${p.score[added[0]]}%)`
                        : removed.length
                          ? `−${SIGNS[removed[0]]} frigör gardering`
                          : 'Justeras'
                    return (
                      <tr key={p.i}>
                        <td>{p.i + 1}</td>
                        <td>{p.m.name}</td>
                        <td>{signStr(rad[p.i])}</td>
                        <td className="font-black text-[#5b2aa8]"><b>{signStr(rr)}</b></td>
                        <td className="!whitespace-normal">{why}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-[11px]">
            <div className="bg-white border border-line rounded-[13px] p-3"><span className="block text-muted text-[12px]">Ändringar</span><b className="text-[20px]">{changes.length}</b></div>
            <div className="bg-white border border-line rounded-[13px] p-3"><span className="block text-muted text-[12px]">Behålls</span><b className="text-[20px]">{13 - changes.length}</b></div>
            <div className="bg-white border border-line rounded-[13px] p-3"><span className="block text-muted text-[12px]">Kostnad</span><b className="text-[20px]">{radCost(recRad)} kr</b></div>
            <div className="bg-white border border-[#d7c5f3] rounded-[13px] p-3"><span className="block text-muted text-[12px]">Radstorlek</span><b className="text-[20px]">≤ {budgetKr(budget === 'reduced' ? 'reduced' : +budget)} rader</b></div>
          </div>

          <div className="bg-white rounded-[13px] p-[13px] shadow-[0_2px_8px_#0001] border-l-[5px] border-[#e9a421] mb-[11px]">
            <h3 className="m-0 mb-1 text-[14px] font-bold">💡 Varför denna rad?</h3>
            <p className="m-0 text-[12.5px] leading-relaxed">
              Modellen prioriterar de matcher där din rad går mest emot historik, värde och den
              adaptiva rekommendationen. Förslaget bygger på databasens faktiska underlag och går
              att ändra manuellt i huvudflödets <b>Min rad</b>.
            </p>
          </div>
        </>
      )}

      {step === 3 && per && (
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
                    <b className="text-[22px]" style={{ color: PURPLE }}>{recHits} rätt</b>
                  </div>
                </div>
                <div className="text-center text-[26px] font-black mt-3" style={{ color: PURPLE }}>
                  {recHits - nilleHits >= 0 ? '+' : ''}{recHits - nilleHits} rätt
                </div>
              </>
            ) : (
              <Note>
                Omgången är inte rättad ännu. Hämta resultatet under <b>5 · Resultat</b> när
                matcherna är färdigspelade – då jämförs Nilles rad och NILLE-förslaget här.
              </Note>
            )}
          </Card>
          <Card>
            <b className="text-[13.5px]">{s.nille.saved ? 'NILLE-databasen uppdaterad ✓' : 'NILLE-raden sparas när du trycker Spara rad'}</b>
            <Note className="mt-1">
              Motorn lär sig vidare i bakgrunden – misstag, träffar och förbättringsmönster sparas
              för samma tippare i den egna NILLE-databasen.
            </Note>
          </Card>
        </>
      )}

      <Banner>
        NILLE-bedömningarna bygger på databasens faktiska underlag. Med få sparade omgångar väger
        odds och differens tyngst – det redovisas i varje matchbedömning.
      </Banner>
    </>
  )
}
