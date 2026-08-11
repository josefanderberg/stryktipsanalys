import { useEffect } from 'react'
import { useApp } from '../store.jsx'
import { MATCHES, SIGNS, ROUND_DATE } from '../lib/data.js'
import { allFilled, buildRad, radCost, radCounts, recFor, signStr } from '../lib/model.js'
import { Card, SecTitle, Note, Cta, DetailBtn, Coupon, CouponRow, NrBadge } from '../components/ui.jsx'

export default function Rad() {
  const { s, set, show, toast } = useApp()
  const filled = allFilled(s.experts)

  useEffect(() => {
    if (filled && !s.rad) set({ rad: buildRad(s.experts, s.budget) })
  }, [filled, s.rad]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!filled) {
    return (
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Min rad</h2>
        <Note>Fyll i alla sex expertrader och analysera kupongen först.</Note>
        <Cta tone="blue" onClick={() => show('experter')}>Till expertraderna</Cta>
      </Card>
    )
  }
  if (!s.rad) return null

  const cost = radCost(s.rad)
  const c = radCounts(s.rad)
  const over = cost > s.budget

  const radToggle = (mi, si) => {
    const sel = s.rad[mi]
    if (sel.includes(si) && sel.length === 1) {
      toast('Minst ett tecken per match')
      return
    }
    set((prev) => ({
      rad: prev.rad.map((r, i) =>
        i !== mi ? r : r.includes(si) ? r.filter((x) => x !== si) : [...r, si].sort((a, b) => a - b),
      ),
      saved: false,
    }))
  }

  const copyRad = () => {
    const txt =
      `STRYKTIPSET ${ROUND_DATE} – MIN RAD\n` +
      MATCHES.map((m, i) => `${i + 1}. ${m.name}: ${signStr(s.rad[i])}`).join('\n') +
      `\nSystempris: ${cost} kr · Spikar ${c.spik} · Halva ${c.halv} · Hela ${c.hel}`
    const done = () => toast('Raden kopierad – klistra in hos Svenska Spel')
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = txt
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        done()
      } catch {
        toast('Kunde inte kopiera')
      }
      document.body.removeChild(ta)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(done, fallback)
    else fallback()
  }

  return (
    <>
      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">Budget</h2>
        <SecTitle>Hur mycket vill du spela för?</SecTitle>
        <div className="flex gap-[7px] flex-wrap mt-2">
          {[96, 144, 288, 432, 576].map((b) => (
            <button
              key={b}
              onClick={() => set({ budget: b, rad: buildRad(s.experts, b), saved: false })}
              className={`rounded-[9px] px-3 py-2 font-bold text-[13px] border-2 ${
                s.budget === b ? 'bg-royal border-royal text-white' : 'bg-white border-line text-[#153b61]'
              }`}
            >
              {b} kr
            </button>
          ))}
        </div>
        <Note className="mt-2">
          Systemet föreslår spikar, halv- och helgarderingar utifrån modellbedömningen så att
          systempriset ryms i budgeten (1 kr per rad). Ändra sedan valfria tecken nedan.
        </Note>
      </Card>

      <Card>
        <h2 className="m-0 mb-2 text-[17px] font-bold">MIN RAD – {s.budget} KR</h2>
        {MATCHES.map((m, i) => {
          const r = recFor(s.experts, i)
          const sel = s.rad[i]
          const tag =
            sel.length === 3
              ? 'Helgardering'
              : sel.length === 2
                ? 'Halvgardering'
                : r.type === 'SPIK' && sel[0] === r.signs[0]
                  ? '🔒 Spik'
                  : 'Spik'
          return (
            <div
              key={i}
              className="grid grid-cols-[30px_1fr_132px] gap-1.5 items-center px-2 py-2 border-b border-line last:border-b-0 text-[12.5px]"
            >
              <NrBadge n={i + 1} />
              <div>
                {m.name}
                <div className="text-[11px] text-muted">
                  {tag}
                  {r.skr !== null && sel.includes(r.skr) ? ' · 💥 skrälltecken med' : ''}
                </div>
              </div>
              <div className="flex gap-1 justify-end">
                {[0, 1, 2].map((si) => (
                  <button
                    key={si}
                    onClick={() => radToggle(i, si)}
                    className={`w-[38px] h-[33px] border-2 rounded-[5px] font-black text-sm ${
                      sel.includes(si)
                        ? 'bg-mark border-mark text-white'
                        : 'bg-[#fafafa] border-[#c6cdd3] text-[#b7bdc3]'
                    }`}
                  >
                    {SIGNS[si]}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="grid grid-cols-4 gap-[7px] mt-2.5">
          <div className={`rounded-[9px] px-1.5 py-2 text-center text-[11px] ${over ? 'bg-[#fde6e3]' : 'bg-[#e7eef5]'}`}>
            <b className={`block text-base ${over ? 'text-[#a02c21]' : 'text-navy'}`}>{cost} kr</b>
            <span className="text-muted">Systempris</span>
          </div>
          <div className="rounded-[9px] px-1.5 py-2 text-center text-[11px] bg-[#e7eef5]">
            <b className="block text-base text-navy">{c.spik}</b>
            <span className="text-muted">Spikar</span>
          </div>
          <div className="rounded-[9px] px-1.5 py-2 text-center text-[11px] bg-[#e7eef5]">
            <b className="block text-base text-navy">{c.halv}</b>
            <span className="text-muted">Halva</span>
          </div>
          <div className="rounded-[9px] px-1.5 py-2 text-center text-[11px] bg-[#e7eef5]">
            <b className="block text-base text-navy">{c.hel}</b>
            <span className="text-muted">Hela</span>
          </div>
        </div>
        {over && (
          <Note className="mt-2 !text-[#a02c21]">
            <b>Systempriset överstiger budgeten.</b> Ta bort garderingar eller höj budgeten.
          </Note>
        )}

        <DetailBtn
          onClick={() => {
            set({ rad: buildRad(s.experts, s.budget), saved: false })
            toast(`Raden optimerad efter ${s.budget} kr`)
          }}
        >
          Optimera om efter budget
        </DetailBtn>
        <Cta tone="blue" onClick={copyRad}>Kopiera rad</Cta>
      </Card>

      <Card>
        <SecTitle>Kupongvy</SecTitle>
        <Coupon title="STRYKTIPSET" sub={`${cost} rader`}>
          {MATCHES.map((m, i) => (
            <CouponRow
              key={i}
              nr={i + 1}
              name={m.name}
              active={s.rad[i]}
              onPick={(si) => radToggle(i, si)}
            />
          ))}
        </Coupon>
      </Card>
    </>
  )
}
