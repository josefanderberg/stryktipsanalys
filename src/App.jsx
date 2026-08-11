import { useApp } from './store.jsx'
import { ROUND } from './lib/data.js'
import { allFilled, expertFilled } from './lib/model.js'
import Start from './views/Start.jsx'
import Experter from './views/Experter.jsx'
import Analys from './views/Analys.jsx'
import MatchDetail from './views/MatchDetail.jsx'
import Rad from './views/Rad.jsx'
import Resultat from './views/Resultat.jsx'
import Databas from './views/Databas.jsx'

const STEPS = [
  { id: 'start', label: '1 · Start' },
  { id: 'experter', label: '2 · Experter' },
  { id: 'analys', label: '3 · Analys' },
  { id: 'rad', label: '4 · Min rad' },
  { id: 'resultat', label: '5 · Resultat' },
  { id: 'databas', label: 'Databas' },
]

function Steps() {
  const { s, show } = useApp()
  const active = s.view === 'match' ? 'analys' : s.view
  const done = (id) =>
    id === 'start' ? s.fetched
    : id === 'experter' ? allFilled(s.experts)
    : id === 'rad' ? !!s.rad
    : id === 'resultat' ? s.saved
    : false
  return (
    <nav className="flex gap-1.5 overflow-x-auto px-2.5 pt-2.5 pb-1 max-w-[760px] mx-auto">
      {STEPS.map((st) => (
        <button
          key={st.id}
          onClick={() => show(st.id)}
          className={`shrink-0 border-0 rounded-[18px] px-3 py-[7px] font-bold text-xs shadow-[0_1px_4px_#0001] ${
            st.id === active
              ? 'bg-royal text-white'
              : done(st.id)
                ? 'bg-[#dff0e5] text-[#17643a]'
                : 'bg-white text-[#153b61]'
          }`}
        >
          {st.label}
          {done(st.id) ? ' ✓' : ''}
        </button>
      ))}
    </nav>
  )
}

function BottomBar() {
  const { s, show, set, toast, db, setDb, newRound } = useApp()
  const btn = 'flex-1 border-0 rounded-[9px] px-2 py-3 font-bold text-[13.5px] bg-go text-white disabled:bg-[#c8d2da] disabled:text-[#f2f5f7]'
  const sec = 'flex-1 border-0 rounded-[9px] px-2 py-3 font-bold text-[13.5px] bg-[#e7eef5] text-[#153b61]'
  const filled = allFilled(s.experts)

  const nextExpert = () => {
    if (s.currentExpert < 5) {
      set({ currentExpert: s.currentExpert + 1 })
      window.scrollTo(0, 0)
    } else show('analys')
  }
  const saveRound = () => {
    if (s.saved) return
    const hits = s.results.filter((r, i) => s.rad[i].includes(r)).length
    setDb({ rounds: [...db.rounds, { datum: ROUND.date || '–', matcher: 13, ratt: hits }] })
    set({ saved: true })
    toast('13 datapunkter sparade i databasen')
  }

  let content
  if (s.view === 'start') {
    content = (
      <button className={btn} disabled={!s.fetched} onClick={() => show('experter')}>
        Fortsätt till experterna ›
      </button>
    )
  } else if (s.view === 'experter') {
    const last = s.currentExpert === 5
    content = (
      <>
        <button className={sec} onClick={() => show('start')}>‹ Start</button>
        {last ? (
          <button className={btn} disabled={!filled} onClick={() => show('analys')}>
            ANALYSERA KUPONGEN
          </button>
        ) : (
          <button className={btn} disabled={!expertFilled(s.experts, s.currentExpert)} onClick={nextExpert}>
            Nästa expertrad ›
          </button>
        )}
      </>
    )
  } else if (s.view === 'analys') {
    content = (
      <>
        <button className={sec} onClick={() => show('experter')}>‹ Experter</button>
        <button className={btn} disabled={!filled} onClick={() => show('rad')}>Bygg min rad ›</button>
      </>
    )
  } else if (s.view === 'match') {
    content = (
      <>
        <button className={sec} onClick={() => show('analys')}>‹ Kuponganalysen</button>
        <button className={btn} onClick={() => show('rad')}>Bygg min rad ›</button>
      </>
    )
  } else if (s.view === 'rad') {
    content = (
      <>
        <button className={sec} onClick={() => show('analys')}>‹ Analys</button>
        <button className={btn} disabled={!s.rad} onClick={() => show('resultat')}>Till resultat ›</button>
      </>
    )
  } else if (s.view === 'resultat') {
    const all = s.rad && s.results.every((r) => r !== null)
    content = (
      <>
        <button className={sec} onClick={() => show('rad')}>‹ Min rad</button>
        <button className={btn} disabled={!all || s.saved} onClick={saveRound}>
          {s.saved ? 'SPARAT ✓' : 'SPARA I DATABAS'}
        </button>
      </>
    )
  } else {
    content = (
      <>
        <button className={sec} onClick={() => show('resultat')}>‹ Resultat</button>
        <button className={btn} onClick={() => { newRound(); toast('Ny omgång – databasen behålls') }}>
          Starta ny omgång
        </button>
      </>
    )
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 bg-white border-t border-line flex gap-2 px-2.5 pt-2 z-30"
      style={{ paddingBottom: 'calc(9px + env(safe-area-inset-bottom))' }}
    >
      {content}
    </div>
  )
}

function Toast() {
  const { toastMsg } = useApp()
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 bg-night text-white rounded-[20px] px-4 py-2 text-[13px] font-bold z-40 transition-opacity duration-300 pointer-events-none ${
        toastMsg ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ bottom: 'calc(74px + env(safe-area-inset-bottom))' }}
    >
      {toastMsg}
    </div>
  )
}

const VIEW_MAP = {
  start: Start,
  experter: Experter,
  analys: Analys,
  match: MatchDetail,
  rad: Rad,
  resultat: Resultat,
  databas: Databas,
}

export default function App() {
  const { s } = useApp()
  const View = VIEW_MAP[s.view] || Start
  return (
    <>
      <header className="bg-navy text-white px-3.5 pt-4 pb-3 sticky top-0 z-20">
        <h1 className="m-0 text-[21px] font-bold">Stryktipsanalys</h1>
        <p className="m-0 mt-1 text-xs opacity-85">
          {s.roundData ? ROUND.label : 'Prototyp · hämta omgången under Start'}
        </p>
      </header>
      <Steps />
      <main className="max-w-[760px] mx-auto px-2.5 pt-1.5 pb-[108px]">
        <View />
      </main>
      <BottomBar />
      <Toast />
    </>
  )
}
