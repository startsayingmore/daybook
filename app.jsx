/* global React, ReactDOM */
/* global Icon, useLocalState, todayISO */
/* global WeekView, MonthView, QuarterView, YearView, HabitsView, BucketListView, FinanceView */
/* global TweaksPanel, useTweaks, TweakSection, TweakToggle, TweakText */
const { useState, useEffect, useMemo } = React;

// ============================================================
// Gist sync helpers
// ============================================================
const GIST_FILE    = 'daybook.json';
const GIST_ID_KEY  = 'dash.gist.id';
const GIST_PULLED_KEY = 'dash.gist.lastPulledAt'; // timestamp of last successful pull
const GIST_SESSION_KEY = 'dash.gist.autoPullDone'; // sessionStorage — prevent reload loops
const GIST_EXCLUDE = new Set([GIST_ID_KEY, GIST_PULLED_KEY, 'dash.gcal.tokenCache', 'dash.tasks.weekOf']);

// Token stored in localStorage under a non-dash key so it's never synced to Gist
const GITHUB_TOKEN_KEY = 'daybook.githubToken';
const getGithubToken = () => {
  try { const t = localStorage.getItem(GITHUB_TOKEN_KEY); if (t) return t.trim(); } catch {}
  return ((window.DAYBOOK_CONFIG || {}).githubToken || '').trim();
};

function gatherDashData() {
  const out = {};
  Object.keys(localStorage)
    .filter(k => k.startsWith('dash.') && !GIST_EXCLUDE.has(k))
    .forEach(k => { try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { out[k] = localStorage.getItem(k); } });
  return out;
}
function restoreDashData(data) {
  Object.keys(data)
    .filter(k => k.startsWith('dash.') && !GIST_EXCLUDE.has(k) && k !== '_syncedAt')
    .forEach(k => localStorage.setItem(k, JSON.stringify(data[k])));
}

async function gistRequest(token, path, method = 'GET', body) {
  const res = await fetch(`https://api.github.com/gists${path}`, {
    method,
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `GitHub ${res.status}`); }
  return res.json();
}

async function gistFind(token) {
  // Search first page of gists for one containing daybook.json
  const gists = await gistRequest(token, '?per_page=100');
  const found = gists.find(g => g.files?.[GIST_FILE]);
  return found ? found.id : null;
}

async function gistCreate(token) {
  const data = { ...gatherDashData(), _syncedAt: Date.now() };
  const gist = await gistRequest(token, '', 'POST', {
    description: 'Daybook sync', public: false,
    files: { [GIST_FILE]: { content: JSON.stringify(data, null, 2) } },
  });
  return gist.id;
}

async function gistPush(token, gistId) {
  const data = { ...gatherDashData(), _syncedAt: Date.now() };
  await gistRequest(token, `/${gistId}`, 'PATCH', {
    files: { [GIST_FILE]: { content: JSON.stringify(data, null, 2) } },
  });
  return data._syncedAt;
}

async function gistPull(token, gistId) {
  const gist = await gistRequest(token, `/${gistId}`);
  const content = gist.files?.[GIST_FILE]?.content;
  if (!content) throw new Error('daybook.json not found in Gist');
  return JSON.parse(content);
}

// ============================================================
// GistSyncSection — rendered inside TweaksPanel
// ============================================================
function GistSyncSection() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState(getGithubToken);
  const [gistId, setGistIdState] = useState(() => { try { return localStorage.getItem(GIST_ID_KEY) || ''; } catch { return ''; } });
  const [phase, setPhase] = useState('idle');
  const [msg, setMsg]     = useState('');

  const saveId = (id) => { setGistIdState(id); try { localStorage.setItem(GIST_ID_KEY, id); } catch {} };

  const saveToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    try { localStorage.setItem(GITHUB_TOKEN_KEY, t); } catch {}
    setToken(t);
    setTokenInput('');
    setMsg('Token saved.');
  };

  const clearToken = () => {
    try { localStorage.removeItem(GITHUB_TOKEN_KEY); } catch {}
    setToken('');
    setMsg('Token removed.');
  };

  const run = async (fn) => {
    setPhase('working'); setMsg('');
    try { await fn(); setPhase('done'); }
    catch (e) { setPhase('error'); setMsg(e.message); }
  };

  const push = () => run(async () => {
    let id = gistId;
    if (!id) { id = await gistFind(token) || await gistCreate(token); saveId(id); }
    const ts = await gistPush(token, id);
    try { localStorage.setItem(GIST_PULLED_KEY, String(ts)); } catch {}
    setMsg(`Pushed at ${new Date(ts).toLocaleTimeString()}`);
  });

  const pull = () => run(async () => {
    let id = gistId;
    if (!id) { id = await gistFind(token); if (!id) throw new Error('No Gist found — push first from another device.'); saveId(id); }
    const data = await gistPull(token, id);
    restoreDashData(data);
    if (data._syncedAt) try { localStorage.setItem(GIST_PULLED_KEY, String(data._syncedAt)); } catch {}
    setMsg('Pulled. Reloading…');
    setTimeout(() => location.reload(), 600);
  });

  const busy = phase === 'working';
  const btn = (label, onClick, primary) => (
    <button disabled={busy} onClick={onClick} style={{
      padding: '8px 12px', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em',
      borderRadius: 8, cursor: busy ? 'default' : 'pointer', width: '100%', opacity: busy ? 0.6 : 1,
      background: primary ? 'var(--ssm-eminence-tint)' : 'var(--bg-raised)',
      color: primary ? 'var(--ssm-eminence)' : 'var(--fg-secondary)',
      border: primary ? '1px solid rgba(111,63,142,0.2)' : '1px solid var(--border-default)',
    }}>{busy ? 'Working…' : label}</button>
  );

  if (!token) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
        Enter your GitHub token
      </p>
      <input
        type="text"
        value={tokenInput}
        onChange={e => setTokenInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && saveToken()}
        placeholder="ghp_…"
        style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-raised)', color: 'var(--fg-primary)', fontFamily: 'monospace', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {btn('Save token', saveToken, true)}
      {msg && <p style={{ fontSize: 11.5, margin: 0, color: 'var(--fg-success)' }}>{msg}</p>}
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
        Don't have one?{' '}
        <a href="https://github.com/settings/tokens/new?scopes=gist&description=Daybook+Sync" target="_blank" rel="noopener" style={{ color: 'var(--ssm-eminence)' }}>Create a token with gist scope ↗</a>
      </p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
        {gistId ? 'Gist connected · auto-pushes when you leave the page' : 'Token set — no Gist linked yet'}
      </p>
      {msg && <p style={{ fontSize: 11.5, margin: 0, color: phase === 'error' ? 'var(--fg-error)' : 'var(--fg-success)' }}>{msg}</p>}
      {btn('Push to Gist', push, true)}
      {btn('Pull from Gist', pull, false)}
      <button onClick={clearToken} style={{ fontSize: 11, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Remove token</button>
    </div>
  );
}

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
  { id: 'finance', label: 'Finance' },
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
  finance: 'Your money, at a glance.',
};

function TopBar({ name, nowMinutes, accentOnGreeting, activeView, onViewChange, openTasks, doneToday, exerciseStreak, onOpenSettings }) {
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
        <span className="eyebrow">
          {now.toLocaleDateString('en-US', { weekday: 'long' })} · {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          <button className="topbar__settings-btn" onClick={onOpenSettings} aria-label="Settings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </span>
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
            <span className="v">{openTasks}<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.6 }}>open</span></span>
          </div>
          <div className="meta-card">
            <span className="k">Streak</span>
            <span className="v">{exerciseStreak}<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.6 }}>d</span></span>
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

  // Gist: auto-pull once per session if remote is newer, auto-push on page hide
  useEffect(() => {
    const token = getGithubToken();
    if (!token) return;

    // Auto-pull — once per browser session to avoid reload loops
    const alreadyPulled = sessionStorage.getItem(GIST_SESSION_KEY);
    if (!alreadyPulled) {
      sessionStorage.setItem(GIST_SESSION_KEY, '1');
      (async () => {
        try {
          let id = localStorage.getItem(GIST_ID_KEY);
          if (!id) { id = await gistFind(token); if (id) localStorage.setItem(GIST_ID_KEY, id); }
          if (!id) return;
          const remote = await gistPull(token, id);
          const lastPulled = parseInt(localStorage.getItem(GIST_PULLED_KEY) || '0', 10);
          if (remote._syncedAt && remote._syncedAt > lastPulled) {
            restoreDashData(remote);
            localStorage.setItem(GIST_PULLED_KEY, String(remote._syncedAt));
            location.reload();
          }
        } catch (e) { console.warn('[Gist] Auto-pull failed:', e.message); }
      })();
    }

    // Auto-push on tab hide / close
    const onHide = () => {
      const id = localStorage.getItem(GIST_ID_KEY);
      if (!id) return;
      gistPush(token, id).catch(() => {});
    };
    const onVisibility = () => { if (document.hidden) onHide(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  // counts for sidebar badges + header stats
  const counts = useMemo(() => {
    const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); } catch { return fallback; } };
    const tasks  = read('dash.tasks.v1', []);
    const habits = read('dash.habits.v1', []);
    const cal    = read('dash.monthCal.v1', { trackedDays: {} });
    const today  = todayISO();

    // consecutive exercise days — counts back from today; if today isn't marked, counts from yesterday
    const tracked = cal.trackedDays || {};
    let streak = 0;
    const d = new Date();
    if (!tracked[today]) d.setDate(d.getDate() - 1); // start from yesterday if today not logged
    for (let i = 0; i < 365; i++) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!tracked[iso]) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }

    const taskStatus = (t) => t.status || (t.done ? 'done' : 'todo');
    return {
      openTasks:  tasks.filter(x => taskStatus(x) !== 'done').length,
      doneToday:  tasks.filter(x => taskStatus(x) === 'done').length,
      habitCount: habits.filter(h => h.days?.[today]).length,
      exerciseStreak: streak,
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
      case 'finance': return <FinanceView />;
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
          exerciseStreak={counts.exerciseStreak}
          onOpenSettings={openSettings}
        />

        <div key={activeView} className="view-wrap">
          {renderView()}
        </div>

        <footer className="foot">
          <span>Daybook · personal dashboard</span>
          <span>
            Built on the SSM design system <span className="dot"></span>
            All data stored locally in your browser <span className="dot"></span>
            <a href="https://github.com/startsayingmore/daybook" target="_blank" rel="noopener" style={{ color: 'var(--fg-muted)' }}>View on GitHub</a>
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
            All views' data lives in your browser's localStorage. Export it to transfer to another device, or import a previously saved backup.
          </p>

          {/* Export */}
          <button
            onClick={() => {
              const data = {};
              Object.keys(localStorage)
                .filter(k => k.startsWith('dash.'))
                .forEach(k => { try { data[k] = JSON.parse(localStorage.getItem(k)); } catch { data[k] = localStorage.getItem(k); } });
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `daybook-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              marginTop: 10,
              padding: '8px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.04em',
              borderRadius: 8,
              background: 'var(--ssm-eminence-tint)',
              color: 'var(--ssm-eminence)',
              border: '1px solid rgba(111, 63, 142, 0.2)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Export data
          </button>

          {/* Import */}
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    const keys = Object.keys(data).filter(k => k.startsWith('dash.'));
                    if (!keys.length) { alert('No Daybook data found in this file.'); return; }
                    if (!confirm(`Import ${keys.length} data keys? This will overwrite your current data.`)) return;
                    keys.forEach(k => localStorage.setItem(k, JSON.stringify(data[k])));
                    location.reload();
                  } catch { alert('Could not read file — make sure it is a valid Daybook export.'); }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            style={{
              marginTop: 6,
              padding: '8px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.04em',
              borderRadius: 8,
              background: 'var(--bg-raised)',
              color: 'var(--fg-secondary)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Import data
          </button>

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

        <TweakSection label="Sync">
          <GistSyncSection />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
