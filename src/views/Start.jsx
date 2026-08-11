import { useApp } from '../store.jsx'
import { MATCHES, ROUND_LABEL } from '../lib/data.js'
import { diffOf } from '../lib/model.js'
import { Card, SecTitle, Note, Cta, Banner } from '../components/ui.jsx'

export default function Start() {
  const { s, set, toast } = useApp()
  return (
    <>
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Ny Stryktipsomgång</h2>
        <Note className="mt-0 mb-3">{ROUND_LABEL}</Note>
        <SecTitle>Länk till aktuell Stryktipskupong</SecTitle>
        <input
          type="text"
          readOnly
          value="spela.svenskaspel.se/stryktipset"
          className="w-full border-2 border-line rounded-[9px] p-[11px] text-sm bg-[#fafcfe] box-border"
        />
        <Cta
          tone="blue"
          onClick={() => {
            set({ fetched: true })
            toast('Omgång hämtad (demo)')
          }}
        >
          HÄMTA OMGÅNG
        </Cta>
        {s.fetched && (
          <div className="mt-2.5 text-[13.5px] leading-[1.9]">
            <b className="text-[#17643a]">✓</b> 13 matcher
            <br />
            <b className="text-[#17643a]">✓</b> Svenska folket 1/X/2
            <br />
            <b className="text-[#17643a]">✓</b> Odds, omräknade till sannolikhetsprocent
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
              {MATCHES.map((m, i) => {
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
        I prototypen används demodata. Automatisk hämtning från Svenska Spel (omgång och resultat)
        byggs i ett senare steg – först behöver deras användarvillkor och datakällor kontrolleras.
      </Banner>
    </>
  )
}
