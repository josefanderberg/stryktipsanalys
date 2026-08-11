import { useApp } from '../store.jsx'
import { Card, SecTitle, Note, Cta, Summary, Banner } from '../components/ui.jsx'

export default function Databas() {
  const { db, newRound, toast } = useApp()
  const tot = db.rounds.reduce((s, r) => s + r.matcher, 0)

  return (
    <>
      <Summary
        title="DATABAS"
        items={[
          { label: 'Sparade omgångar', value: String(db.rounds.length) },
          { label: 'Matcher i databasen', value: String(tot) },
        ]}
      />

      <Card>
        <SecTitle>Sparade omgångar</SecTitle>
        <div className="tbl-wrap"><table className="tbl">
          <thead>
            <tr><th>Datum</th><th>Matcher</th><th>Rätt</th><th>Status</th></tr>
          </thead>
          <tbody>
            {db.rounds.slice().reverse().map((r, i) => (
              <tr key={i}>
                <td>{r.datum}</td>
                <td>{r.matcher}</td>
                <td>{r.ratt != null ? `${r.ratt}/13` : '–'}</td>
                <td>Klar</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Note className="mt-2">
          Per match sparas: datum · match · sex expertrader · normaliserat expertmönster · Svenska
          folket 1/X/2 · oddsprocent 1/X/2 · differensprofil · differensintervall · faktiskt
          resultat.
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
