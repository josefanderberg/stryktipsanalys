import { useEffect, useState } from 'react'
import { useApp } from '../store.jsx'
import { Card, SecTitle, Note, Cta, Summary, Banner } from '../components/ui.jsx'

export default function Databas() {
  const { db, newRound, toast } = useApp()
  // null = laddar · false = gick inte att nå · [] = tomt
  const [cloud, setCloud] = useState(null)
  useEffect(() => {
    let alive = true
    import('../lib/db.js')
      .then(({ loadRoundsFromCloud }) => loadRoundsFromCloud())
      .then((r) => alive && setCloud(r))
      .catch(() => alive && setCloud(false))
    return () => {
      alive = false
    }
  }, [])

  const cloudRows = Array.isArray(cloud)
    ? cloud.map((r) => ({
        datum: r.date || r.datum || '–',
        spel: r.game === 'europatipset' ? 'E' : 'S',
        matcher: r.matcher ?? 13,
        ratt: r.ratt,
      }))
    : null
  const rows = cloudRows ?? db.rounds.map((r) => ({ ...r, spel: 'S' }))
  const tot = rows.reduce((s, r) => s + r.matcher, 0)

  return (
    <>
      <Summary
        title="DATABAS"
        items={[
          { label: 'Sparade omgångar', value: String(rows.length) },
          { label: 'Matcher i databasen', value: String(tot) },
          {
            label: 'Lagring',
            value: cloud === null ? 'Hämtar…' : cloudRows ? '☁ Firestore' : 'Lokalt (offline)',
            sub: cloudRows ? 'Delad mellan alla enheter' : cloud === false ? 'Molndatabasen svarade inte' : '',
          },
          { label: 'Datapunkter per omgång', value: '13 matcher' },
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-[11px]">
        <div className="bg-white rounded-[13px] p-2.5 shadow-[0_2px_8px_#0001] text-center">
          <b className="block text-[12.5px]">Stryktipset</b>
          <span className="text-[11px] text-muted">6-expertmönster · primär databas</span>
        </div>
        <div className="bg-white rounded-[13px] p-2.5 shadow-[0_2px_8px_#0001] text-center">
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
        <div className="tbl-wrap"><table className="tbl">
          <thead>
            <tr><th>Datum</th><th>Spel</th><th>Matcher</th><th>Rätt</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.slice().reverse().map((r, i) => (
              <tr key={i}>
                <td>{r.datum}</td>
                <td>{r.spel}</td>
                <td>{r.matcher}</td>
                <td>{r.ratt != null ? `${r.ratt}/13` : '–'}</td>
                <td>Klar</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {cloudRows && cloudRows.length === 0 && (
          <Note className="mt-2">Molndatabasen är tom ännu – spara din första omgång under 5 · Resultat.</Note>
        )}
        <Note className="mt-2">
          Per match sparas i Firestore: datum · match · expertrader · normaliserat expertmönster ·
          Svenska folket 1/X/2 · oddsprocent 1/X/2 · differensprofil · differensintervall ·
          faktiskt resultat · din rad.
        </Note>
      </Card>

      <Card>
        <SecTitle>Därför växer värdet</SecTitle>
        <Note className="!text-[12.5px]">
          Varje omgång ger 13 nya datapunkter. Efter 100 kuponger finns 1 300 matcher, efter 500
          kuponger 6 500. Först då går det att se vilka expertmönster som har prediktivt värde och
          vilka som mest är brus – och att kalibrera modellens vikter mot verkliga resultat.
        </Note>
      </Card>

      <Banner>
        Procenten i prototypen är demonstrationsvärden och ska inte ses som kalibrerade
        vinstsannolikheter.
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
