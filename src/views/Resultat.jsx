import { useApp } from '../store.jsx'
import { ROUND, SIGNS } from '../lib/data.js'
import { signStr } from '../lib/model.js'
import { Card, Note, Cta, Summary, Banner, NrBadge } from '../components/ui.jsx'

export default function Resultat() {
  const { s, set, show, fetchResults } = useApp()

  if (!s.rad || !ROUND.matches) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Resultat</h2>
        <Note>Bygg din rad först – resultaten rättas mot den.</Note>
        <Cta tone="blue" onClick={() => show(ROUND.matches ? 'rad' : 'start')}>
          {ROUND.matches ? 'Till min rad' : 'Till start'}
        </Cta>
      </Card>
    )
  }

  const all = s.results.every((r) => r !== null)
  const hits = all ? s.results.filter((r, i) => s.rad[i].includes(r)).length : null

  const setResult = (mi, si) =>
    set((prev) => ({
      results: prev.results.map((r, i) => (i === mi ? (r === si ? null : si) : r)),
      saved: false,
    }))

  return (
    <>
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Resultat</h2>
        <Note className="mt-0">
          Resultatet hämtas från Svenska Spel när omgången är färdigspelad ({ROUND.date}).
        </Note>
        <Cta tone="blue" onClick={fetchResults}>
          HÄMTA RESULTAT
        </Cta>
        <Note className="mt-2">Du kan också rätta manuellt genom att trycka på tecknen nedan.</Note>
      </Card>

      <Card>
        {ROUND.matches.map((m, i) => {
          const res = s.results[i]
          const hit = res !== null && s.rad[i].includes(res)
          return (
            <div
              key={i}
              className="grid grid-cols-[30px_1fr_132px_26px] gap-1.5 items-center px-2 py-2 border-b border-line last:border-b-0 text-[12.5px]"
            >
              <NrBadge n={i + 1} />
              <div>
                {m.name}
                <div className="text-[11px] text-muted">Min rad: {signStr(s.rad[i])}</div>
              </div>
              <div className="flex gap-1 justify-end">
                {[0, 1, 2].map((si) => (
                  <button
                    key={si}
                    onClick={() => setResult(i, si)}
                    className={`w-[38px] h-[33px] border-2 rounded-[5px] font-black text-sm ${
                      res === si
                        ? 'bg-navy border-navy text-white'
                        : 'bg-[#fafafa] border-[#c6cdd3] text-[#b7bdc3]'
                    }`}
                  >
                    {SIGNS[si]}
                  </button>
                ))}
              </div>
              <span className={`font-black ${res === null ? '' : hit ? 'text-go' : 'text-mark'}`}>
                {res === null ? '' : hit ? '✓' : '✗'}
              </span>
            </div>
          )
        })}
      </Card>

      {all && (
        <Summary
          title={`${hits} rätt av 13`}
          items={[
            { label: 'Sparas per match', value: 'Expertmönster + differens + resultat' },
            { label: 'Nya datapunkter', value: '13 matcher' },
          ]}
        />
      )}

      {s.saved && (
        <Banner tone="ok">
          <b>Sparat i databasen.</b> Omgången ligger nu i historiken – 13 nya datapunkter till
          kommande analyser.
        </Banner>
      )}
    </>
  )
}
