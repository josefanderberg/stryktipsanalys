import { SIGNS } from '../lib/data.js'

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[13px] p-[13px] mb-[11px] shadow-[0_2px_8px_#0001] ${className}`}>
    {children}
  </div>
)

export const SecTitle = ({ children, className = '' }) => (
  <div className={`text-[11px] tracking-[.09em] font-bold text-muted uppercase mb-2 ${className}`}>
    {children}
  </div>
)

export const Note = ({ children, className = '' }) => (
  <p className={`text-[11px] text-muted leading-relaxed ${className}`}>{children}</p>
)

const chipTones = {
  green: 'bg-[#e2f1e6] text-[#17643a]',
  blue: 'bg-[#e3ecf6] text-[#153b61]',
  red: 'bg-[#fde6e3] text-[#a02c21]',
  gold: 'bg-[#fbf0da] text-[#8a6414]',
}
export const Chip = ({ tone = 'green', children }) => (
  <span className={`inline-block rounded-[20px] px-2.5 py-1 font-bold text-[12.5px] ${chipTones[tone]}`}>
    {children}
  </span>
)

const ctaTones = {
  green: 'bg-go text-white',
  blue: 'bg-royal text-white',
  gray: 'bg-[#e7eef5] text-[#153b61]',
}
export const Cta = ({ tone = 'green', disabled, onClick, children, className = '' }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`block w-full border-0 rounded-[10px] p-[13px] font-bold text-[14.5px] mt-2.5 disabled:bg-[#c8d2da] disabled:text-[#f2f5f7] ${ctaTones[tone]} ${className}`}
  >
    {children}
  </button>
)

export const DetailBtn = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="w-full border-0 bg-[#e7eef5] text-[#153b61] rounded-lg p-2.5 font-bold text-[13px] mt-2"
  >
    {children}
  </button>
)

export const Track = ({ pct, dark }) => (
  <div className={`h-3 rounded-full overflow-hidden ${dark ? 'bg-[#34414d]' : 'bg-[#dfe6ec]'}`}>
    <span
      className={`block h-full ${dark ? 'bg-gold' : 'bg-royal'}`}
      style={{ width: `${pct}%` }}
    />
  </div>
)

export const NrBadge = ({ n }) => (
  <span className="w-6 h-6 rounded-md bg-royal text-white flex items-center justify-center text-xs font-bold shrink-0">
    {n}
  </span>
)

export const Banner = ({ tone = 'warn', children }) => (
  <div
    className={`rounded-[10px] px-3 py-2.5 text-[12.5px] leading-relaxed mb-[11px] border ${
      tone === 'ok'
        ? 'bg-[#e2f1e6] border-[#bfe0c9] text-[#17643a]'
        : 'bg-[#fdf3e3] border-[#f0d9a8] text-[#7a5b16]'
    }`}
  >
    {children}
  </div>
)

export const Summary = ({ title, items }) => (
  <div className="bg-gradient-to-br from-[#153b61] to-royal text-white rounded-[13px] p-3.5 mb-[11px]">
    <h2 className="m-0 mb-2.5 text-lg font-bold">{title}</h2>
    <div className="grid grid-cols-2 gap-2">
      {items.map((it, i) => (
        <div key={i} className="bg-white/10 border border-white/15 rounded-[9px] px-2.5 py-2 text-xs">
          <small className="block opacity-80 text-[11px] mb-0.5">{it.label}</small>
          <b className="block text-sm">{it.value}</b>
          {it.sub && <span className="opacity-90">{it.sub}</span>}
        </div>
      ))}
    </div>
  </div>
)

// Kupongrad i Bettingstugan-stil: nr-ruta, matchnamn, tre teckenknappar
export function CouponRow({ nr, name, active, onPick, variant = 'mark' }) {
  const on =
    variant === 'mark'
      ? 'bg-mark border-mark text-white'
      : 'bg-navy border-navy text-white'
  return (
    <div className="grid grid-cols-[34px_1fr_43px_43px_43px] items-center min-h-[50px] border-t border-[#adb6be]">
      <div className="w-7 h-[34px] ml-1 bg-royal text-white flex items-center justify-center text-[13px] font-bold">
        {nr}
      </div>
      <div className="text-[12.5px] px-1.5 leading-snug">{name}</div>
      {SIGNS.map((s, si) => (
        <button
          key={s}
          onClick={() => onPick(si)}
          className={`h-9 mx-0.5 my-1 border-2 rounded-[3px] font-black text-[17px] ${
            active.includes(si) ? on : 'bg-[#fafafa] border-[#c6cdd3] text-[#b7bdc3]'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

export const Coupon = ({ title, sub, children }) => (
  <div className="border-4 border-navy bg-white rounded-md overflow-hidden">
    <div className="bg-royal text-white px-3 py-[11px] font-black text-lg flex justify-between items-center">
      <span>{title}</span>
      {sub && <small className="text-xs font-bold opacity-90">{sub}</small>}
    </div>
    {children}
  </div>
)
