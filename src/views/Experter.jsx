import { useApp } from '../store.jsx'
import { ROUND, SIGNS, GAMES } from '../lib/data.js'
import { expertFilled, filledCount } from '../lib/model.js'
import { Card, Note, Cta, Coupon, CouponRow } from '../components/ui.jsx'

export default function Experter() {
  const { s, set, show } = useApp()

  if (!s.fetched || !ROUND.matches) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Expertrader</h2>
        <Note>
          Hämta först omgången under <b>Start</b>.
        </Note>
        <Cta tone="blue" onClick={() => show('start')}>
          Till start
        </Cta>
      </Card>
    )
  }

  const ei = s.currentExpert

  const togglePick = (mi, si) => {
    set((prev) => {
      const experts = prev.experts.map((e, x) =>
        x !== ei
          ? e
          : e.map((c, m) => {
              if (m !== mi) return c
              const sign = SIGNS[si]
              return c.includes(sign) ? c.filter((v) => v !== sign) : [...c, sign]
            }),
      )
      return { experts, rad: null, saved: false }
    })
  }

  return (
    <Card>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1.5 mb-2">
        {s.experts.map((_, i) => (
          <button
            key={i}
            onClick={() => set({ currentExpert: i })}
            className={`shrink-0 min-w-[86px] border-0 rounded-[20px] px-2.5 py-2 font-bold text-[12.5px] ${
              i === ei
                ? 'bg-royal text-white'
                : expertFilled(s.experts, i)
                  ? 'bg-[#e7edf3] text-[#153b61] shadow-[inset_0_0_0_2px_#45aa69]'
                  : 'bg-[#e7edf3] text-[#153b61]'
            }`}
          >
            Expert {i + 1}
            {expertFilled(s.experts, i) ? ' ✓' : ''}
          </button>
        ))}
      </div>

      <Coupon
        title={`${GAMES[s.game].label.toUpperCase()} · EXPERTRAD ${ei + 1}`}
        sub={`${filledCount(s.experts, ei)}/13`}
      >
        {ROUND.matches.map((m, mi) => (
          <CouponRow
            key={mi}
            nr={mi + 1}
            name={m.name}
            active={s.experts[ei][mi].map((sign) => SIGNS.indexOf(sign))}
            onPick={(si) => togglePick(mi, si)}
          />
        ))}
      </Coupon>

      <Note className="mt-2">
        Klicka i tecknen från expertens rad – enkel, halvgarderad (t.ex. 1X) eller helgarderad
        (1X2). Ordningen på experterna spelar ingen roll: systemet räknar om raderna till ett
        expertmönster per match.
      </Note>
    </Card>
  )
}
