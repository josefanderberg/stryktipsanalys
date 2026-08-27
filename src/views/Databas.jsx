import { useEffect, useState } from 'react'
import { useApp } from '../store.jsx'
import { GAMES } from '../lib/data.js'
import { Card, SecTitle, Note, Cta, Summary, Banner } from '../components/ui.jsx'

export default function Databas() {
  const { newRound, toast } = useApp()
  // null = laddar · false = gick inte att nå
  const [cloud, setCloud] = useState(null)

  useEffect(() => {
    let alive = true
    import('../lib/db.js')
      .then(async ({ loadCol }) => {
        const [stryk, euro, nille] = await Promise.all([
          loadCol('stryktipset'),
          loadCol('europatipset'),
          loadCol('nille'),
        ])
        return { stryk, euro, nille }
      })
      .then((r) => alive && setCloud(r))
      .catch(() => alive && setCloud(false))
    return () => {
      alive = false
    }
  }, [])

  const rows =
    cloud && cloud !== false
      ? [
          ...cloud.stryk.map((r) => ({ ...r, spel: 'S' })),
          ...cloud.euro.map((r) => ({ ...r, spel: 'E' })),
        ].sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))
      : []
  const tot = rows.reduce((s, r) => s + (r.matcher ?? 13), 0)
  const nilleCount = cloud && cloud !== false ? cloud.nille.length : 0

  return (
    <>
      <Summary
        title="DATABAS"
        items={[
          { label: 'Sparade omgångar', value: cloud === null ? '…' : String(rows.length) },
          { label: 'Matcher i databasen', value: cloud === null ? '…' : String(tot) },
          {
            label: 'Lagring',
            value: cloud === null ? 'Hämtar…' : cloud === false ? 'Offline' : '☁ Firestore',
            sub: cloud === false ? 'Molndatabasen svarade inte' : 'Delad mellan alla enheter',
          },
          { label: 'NILLE-rader', value: cloud === null ? '…' : String(nilleCount) },
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-[11px]">
        <div className="bg-white rounded-[13px] p-2.5 shadow-[0_2px_8px_#0001] text-center border-t-4 border-[#255c91]">
          <b className="block text-[12.5px]">Stryktipset</b>
          <span className="text-[11px] text-muted">6-expertmönster · primär databas</span>
        </div>
        <div className="bg-white rounded-[13px] p-2.5 shadow-[0_2px_8px_#0001] text-center border-t-4 border-[#2f9e59]">
          <b className="block text-[12.5px]">Europatipset</b>
          <span className="text-[11px] text-muted">3-expertmönster · primär databas</span>
        </div>
        <div className="bg-white rounded-[13px] p-2.5 shadow-[0_2px_8px_#0001] text-center border-t-4 border-[#6d35c5]">
          <b className="block text-[12.5px]">NILLE</b>
          <span className="text-[11px] text-muted">Personlig databas · misstag & träffar</span>
        </div>
      </div>

      <Card>
        <SecTitle>Sparade omgångar</SecTitle>
        {cloud === null && <Note>Hämtar från molndatabasen…</Note>}
        {cloud === false && (
          <Note>Kunde inte nå molndatabasen just nu – försök igen om en stund.</Note>
        )}
        {cloud && cloud !== false && rows.length === 0 && (
          <Note>
            Databasen är tom ännu. Gå igenom flödet Start → Experter → Analys → Min rad → Resultat
            och tryck <b>Spara i databas</b> när omgången är rättad – då läggs 13 matcher till här.
          </Note>
        )}
        {rows.length > 0 && (
          <div className="tbl-wrap"><table className="tbl">
            <thead>
              <tr><th>Datum</th><th>Spel</th><th>Matcher</th><th>Rätt</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.date || '–'}</td>
                  <td>{r.spel}</td>
                  <td>{r.matcher ?? 13}</td>
                  <td>{r.ratt != null ? `${r.ratt}/13` : '–'}</td>
                  <td>Klar</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <Note className="mt-2">
          Per match sparas: datum · match · expertrader · normaliserat expertmönster · Svenska
          folket 1/X/2 · oddsprocent 1/X/2 · differensprofil · differensintervall · faktiskt
          resultat · din rad. {GAMES.stryktipset.label} och {GAMES.europatipset.label} hålls i
          separata databaser, och NILLE-raderna i en egen.
        </Note>
      </Card>

      <Card>
        <SecTitle>Därför växer värdet</SecTitle>
        <Note className="!text-[12.5px]">
          Varje omgång ger 13 nya datapunkter. Efter 100 kuponger finns 1 300 matcher, efter 500
          kuponger 6 500. Modellen räknar redan nu på den riktiga historiken – ju mer ni sparar,
          desto större vikt får mönstren jämfört med oddsen.
        </Note>
      </Card>

      <Banner>
        Analysprocenten bygger på databasens faktiska innehåll. Med litet underlag väger
        oddsen tyngst – det redovisas öppet i varje matchanalys.
      </Banner>

      <Cta
        tone="blue"
        onClick={() => {
          newRound()
          toast('Ny omgång – databasen behålls')
        }}
      >
        Starta ny omgång
      </Cta>
    </>
  )
}
