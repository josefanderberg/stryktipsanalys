import { useApp } from '../store.jsx'
import { ROUND, GAMES } from '../lib/data.js'
import { diffOf } from '../lib/model.js'
import { Card, SecTitle, Note, Cta, Banner, NrBadge } from '../components/ui.jsx'

export default function Start() {
  const { s, show, fetchRound, setGame } = useApp()
  const cfg = GAMES[s.game]
  const live = s.roundData && ROUND.source === 'live'

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-[11px]">
        {Object.entries(GAMES).map(([key, g]) => (
          <button
            key={key}
            onClick={() => setGame(key)}
            className={`rounded-[13px] p-2.5 text-center border-2 bg-white shadow-[0_2px_8px_#0001] ${
              s.game === key ? 'border-go bg-[#f3fbf5]' : 'border-transparent'
            }`}
          >
            <span
              className={`mx-auto mb-1.5 w-9 h-9 rounded-full text-white flex items-center justify-center font-black text-lg ${
                key === 'stryktipset' ? 'bg-go' : 'bg-[#1f5eb0]'
              }`}
            >
              {g.label[0]}
            </span>
            <b className="block text-[12px] leading-tight">{g.label.toUpperCase()}</b>
            <span className="text-[11px] text-muted">{g.experts} expertrader</span>
          </button>
        ))}
        <button
          onClick={() => show('nille')}
          className="rounded-[13px] p-2.5 text-center border-2 border-[#d9c9f5] bg-white shadow-[0_2px_8px_#0001]"
        >
          <span className="mx-auto mb-1.5 w-9 h-9 rounded-full text-white flex items-center justify-center font-black text-lg bg-[#6d35c5]">
            N
          </span>
          <b className="block text-[12px] leading-tight">NILLE-ANALYSEN</b>
          <span className="text-[11px] text-muted">Din personliga rad</span>
        </button>
      </div>

      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Ny {cfg.label}somgång</h2>
        <Note className="mt-0 mb-3">
          {live ? ROUND.label : `Hämta aktuell omgång från Svenska Spel · ${cfg.experts} expertrader`}
        </Note>
        <SecTitle>Källa</SecTitle>
        <input
          type="text"
          readOnly
          value={cfg.url}
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
                  Data från Svenska Spel, uppdaterad{' '}
                  {new Date(ROUND.updated).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </>
            )}
          </div>
        )}
      </Card>

      {s.fetched && (
        <Card>
          <SecTitle>Omgångens matcher</SecTitle>
          {ROUND.matches.map((m, i) => {
            const d = diffOf(i)
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 py-2 border-b border-line last:border-b-0"
              >
                <NrBadge n={i + 1} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] leading-snug">{m.name}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Folket {m.folk.join('/')} · Odds {m.odds.join('/')} · Diff{' '}
                    <b className="text-ink">{d.total}</b>
                  </div>
                </div>
              </div>
            )
          })}
          <Note className="mt-2">Diff = summan av |Svenska folket − oddsprocent| per tecken.</Note>
        </Card>
      )}

      <Card>
        <b className="text-[13.5px]">↔ Databaserna hjälper varandra</b>
        <Note className="mt-1">
          Valt spel används alltid primärt. Jämförbar historik från {cfg.otherLabel} används bara
          som sekundärt stöd när underlaget är litet – du ser det som en egen signal i
          matchanalysen.
        </Note>
      </Card>

      <Banner>
        Omgångsdata (matcher, Svenska folket, odds) hämtas automatiskt från Svenska Spels öppna API
        flera gånger per dygn. Expertraderna fyller du i själv. Historiken och modellprocenten är
        fortfarande demonstrationsvärden tills databasen byggts upp på riktigt. Inofficiell
        prototyp utan koppling till Svenska Spel.
      </Banner>
    </>
  )
}
