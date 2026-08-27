import { useApp } from '../store.jsx'
import { ROUND, SIGNS, GAMES } from '../lib/data.js'
import { allFilled, highlights, recFor, signStr } from '../lib/model.js'
import { Card, Note, Cta, Summary } from '../components/ui.jsx'

export default function Analys() {
  const { s, set, show } = useApp()

  if (!s.fetched || !ROUND.matches) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Kuponganalys</h2>
        <Note>Hämta först omgången under <b>Start</b>.</Note>
        <Cta tone="blue" onClick={() => show('start')}>Till start</Cta>
      </Card>
    )
  }
  if (!allFilled(s.experts)) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Kuponganalys</h2>
        <Note>Alla {GAMES[s.game].experts} expertrader måste vara ifyllda innan kupongen kan analyseras.</Note>
        <Cta tone="blue" onClick={() => show('experter')}>
          Till expertraderna
        </Cta>
      </Card>
    )
  }

  const hl = highlights(s.experts)
  const items = [
    { label: '🔥 Starkaste spik', value: `Match ${hl.spik.mi + 1} – ${SIGNS[hl.spik.sign]}`, sub: `${hl.spik.pct}% i modellen` },
    { label: '💎 Bästa värdetecken', value: `Match ${hl.varde.mi + 1} – ${SIGNS[hl.varde.sign]}`, sub: `Modellen ${hl.varde.model}% / Folket ${hl.varde.folk}%` },
    hl.skrall
      ? { label: '💥 Mest sannolika skräll', value: `Match ${hl.skrall.mi + 1} – ${SIGNS[hl.skrall.sign]}`, sub: `Modellen ${hl.skrall.model}% / Folket ${hl.skrall.folk}%` }
      : { label: '💥 Mest sannolika skräll', value: '–' },
    hl.farlig
      ? { label: '⚠️ Farlig favorit', value: `Match ${hl.farlig.mi + 1} – ${SIGNS[hl.farlig.sign]}`, sub: `Folket ${hl.farlig.folk}% / Modellen ${hl.farlig.model}%` }
      : { label: '⚠️ Farlig favorit', value: '–' },
    { label: '🤝 Störst expertenighet', value: `Match ${hl.enig + 1}` },
    { label: '⚔️ Störst expertoenighet', value: `Match ${hl.oenig + 1}` },
  ]

  return (
    <>
      <Summary title="KUPONGANALYS" items={items} />

      <div className="rounded-[13px] overflow-hidden bg-white shadow-[0_2px_8px_#0001] mb-[11px]">
        {ROUND.matches.map((m, i) => {
          const r = recFor(s.experts, i)
          const badges = [
            hl.spik.mi === i ? '🔥' : '',
            hl.varde.mi === i ? '💎' : '',
            hl.skrall && hl.skrall.mi === i ? '💥' : '',
            hl.farlig && hl.farlig.mi === i ? '⚠️' : '',
          ].join('')
          return (
            <button
              key={i}
              onClick={() => {
                set({ detail: i })
                show('match')
              }}
              className="w-full grid grid-cols-[30px_1fr_auto_52px_16px] gap-1.5 items-center px-2.5 py-[11px] border-0 border-b border-line last:border-b-0 bg-white text-left text-[13px] border-solid"
            >
              <span className="w-6 h-6 rounded-md bg-royal text-white flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="leading-snug">
                {m.name} <span className="text-xs">{badges}</span>
              </span>
              <span className="font-black text-navy text-sm whitespace-nowrap">{signStr(r.signs)}</span>
              <span className="font-bold text-right text-[#17643a]">{r.score[r.ord[0]]}%</span>
              <span className="text-[#b7bdc3] font-bold">›</span>
            </button>
          )
        })}
      </div>

      <Note>
        Tryck på en match för full analys: expertmönster, generell historik, dagens differens,
        historik per differensintervall, liknande mönster och modellbedömning.
      </Note>
    </>
  )
}
