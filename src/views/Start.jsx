import { useApp } from '../store.jsx'
import { ROUND } from '../lib/data.js'
import { diffOf } from '../lib/model.js'
import { Card, SecTitle, Note, Cta, Banner } from '../components/ui.jsx'

export default function Start() {
  const { s, fetchRound } = useApp()
  const live = s.roundData && ROUND.source === 'live'

  return (
    <>
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Ny Stryktipsomgång</h2>
        <Note className="mt-0 mb-3">{live ? ROUND.label : 'Hämta aktuell omgång från Svenska Spel'}</Note>
        <SecTitle>Källa</SecTitle>
        <input
          type="text"
          readOnly
          value="spela.svenskaspel.se/stryktipset"
          className="w-full border-2 border-line rounded-[9px] p-[11px] text-sm bg-[#fafcfe] box-border"
        />
        <Cta tone="blue" onClick={fetchRound}>
          HÄMTA OMGÅNG
        </Cta>
        {s.fetched && (
          <div className="mt-2.5 text-[13.5px] leading-[1.9]">
            <b className="text-[#17643a]">✓</b> 13 matcher
            <br />
            <b className="text-[#17643a]">✓</b> Svenska folket 1/X/2
            <br />
            <b className="text-[#17643a]">✓</b> Odds, omräknade till sannolikhetsprocent
            {live && ROUND.updated && (
              <>
                <br />
                <span className="text-[11px] text-muted">
                  Data från Svenska Spel, uppdaterad {new Date(ROUND.updated).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </>
            )}
          </div>
        )}
      </Card>

      {s.fetched && (
        <Card>
          <SecTitle>Omgångens matcher</SecTitle>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Match</th>
                <th>Folket</th>
                <th>Odds %</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {ROUND.matches.map((m, i) => {
                const d = diffOf(i)
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{m.name}</td>
                    <td>{m.folk.join(' / ')}</td>
                    <td>{m.odds.join(' / ')}</td>
                    <td>
                      <b>{d.total}</b>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Note className="mt-2">Diff = summan av |Svenska folket − oddsprocent| per tecken.</Note>
        </Card>
      )}

      <Banner>
        Omgångsdata (matcher, Svenska folket, odds) hämtas automatiskt från Svenska Spels öppna API
        flera gånger per dygn. Expertraderna fyller du i själv. Historiken och modellprocenten är
        fortfarande demonstrationsvärden tills databasen byggts upp på riktigt. Inofficiell
        prototyp utan koppling till Svenska Spel.
      </Banner>
    </>
  )
}
