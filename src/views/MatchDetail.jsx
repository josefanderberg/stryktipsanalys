import { useEffect } from 'react'
import { useApp } from '../store.jsx'
import { ROUND, SIGNS } from '../lib/data.js'
import {
  allFilled, comboKey, diffOf, modelFor, recFor, relStars, signStr, starStr,
  signalsFor, adaptiveChoice, signsFromDist, matchWord,
} from '../lib/model.js'
import { Card, SecTitle, Note, Chip, Cta, Track } from '../components/ui.jsx'

const pOr = (p) => (p ? p.map((x) => `${x}%`) : ['–', '–', '–'])

export default function MatchDetail() {
  const { s, set, show } = useApp()

  const ready = s.fetched && ROUND.matches && allFilled(s.experts)
  useEffect(() => {
    if (!ready) show('analys')
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return null

  const mi = s.detail
  const m = ROUND.matches[mi]
  const d = diffOf(mi)
  const { score, iv, ih, h, weights } = modelFor(s.experts, mi)
  const r = recFor(s.experts, mi)
  const sig = signalsFor(s.experts, mi)
  const src = adaptiveChoice(s.experts, mi)
  const rel = relStars(ih.n)

  const openMatch = (i) => {
    set({ detail: i })
    window.scrollTo(0, 0)
  }

  return (
    <>
      <button
        onClick={() => show('analys')}
        className="border-0 bg-transparent text-royal font-bold text-[13px] pt-0.5 pb-2.5 text-left"
      >
        ‹ Tillbaka till kuponganalysen
      </button>

      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">
          Match {mi + 1}: {m.name}
        </h2>
        <SecTitle>1 · Experternas val</SecTitle>
        <div className="tbl-wrap"><table className="tbl">
          <thead>
            <tr>{s.experts.map((_, i) => <th key={i}>E{i + 1}</th>)}</tr>
          </thead>
          <tbody>
            <tr>{s.experts.map((e, i) => <td key={i}><b>{comboKey(e[mi])}</b></td>)}</tr>
          </tbody>
        </table></div>
        <SecTitle className="mt-3">2 · Exakt expertmönster (ordningen borträknad)</SecTitle>
        <Chip>{h.pattern}</Chip>
      </Card>

      <Card>
        <SecTitle>Snabböversikt – fem signaler</SecTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            { t: 'Exakt expertmönster', d: sig.hist, sub: `${sig.hist.n} ${matchWord(sig.hist.n)} i databasen` },
            { t: 'Exakt mönster + dagens diff ⭐', d: sig.diff, sub: `${sig.diff.n} ${matchWord(sig.diff.n)} i dagens intervall`, star: true },
            { t: 'Liknande mönster', d: sig.sim, sub: `${sig.sim.n} ${matchWord(sig.sim.n)}` },
            { t: `↔ ${sig.cross.label}`, d: sig.cross, sub: `${sig.cross.n} ${matchWord(sig.cross.n)} · sekundärt stöd`, cross: true },
            { t: 'Sammanvägd modell', d: sig.model, sub: 'Viktad sammanvägning', wide: true },
          ].map((b) => (
            <div
              key={b.t}
              className={`rounded-[11px] border p-2.5 ${b.wide ? 'col-span-2 ' : ''}${
                b.star
                  ? 'border-[#f4bb42] bg-[#fffdf7]'
                  : b.cross
                    ? 'border-[#cdbbea] bg-[#f9f6ff]'
                    : 'border-line bg-white'
              }`}
            >
              <h3 className="m-0 mb-2 text-[12px] font-bold leading-snug">{b.t}</h3>
              <div className="grid grid-cols-3 gap-1 text-center">
                {pOr(b.d.p).map((v, k) => (
                  <div key={k}>
                    <b className="block text-[17px]">{v}</b>
                    <span className="text-[11px] text-muted">{SIGNS[k]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 text-[10.5px] text-muted">{b.sub}</div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-[10px] bg-[#eaf7ee] text-[#1e6b3b] font-bold p-3 text-[13px] leading-relaxed">
          ★ Adaptiv rekommendation: {signStr(signsFromDist(src.p))}
          <br />
          <span className="font-normal text-[12px]">
            {src.key === 'model' && !h.base
              ? 'Underlag saknas ännu – bedömningen bygger på odds och differens.'
              : `${src.label} har starkast stöd för den här matchen.`}
          </span>
        </div>
      </Card>

      <Card>
        <SecTitle>3 · All historik för mönstret</SecTitle>
        {h.total > 0 ? (
          <>
            <p className="m-0 mb-1">
              <b>{h.total} sparad{h.total === 1 ? '' : 'e'} {matchWord(h.total)}</b>{' '}
              <span className="text-[11px] text-muted">– baslinjen innan differensen vägs in</span>
            </p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[20px_1fr_46px] gap-2 items-center my-[7px] font-bold">
                <span>{SIGNS[i]}</span>
                <Track pct={h.base[i]} />
                <b>{h.base[i]}%</b>
              </div>
            ))}
          </>
        ) : (
          <Note>
            Mönstret <b>{h.pattern}</b> finns inte i databasen ännu. Varje sparad omgång ger 13 nya
            matcher – underlaget byggs upp omgång för omgång.
          </Note>
        )}
      </Card>

      <Card>
        <SecTitle>4 · Dagens differens</SecTitle>
        <div className="tbl-wrap"><table className="tbl">
          <thead>
            <tr><th></th><th>1</th><th>X</th><th>2</th></tr>
          </thead>
          <tbody>
            <tr><td>Svenska folket</td>{m.folk.map((x, i) => <td key={i}>{x}%</td>)}</tr>
            <tr><td>Oddsprocent</td>{m.odds.map((x, i) => <td key={i}>{x}%</td>)}</tr>
            <tr><td><b>Diff</b></td>{d.d.map((x, i) => <td key={i}><b>{x > 0 ? '+' : ''}{x}</b></td>)}</tr>
          </tbody>
        </table></div>
        <p className="mt-2 mb-0">
          <Chip tone="blue">Total differens = {d.total} · Intervall {iv}</Chip>
        </p>
      </Card>

      <Card>
        <SecTitle>5 · Historik för mönstret, uppdelad efter differens</SecTitle>
        {h.intervals.some((x) => x.n > 0) ? (
          <>
            <div className="tbl-wrap"><table className="tbl">
              <thead>
                <tr><th>Differens</th><th>Matcher</th><th>1</th><th>X</th><th>2</th></tr>
              </thead>
              <tbody>
                {h.intervals.filter((x) => x.n > 0 || x.label === iv).map((x) => (
                  <tr key={x.label} className={x.label === iv ? 'hl' : ''}>
                    <td>{x.label === iv ? '⭐ ' : ''}{x.label}</td>
                    <td>{x.n}</td>
                    {pOr(x.p).map((p, i) => <td key={i}>{p}</td>)}
                  </tr>
                ))}
              </tbody>
            </table></div>
            <Note className="mt-2">⭐ Dagens match ligger i intervall {iv} ({ih.n} {matchWord(ih.n)} i underlaget).</Note>
          </>
        ) : (
          <Note>Ingen historik för mönstret i något differensintervall ännu.</Note>
        )}
      </Card>

      <Card>
        <SecTitle>6 · Liknande mönster & stöd från {ROUND.game === 'stryktipset' ? 'Europatipset' : 'Stryktipset'}</SecTitle>
        <div className="tbl-wrap"><table className="tbl">
          <thead>
            <tr><th>Underlag</th><th>Matcher</th><th>1</th><th>X</th><th>2</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Liknande mönster (≥ ⅔ likhet)</td>
              <td>{sig.sim.n}</td>
              {pOr(sig.sim.p).map((p, i) => <td key={i}>{p}</td>)}
            </tr>
            <tr>
              <td>↔ {sig.cross.label}, intervall {iv}</td>
              <td>{sig.cross.n}</td>
              {pOr(sig.cross.p).map((p, i) => <td key={i}>{p}</td>)}
            </tr>
          </tbody>
        </table></div>
        <Note className="mt-2">
          Sekundära underlag som väger lätt i modellen och främst används när det exakta mönstret
          har få matcher.
        </Note>
        {h.samples.length > 0 && (
          <>
            <SecTitle className="mt-3">Senaste matcherna med mönstret</SecTitle>
            <div className="tbl-wrap"><table className="tbl">
              <thead>
                <tr><th>Datum</th><th>Intervall</th><th>Resultat</th></tr>
              </thead>
              <tbody>
                {h.samples.map((x, i) => (
                  <tr key={i}>
                    <td>{x.datum}</td><td>{x.diff}</td><td><b>{x.res}</b></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </>
        )}
      </Card>

      <Card>
        <SecTitle>7 · Modellbedömning</SecTitle>
        <div className="bg-night text-white rounded-[11px] p-[13px]">
          <div className="text-[11px] tracking-[.08em] text-[#bcc5ce] mb-2 font-bold">
            MATCH {mi + 1} – MODELLBEDÖMNING
          </div>
          {[0, 1, 2].map((i) => {
            const best = i === r.ord[0]
            return (
              <div
                key={i}
                className={`grid grid-cols-[20px_1fr_46px] gap-2 items-center my-2 ${best ? 'font-black' : ''}`}
              >
                <span>{best ? '🥇' : SIGNS[i]}</span>
                <div>
                  <div className="text-[11px] tracking-[.12em] text-gold mb-0.5">
                    {starStr(Math.max(1, Math.round(score[i] / 20)))}
                  </div>
                  <Track pct={score[i]} dark />
                </div>
                <b>{score[i]}%</b>
              </div>
            )
          })}
          <div className="mt-3 pt-2.5 border-t border-[#3b4650] text-[11.5px] leading-[1.7] text-[#c5cdd4]">
            <b className="text-white">Underlag:</b> {ih.n} {matchWord(ih.n)} i dagens differensintervall ·{' '}
            <b className="text-white">Tillförlitlighet:</b> {starStr(rel)}
            <br />
            <br />
            <b className="text-white">Varför?</b>
            <br />
            {weights.parts.map((p) => (
              <span key={p.key}>
                ✓ {p.label} ({p.n} {matchWord(p.n)}): {p.p.join('/')} – vikt {Math.round(p.w * 100)}%
                <br />
              </span>
            ))}
            ✓ Oddsprocent: {m.odds.join('/')} – vikt {Math.round(weights.wO * 100)}%
            <br />
            ✓ Svenska folket: {m.folk.join('/')}
            <br />
            <br />
            <span className="opacity-80">
              {weights.parts.length === 0
                ? 'Databasen saknar ännu matchande historik – bedömningen är just nu marknadens. Spara omgångar så växer modellens egen vikt.'
                : 'Historikens vikt växer automatiskt med underlagets storlek.'}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle>8 · Rekommendation</SecTitle>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="border-2 border-line rounded-[9px] p-2.5 text-[12.5px]">
            <small className="text-muted">Förslag</small>
            <b className="block text-[15px] text-navy">
              {r.type === 'SPIK' ? '🔒 SPIK: ' : `${r.type}: `}
              {signStr(r.signs)}
            </b>
            <small className="text-muted">
              {r.type === 'SPIK'
                ? 'Spikas i systemet'
                : r.type === 'HELGARDERING'
                  ? 'Helgardering 1X2'
                  : 'Halvgardering'}
            </small>
          </div>
          <div className="border-2 border-line rounded-[9px] p-2.5 text-[12.5px]">
            <small className="text-muted">Skrälltecken</small>
            <b className="block text-[15px] text-navy">{r.skr !== null ? `💥 ${SIGNS[r.skr]}` : '–'}</b>
            <small className="text-muted">
              {r.skr !== null
                ? `Modellen ${score[r.skr]}% / Folket ${m.folk[r.skr]}%`
                : 'Ingen tydlig skräll'}
            </small>
          </div>
        </div>
        <Note className="mt-2">
          Du kan ändra alla tecken själv i steget <b>Min rad</b>.
        </Note>
      </Card>

      {mi < 12 ? (
        <Cta tone="blue" onClick={() => openMatch(mi + 1)}>Nästa match ›</Cta>
      ) : (
        <Cta tone="blue" onClick={() => show('rad')}>Bygg min rad ›</Cta>
      )}
    </>
  )
}
