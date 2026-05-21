/* global React, ReactDOM */
/* global Icon, useLocalState, todayISO */
/* global WeekView, MonthView, QuarterView, YearView, HabitsView, BucketListView */
/* global TweaksPanel, useTweaks, TweakSection, TweakToggle, TweakText */
const { useState, useEffect, useMemo } = React;

const DASH_DEFAULTS = /*EDITMODE-BEGIN*/{
  "name": "Lamide",
  "accentOnGreeting": true,
  "showQuote": true,
  "defaultView": "week"
}/*EDITMODE-END*/;

const VIEWS = [
  { id: 'week',    label: 'Week' },
  { id: 'month',   label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'habits',  label: 'Habits' },
  { id: 'year',    label: 'Year' },
  { id: 'bucket',  label: 'Goals' },
];

// ============================================================
// Sidebar rail
// ============================================================
function Rail({ activeView, onViewChange, showQuote, counts, onOpenSettings }) {
  return (
    <aside className="rail">
      <div className="rail__brand">
        <span className="rail__brand-mark">L.</span>
        <span className="rail__brand-name">Daybook</span>
      </div>

      <div className="rail__group">
        <p className="rail__label">Views</p>
        {VIEWS.map(v => (
          <button
            key={v.id}
            className={`rail__item ${activeView === v.id ? 'is-active' : ''}`}
            onClick={() => onViewChange(v.id)}
          >
            <span className={`dot ${activeView === v.id ? 'is-on' : ''}`}></span>
            {v.label}
            {v.id === 'week' && counts.openTasks > 0 && (
              <span className="count">{counts.openTasks}</span>
            )}
            {v.id === 'habits' && counts.habitCount > 0 && (
              <span className="count">{counts.habitCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="rail__group">
        <p className="rail__label">More</p>
        <button className="rail__item" onClick={onOpenSettings}>
          <span style={{ width: 6 }}></span>
          Settings
        </button>
      </div>

      <div className="rail__footer">
        {showQuote && (
          <div className="rail__quote">
            Start saying more about what you're going through.
            <em>— Daily reminder</em>
          </div>
        )}
        <div>
          <strong>v1.1</strong> · Synced locally<br />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// Top bar — greeting + view tabs
// ============================================================
function partOfDay(h) {
  if (h < 5) return 'late night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

const VIEW_SUBLINES = {
  week:    "Here's your week at a glance.",
  month:   'Zoom out — your month in motion.',
  quarter: 'The big picture for this quarter.',
  year:    'Foundations for the year ahead.',
  habits:  'Daily habits and your weekly score.',
  bucket:  'Goals — short, mid, and long-term.',
};

function TopBar({ name, nowMinutes, accentOnGreeting, activeView, onViewChange, openTasks, doneToday }) {
  const now = new Date();
  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 5) return 'Still up';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Easy night';
  }, [Math.floor(nowMinutes / 30)]);

  const h = now.getHours();
  const m = now.getMinutes();
  const h12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'PM' : 'AM';

  const sub = activeView === 'week'
    ? (openTasks > 0
        ? `You have ${openTasks} task${openTasks === 1 ? '' : 's'} open${doneToday > 0 ? ` — ${doneToday} already done this ${partOfDay(h)}.` : '.'}`
        : `All caught up. Enjoy this ${partOfDay(h)}.`)
    : VIEW_SUBLINES[activeView];

  return (
    <header className="topbar">
      <div className="topbar__greeting">
        <span className="eyebrow">{now.toLocaleDateString('en-US', { weekday: 'long' })} · {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        <h1>
          {greeting},{' '}
          {accentOnGreeting
            ? <span className="accent">{name}.</span>
            : <span>{name}.</span>
          }
        </h1>
        <p className="sub">{sub}</p>
      </div>
      <div className="topbar__right">
        <div className="view-tabs" role="tablist">
          {VIEWS.map(v => (
            <button
              key={v.id}
              role="tab"
              aria-selected={activeView === v.id}
              className={`view-tab ${activeView === v.id ? 'is-active' : ''}`}
              onClick={() => onViewChange(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="meta-row">
          <div className="meta-card is-clock">
            <span className="k">Now</span>
            <span className="v">{h12}:{String(m).padStart(2, '0')}<span style={{ fontSize: 13, marginLeft: 4, opacity: 0.6 }}>{ampm}</span></span>
          </div>
          <div className="meta-card">
            <span className="k">Focus</span>
            <span className="v">{Math.max(0, openTasks - 2)}<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.6 }}>left</span></span>
          </div>
          <div className="meta-card">
            <span className="k">Streak</span>
            <span className="v">12<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.6 }}>d</span></span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// App
// ============================================================
function Dashboard() {
  const [t, setTweak] = useTweaks(DASH_DEFAULTS);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes();
  });

  // Active view persists per-session in localStorage so refresh stays put.
  const [activeView, setActiveViewRaw] = useState(() => {
    try { return localStorage.getItem('dash.activeView') || t.defaultView || 'week'; } catch { return 'week'; }
  });
  const setActiveView = (v) => {
    setActiveViewRaw(v);
    try { localStorage.setItem('dash.activeView', v); } catch {}
    // jump to top whenever switching views
    window.scrollTo({ top: 0 });
  };

  // tick every 30s for clock
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // counts for sidebar badges
  const counts = useMemo(() => {
    const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
    const tasks = read('dash.tasks.v1');
    const habits = read('dash.habits.v1');
    const today = todayISO();
    return {
      openTasks: tasks.filter(x => !x.done).length,
      doneToday: tasks.filter(x => x.done).length,
      habitCount: habits.filter(h => h.days?.[today]).length,
    };
  }, [nowMinutes, activeView]);

  const openSettings = () => {
    window.parent.postMessage({ type: '__activate_edit_mode' }, '*');
    window.postMessage({ type: '__activate_edit_mode' }, '*');
  };

  const renderView = () => {
    switch (activeView) {
      case 'month':   return <MonthView />;
      case 'quarter': return <QuarterView />;
      case 'year':    return <YearView />;
      case 'habits':  return <HabitsView />;
      case 'bucket':  return <BucketListView />;
      default:        return <WeekView nowMinutes={nowMinutes} />;
    }
  };

  return (
    <div className="app">
      <Rail
        activeView={activeView}
        onViewChange={setActiveView}
        showQuote={t.showQuote}
        counts={counts}
        onOpenSettings={openSettings}
      />
      <main className="main">
        <TopBar
          name={t.name}
          nowMinutes={nowMinutes}
          accentOnGreeting={t.accentOnGreeting}
          activeView={activeView}
          onViewChange={setActiveView}
          openTasks={counts.openTasks}
          doneToday={counts.doneToday}
        />

        <div key={activeView} className="view-wrap">
          {renderView()}
        </div>

        <footer className="foot">
          <span>Daybook · personal dashboard</span>
          <span>
            Built on the SSM design system <span className="dot"></span>
            All data stored locally in your browser <span className="dot"></span>
            <a href="https://github.com" target="_blank" rel="noopener" style={{ color: 'var(--fg-muted)' }}>View on GitHub</a>
          </span>
        </footer>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Personal">
          <TweakText
            label="Greeting name"
            value={t.name}
            onChange={v => setTweak('name', v)}
          />
          <TweakToggle
            label="Italic accent on name"
            value={t.accentOnGreeting}
            onChange={v => setTweak('accentOnGreeting', v)}
          />
          <TweakToggle
            label="Show daily reminder in sidebar"
            value={t.showQuote}
            onChange={v => setTweak('showQuote', v)}
          />
        </TweakSection>
        <TweakSection label="Data">
          <p style={{ fontSize: 11.5, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.55 }}>
            All views' data lives in your browser's localStorage. Clear it any time below.
          </p>
          <button
            onClick={() => {
              if (!confirm('Reset all dashboard data? This cannot be undone.')) return;
              Object.keys(localStorage)
                .filter(k => k.startsWith('dash.'))
                .forEach(k => localStorage.removeItem(k));
              location.reload();
            }}
            style={{
              marginTop: 10,
              padding: '8px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.04em',
              borderRadius: 8,
              background: 'rgba(179, 58, 58, 0.08)',
              color: 'var(--fg-error)',
              border: '1px solid rgba(179, 58, 58, 0.18)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Reset all data
          </button>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
