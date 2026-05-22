/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ============================================================
// Helpers
// ============================================================
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const useLocalState = (key, initial) => {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : JSON.parse(raw);
    } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

const Icon = ({ name, ...rest }) => {
  // Simple inline icon set — stroke 1.75 to match SSM tone
  const paths = {
    plus:   <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    check:  <polyline points="20 6 9 17 4 12"/>,
    x:      <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></>,
    trash:  <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></>,
    flame:  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>,
    clock:  <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
    pin:    <><path d="M20.5 14.5L9.5 3.5l-4 4 11 11z"/><line x1="9.5" y1="14.5" x2="3.5" y2="20.5"/></>,
    book:   <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    droplet:<path d="M12 2.5l5.5 6.5a7 7 0 1 1-11 0L12 2.5z"/>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    write:  <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>,
    sparkle:<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2"/></>,
    cal:    <><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></>,
    sun:    <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    link:   <><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></>,
    chevron:<polyline points="9 18 15 12 9 6"/>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name]}
    </svg>
  );
};

// ============================================================
// Card wrapper
// ============================================================
const Card = ({ className = '', cls, title, count, action, children }) => (
  <section className={`card ${cls || ''} ${className}`}>
    <header className="card__head">
      <h2 className="card__title">
        <span className="swatch"></span>
        {title}
        {count != null && <span className="card__count">{count}</span>}
      </h2>
      {action && <div className="card__actions">{action}</div>}
    </header>
    {children}
  </section>
);

// ============================================================
// TASKS
// ============================================================
const TAG_LABEL = { ssm: 'SSM', work: 'Work', life: 'Life', health: 'Health', read: 'Read' };
const TAG_COLOR = { ssm: '#6F3F8E', work: '#6F3F8E', life: '#B5762A', health: '#2F8F6E', read: '#2F7568' };
const STATUS_ORDER = ['todo', 'doing', 'done'];
const STATUS_LABEL = { todo: 'Not started', doing: 'In progress', done: 'Done' };
const taskStatus = (t) => t.status || (t.done ? 'done' : 'todo');

function TasksModule() {
  const [tasks, setTasks] = useLocalState('dash.tasks.v1', [
    { id: 't1', title: 'Sketch onboarding revisions for SSM v2', status: 'doing', priority: 'high', tag: 'ssm' },
    { id: 't2', title: 'Reply to grant committee', status: 'todo', priority: 'high', tag: 'work' },
    { id: 't3', title: 'Long walk after lunch', status: 'done', priority: 'low', tag: 'health' },
    { id: 't4', title: 'Read chapter 4 of "Quiet"', status: 'doing', priority: 'mid', tag: 'read' },
    { id: 't5', title: 'Call mom this evening', status: 'todo', priority: 'mid', tag: 'life' },
    { id: 't6', title: 'Refill prescription', status: 'todo', priority: 'low', tag: 'health' },
  ]);
  const [filter, setFilter] = useState('today');
  const [draft, setDraft] = useState('');
  const [draftTag, setDraftTag] = useState('work');

  const add = (e) => {
    e?.preventDefault?.();
    const v = draft.trim();
    if (!v) return;
    setTasks([{ id: 't' + Date.now(), title: v, status: 'todo', priority: 'mid', tag: draftTag }, ...tasks]);
    setDraft('');
  };
  const cycleStatus = (id) => setTasks(tasks.map(t => {
    if (t.id !== id) return t;
    const cur = taskStatus(t);
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length];
    return { ...t, status: next, done: next === 'done' };
  }));
  const remove = (id) => setTasks(tasks.filter(t => t.id !== id));

  const visible = useMemo(() => {
    if (filter === 'done') return tasks.filter(t => taskStatus(t) === 'done');
    if (filter === 'open') return tasks.filter(t => taskStatus(t) !== 'done');
    if (filter === 'doing') return tasks.filter(t => taskStatus(t) === 'doing');
    return tasks;
  }, [tasks, filter]);

  const openCount = tasks.filter(t => taskStatus(t) !== 'done').length;
  const doingCount = tasks.filter(t => taskStatus(t) === 'doing').length;

  return (
    <Card
      cls="m-tasks"
      title="Tasks"
      count={`${openCount} open`}
      action={
        <div className="pills">
          {[
            ['today', 'All'],
            ['doing', `Doing${doingCount ? ` · ${doingCount}` : ''}`],
            ['open', 'Open'],
            ['done', 'Done'],
          ].map(([k, label]) => (
            <button key={k} className={`pill ${filter === k ? 'is-active' : ''}`} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
      }
    >
      <form className="task-input" onSubmit={add}>
        <Icon name="plus" />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="What needs to happen?"
        />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: TAG_COLOR[draftTag], flexShrink: 0, transition: 'background 0.15s' }} />
          <select
            value={draftTag}
            onChange={e => setDraftTag(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 11, color: TAG_COLOR[draftTag], fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', outline: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
          >
            {Object.entries(TAG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </span>
        <button type="submit" className="submit">Add</button>
      </form>

      <div className="task-list">
        {visible.length === 0 && (
          <div className="empty">
            <strong>All clear.</strong>
            Nothing on this list — go take a walk.
          </div>
        )}
        {visible.map(t => {
          const status = taskStatus(t);
          return (
            <div key={t.id} className={`task task--${status} ${status === 'done' ? 'is-done' : ''}`}>
              <button
                className={`check check--${status}`}
                onClick={() => cycleStatus(t.id)}
                aria-label={`Status: ${STATUS_LABEL[status]}. Click to advance.`}
                title={`${STATUS_LABEL[status]} — click to advance`}
              >
                {status === 'doing' && <span className="check__half" />}
                <Icon name="check" />
              </button>
              <div className="task__body">
                <span className="task__title">{t.title}</span>
                <div className="task__meta">
                  <span className={`task__tag tag--${t.tag}`}>{TAG_LABEL[t.tag]}</span>
                  <span className={`task__status task__status--${status}`}>{STATUS_LABEL[status]}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`task__priority p-${t.priority}`}></span>
                <button className="task__delete" onClick={() => remove(t.id)} aria-label="delete">
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================
// HABITS
// ============================================================
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Returns Mon..Sun ISO strings for current week
const weekDates = () => {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0 = Mon
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
};

const computeStreak = (days) => {
  // counts consecutive completed days ending at today, OR ending yesterday if
  // today isn't marked yet (common habit-tracker UX — today doesn't break a streak)
  let streak = 0;
  let d = new Date();
  const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (!days[todayKey]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (days[iso]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

function HabitsModule() {
  const seed = (offsets) => {
    const d = {};
    const now = new Date();
    offsets.forEach(o => {
      const x = new Date(now); x.setDate(now.getDate() - o);
      d[`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`] = true;
    });
    return d;
  };

  const [habits, setHabits] = useLocalState('dash.habits.v1', [
    { id: 'h1', name: 'Move 30 min',      glyph: '🏃', days: seed([1, 2, 3, 4, 6]) },
    { id: 'h2', name: 'Read 20 pages',    glyph: '📖', days: seed([1, 2, 4, 5, 6, 7]) },
    { id: 'h3', name: 'Hydrate (8 cups)', glyph: '💧', days: seed([1, 2, 3, 5, 6]) },
    { id: 'h4', name: 'Meditate 10 min',  glyph: '✿',  days: seed([2, 3, 5]) },
  ]);

  const [editing, setEditing] = useState(null); // habit id being edited
  const [draft, setDraft] = useState({ name: '', glyph: '' });
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState({ name: '', glyph: '' });

  const week = weekDates();
  const todayI = todayISO();

  const toggleDay = (hid, iso) =>
    setHabits(habits.map(h => h.id === hid ? { ...h, days: { ...h.days, [iso]: !h.days[iso] } } : h));

  const startEdit = (h) => { setEditing(h.id); setDraft({ name: h.name, glyph: h.glyph }); };
  const saveEdit = (id) => {
    if (!draft.name.trim()) return;
    setHabits(habits.map(h => h.id === id ? { ...h, name: draft.name.trim(), glyph: draft.glyph.trim() || h.glyph } : h));
    setEditing(null);
  };
  const deleteHabit = (id) => setHabits(habits.filter(h => h.id !== id));

  const addHabit = (e) => {
    e?.preventDefault?.();
    if (!newDraft.name.trim()) return;
    setHabits([...habits, { id: 'h' + Date.now(), name: newDraft.name.trim(), glyph: newDraft.glyph.trim() || '⭐', days: {} }]);
    setNewDraft({ name: '', glyph: '' });
    setAdding(false);
  };

  return (
    <Card
      cls="m-habits"
      title="Habits"
      count="This week"
      action={
        <button
          className="btn btn--ghost"
          style={{ fontSize: 11, padding: '4px 10px' }}
          onClick={() => setAdding(a => !a)}
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      }
    >
      <div className="habits">
        {habits.map(h => {
          const streak = computeStreak(h.days);
          const isEditing = editing === h.id;
          return (
            <div key={h.id} className="habit">
              <div className="habit__head">
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <input
                      value={draft.glyph}
                      onChange={e => setDraft(d => ({ ...d, glyph: e.target.value }))}
                      style={{ width: 32, border: '1px solid var(--border-default)', borderRadius: 6, padding: '2px 4px', fontSize: 13, textAlign: 'center', background: 'var(--ssm-paper)' }}
                      placeholder="🏃"
                    />
                    <input
                      autoFocus
                      value={draft.name}
                      onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(h.id); if (e.key === 'Escape') setEditing(null); }}
                      style={{ flex: 1, border: '1px solid var(--ssm-eminence)', borderRadius: 6, padding: '3px 8px', fontSize: 12.5, fontWeight: 600, background: 'var(--ssm-paper)' }}
                    />
                    <button
                      onClick={() => saveEdit(h.id)}
                      style={{ fontSize: 11, fontWeight: 700, color: 'var(--ssm-eminence)', padding: '3px 8px', background: 'var(--ssm-eminence-tint)', borderRadius: 6 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => deleteHabit(h.id)}
                      style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-error)', padding: '3px 8px', background: 'rgba(179,58,58,0.08)', borderRadius: 6 }}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="habit__name" style={{ cursor: 'pointer' }} onClick={() => startEdit(h)} title="Click to edit">
                    <span className="glyph">{h.glyph}</span>
                    {h.name}
                    <Icon name="write" style={{ width: 11, height: 11, opacity: 0, marginLeft: 2 }} className="habit__edit-icon" />
                  </div>
                )}
                {!isEditing && (
                  <div className="habit__streak">
                    <Icon name="flame" />
                    {streak}d
                  </div>
                )}
              </div>
              <div className="streak-row">
                {week.map((iso, i) => {
                  const isFuture = iso > todayI;
                  const isToday = iso === todayI;
                  const isDone = !!h.days[iso];
                  return (
                    <button
                      key={iso}
                      className={`streak-day ${isDone ? 'is-done' : ''} ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}`}
                      onClick={() => !isFuture && toggleDay(h.id, iso)}
                      title={iso}
                    >
                      {DAY_LETTERS[i]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {adding && (
        <form className="task-input" onSubmit={addHabit} style={{ marginTop: 4 }}>
          <input
            value={newDraft.glyph}
            onChange={e => setNewDraft(d => ({ ...d, glyph: e.target.value }))}
            placeholder="🌟"
            style={{ width: 32, border: 'none', background: 'transparent', fontSize: 14, textAlign: 'center', outline: 'none', flexShrink: 0 }}
          />
          <input
            autoFocus
            value={newDraft.name}
            onChange={e => setNewDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="New habit name…"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, outline: 'none' }}
          />
          <button type="submit" className="submit">Add</button>
        </form>
      )}
    </Card>
  );
}

// ============================================================
// TODAY SCHEDULE
// ============================================================
const fmtTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return { time: `${h12}:${String(m).padStart(2, '0')}`, ampm };
};

function ScheduleModule({ nowMinutes }) {
  const [manualEvents] = useLocalState('dash.events.v1', [
    { id: 'e1', start: 9 * 60,       dur: 60,  title: 'Morning planning',    sub: 'Solo · Inbox zero' },
    { id: 'e2', start: 10 * 60 + 30, dur: 50,  title: 'Therapist sync',      sub: 'Zoom · Dr. Adeola' },
    { id: 'e3', start: 12 * 60 + 30, dur: 60,  title: 'Lunch with Toni',     sub: 'Soko Kitchen · 6th Ave' },
    { id: 'e4', start: 14 * 60,      dur: 90,  title: 'Design review · v2',  sub: 'Studio · with Jordan, Reni' },
    { id: 'e5', start: 16 * 60 + 30, dur: 30,  title: 'Walk + podcast',      sub: 'Highline' },
    { id: 'e6', start: 19 * 60,      dur: 45,  title: 'Journal & wind-down', sub: 'Home' },
  ]);

  // Use real Google Calendar events when connected, fall back to manual events
  const cal = useCalendar();
  const events = (cal.status === 'ready' && cal.events) ? cal.events : manualEvents;
  const isEmpty = events.length === 0;

  return (
    <Card cls="m-today" title="Today" count={new Date().toLocaleDateString('en-US', { weekday: 'long' })}>
      <CalendarBanner cal={cal} />
      {isEmpty ? (
        <div className="empty">
          <strong>Nothing on the calendar today.</strong>
          Enjoy some white space.
        </div>
      ) : (
        <div className="schedule">
          {events.map(e => {
            const end = e.start + e.dur;
            const isNow = nowMinutes >= e.start && nowMinutes < end;
            const isPast = nowMinutes >= end;
            const { time, ampm } = fmtTime(e.start);
            const body = (
              <div className="event__body">
                <div className="event__title">
                  {e.htmlLink
                    ? <a href={e.htmlLink} target="_blank" rel="noopener" style={{ textDecoration: 'none', color: 'inherit' }}>{e.title}</a>
                    : e.title
                  }
                  {isNow && <span className="now-badge">Now</span>}
                </div>
                {(e.sub || e.allDay) && (
                  <div className="event__meta">
                    {e.allDay ? 'All day' : e.sub || ''}
                    {!e.allDay && e.dur && !e.allDay ? ` · ${e.dur}m` : ''}
                  </div>
                )}
              </div>
            );
            return (
              <div key={e.id} className={`event ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''} ${e.allDay ? 'is-allday' : ''}`}>
                <div className="event__time">
                  {e.allDay ? <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>All<br/>Day</span> : <>{time}<span className="ampm">{ampm}</span></>}
                </div>
                <div className="event__rail"><span className="event__dot" style={e.calColor && !isNow ? { borderColor: e.calColor } : {}}></span></div>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// GOALS
// ============================================================
const parseGoalMetric = (unit) => {
  if (!unit) return null;
  const m = unit.match(/(\d+(?:\.\d+)?)\s*(?:\/|of)\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const done = parseFloat(m[1]), total = parseFloat(m[2]);
  if (!isFinite(done) || !isFinite(total) || total <= 0) return null;
  return { done, total, raw: m[0], start: m.index, end: m.index + m[0].length };
};
const setGoalDone = (unit, newDone) => {
  const m = parseGoalMetric(unit);
  if (!m) return unit;
  const clamped = Math.max(0, Math.min(m.total, Math.round(newDone)));
  const sep = m.raw.match(/of/i) ? m.raw.match(/\s*of\s*/i)[0] : m.raw.match(/\s*\/\s*/)[0];
  return unit.slice(0, m.start) + `${clamped}${sep}${m.total}` + unit.slice(m.end);
};

function GoalsModule() {
  const [goals, setGoals] = useLocalState('dash.goals.v1', [
    { id: 'g1', title: 'Ship dashboard v1 to GitHub', progress: 78, deadline: 'May 24', unit: 'Step 7 of 9' },
    { id: 'g2', title: 'Run a 10K (sub-60)', progress: 42, deadline: 'Jun 30', unit: '21 / 50 runs' },
    { id: 'g3', title: 'Finish "Quiet" by Susan Cain', progress: 65, deadline: 'May 28', unit: 'Ch. 6 of 9' },
    { id: 'g4', title: 'Write therapy reflection weekly', progress: 25, deadline: 'Ongoing', unit: '3 / 12 weeks' },
  ]);

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: '', deadline: '', unit: '' });
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState({ title: '', deadline: '', unit: '' });

  const startEdit = (g) => { setEditing(g.id); setDraft({ title: g.title, deadline: g.deadline, unit: g.unit }); };
  const saveEdit = (id) => {
    if (!draft.title.trim()) return;
    setGoals(goals.map(g => g.id === id ? { ...g, ...draft, title: draft.title.trim() } : g));
    setEditing(null);
  };
  const deleteGoal = (id) => setGoals(goals.filter(g => g.id !== id));

  const addGoal = (e) => {
    e?.preventDefault?.();
    if (!newDraft.title.trim()) return;
    setGoals([...goals, { id: 'g' + Date.now(), title: newDraft.title.trim(), progress: 0, deadline: newDraft.deadline.trim() || 'Ongoing', unit: newDraft.unit.trim() || '' }]);
    setNewDraft({ title: '', deadline: '', unit: '' });
    setAdding(false);
  };

  return (
    <Card
      cls="m-goals"
      title="Goals"
      count={`${goals.length} active`}
      action={
        <button
          className="btn btn--ghost"
          style={{ fontSize: 11, padding: '4px 10px' }}
          onClick={() => setAdding(a => !a)}
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      }
    >
      <div className="goals">
        {goals.map(g => {
          const isEditing = editing === g.id;
          const metric = parseGoalMetric(g.unit);
          const pct = metric ? Math.round(metric.done / metric.total * 100) : (g.progress ?? 0);
          const bumpDone = (delta) => {
            if (!metric) return;
            setGoals(goals.map(x => x.id === g.id ? { ...x, unit: setGoalDone(x.unit, metric.done + delta), progress: Math.round(Math.max(0, Math.min(metric.total, metric.done + delta)) / metric.total * 100) } : x));
          };
          const setFromBar = (newPct) => {
            if (metric) {
              const newDone = Math.round(newPct / 100 * metric.total);
              setGoals(goals.map(x => x.id === g.id ? { ...x, unit: setGoalDone(x.unit, newDone), progress: Math.round(newDone / metric.total * 100) } : x));
            } else {
              setGoals(goals.map(x => x.id === g.id ? { ...x, progress: newPct } : x));
            }
          };
          return (
            <div key={g.id} className="goal">
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    autoFocus
                    value={draft.title}
                    onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(g.id); if (e.key === 'Escape') setEditing(null); }}
                    placeholder="Goal title…"
                    style={{ border: '1.5px solid var(--ssm-eminence)', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600, outline: 'none', width: '100%', background: 'var(--ssm-paper)' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={draft.unit}
                      onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
                      placeholder="Progress label (e.g. Ch. 6 of 9)"
                      style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: 8, padding: '5px 10px', fontSize: 12, outline: 'none', background: 'var(--ssm-paper)' }}
                    />
                    <input
                      value={draft.deadline}
                      onChange={e => setDraft(d => ({ ...d, deadline: e.target.value }))}
                      placeholder="Due date"
                      style={{ width: 110, border: '1px solid var(--border-default)', borderRadius: 8, padding: '5px 10px', fontSize: 12, outline: 'none', background: 'var(--ssm-paper)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveEdit(g.id)} className="btn btn--primary" style={{ fontSize: 11, padding: '5px 14px' }}>Save</button>
                    <button onClick={() => setEditing(null)} className="btn btn--ghost" style={{ fontSize: 11, padding: '5px 10px' }}>Cancel</button>
                    <button onClick={() => deleteGoal(g.id)} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--fg-error)', padding: '5px 10px', background: 'rgba(179,58,58,0.08)', borderRadius: 8 }}>Delete</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="goal__head">
                    <div className="goal__title" style={{ cursor: 'pointer' }} onClick={() => startEdit(g)} title="Click to edit">
                      {g.title}
                      <Icon name="write" style={{ width: 11, height: 11, opacity: 0, marginLeft: 6, verticalAlign: 'middle' }} className="goal__edit-icon" />
                    </div>
                    <div className="goal__pct" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {metric && (
                        <div className="goal__stepper">
                          <button type="button" onClick={(e) => { e.stopPropagation(); bumpDone(-1); }} disabled={metric.done <= 0} aria-label="Decrease">−</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); bumpDone(1); }} disabled={metric.done >= metric.total} aria-label="Increase">+</button>
                        </div>
                      )}
                      <span>{pct}%</span>
                    </div>
                  </div>
                  <div
                    className="goal__bar"
                    onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setFromBar(Math.round(((e.clientX - rect.left) / rect.width) * 100)); }}
                    style={{ cursor: 'pointer' }}
                    title={metric ? `Click to set — ${metric.done} of ${metric.total}` : 'Click to set progress'}
                  >
                    <div className="goal__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="goal__meta">
                    <span>{g.unit}</span>
                    <span className="goal__due"><Icon name="cal" style={{ width: 11, height: 11 }} /> Due {g.deadline}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {adding && (
        <form onSubmit={addGoal} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: 'var(--ssm-eminence-tint)', borderRadius: 12, marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ssm-orange)' }}>New goal</p>
          <input
            autoFocus
            value={newDraft.title}
            onChange={e => setNewDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="What do you want to accomplish?"
            style={{ border: '1.5px solid var(--ssm-eminence)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600, outline: 'none', background: 'white' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newDraft.unit}
              onChange={e => setNewDraft(d => ({ ...d, unit: e.target.value }))}
              placeholder="Progress label (optional)"
              style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', background: 'white' }}
            />
            <input
              value={newDraft.deadline}
              onChange={e => setNewDraft(d => ({ ...d, deadline: e.target.value }))}
              placeholder="Due date"
              style={{ width: 110, border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', background: 'white' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn--primary" style={{ fontSize: 11, padding: '6px 16px' }}>Add goal</button>
            <button type="button" className="btn btn--ghost" style={{ fontSize: 11 }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}
    </Card>
  );
}

// ============================================================
// NOTES
// ============================================================
function NotesModule() {
  const [notes, setNotes] = useLocalState('dash.notes.v1', [
    { id: 'n1', body: 'Calmer Monday than usual. Realized the new structure for the v2 onboarding works because it asks "what do you want to say more about?" before introducing therapists.', createdAt: Date.now() - 86400000 * 1 },
    { id: 'n2', body: 'Saw a sparrow at the window. Took it as a tiny good omen.', createdAt: Date.now() - 86400000 * 3 },
  ]);
  const [draft, setDraft] = useState('');

  const save = () => {
    const v = draft.trim();
    if (!v) return;
    setNotes([{ id: 'n' + Date.now(), body: v, createdAt: Date.now() }, ...notes]);
    setDraft('');
  };
  const fmtAgo = (ts) => {
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card cls="m-notes" title="Journal" count={`${notes.length} entries`}>
      <div className="notes">
        <div className="note-editor">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="What's on your mind today, Lamide?"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
          />
          <div className="note-editor__foot">
            <span>{draft.length} chars · ⌘↵ to save</span>
            <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={save}>Save entry</button>
          </div>
        </div>
        <div className="note-list">
          {notes.map(n => (
            <div key={n.id} className="note-entry">
              <div className="note-entry__head">
                <span>{fmtAgo(n.createdAt)}</span>
                <button className="note-entry__delete" onClick={() => setNotes(notes.filter(x => x.id !== n.id))}>Delete</button>
              </div>
              <div className="note-entry__body">{n.body}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// QUICK LINKS
// ============================================================
const LINK_COLORS = [
  'var(--ssm-eminence)',
  'var(--ssm-orange)',
  '#2F8F6E',
  'var(--ssm-eminence-soft)',
  '#B5762A',
  '#2F7568',
];

const initial = (s) => s.replace(/^(https?:\/\/)?(www\.)?/, '').charAt(0).toUpperCase();
const domain = (url) => {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, ''); }
  catch { return url; }
};

function LinksModule() {
  const [links, setLinks] = useLocalState('dash.links.v1', [
    { id: 'l1', label: 'GitHub',     url: 'https://github.com',     color: 0 },
    { id: 'l2', label: 'Linear',     url: 'https://linear.app',     color: 1 },
    { id: 'l3', label: 'Calendar',   url: 'https://calendar.google.com', color: 2 },
    { id: 'l4', label: 'Notion',     url: 'https://notion.so',      color: 3 },
    { id: 'l5', label: 'Figma',      url: 'https://figma.com',      color: 4 },
    { id: 'l6', label: 'Inbox',      url: 'https://mail.google.com',color: 5 },
  ]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const add = () => {
    const l = newLabel.trim(), u = newUrl.trim();
    if (!l || !u) return;
    const url = u.startsWith('http') ? u : `https://${u}`;
    setLinks([...links, { id: 'l' + Date.now(), label: l, url, color: links.length % LINK_COLORS.length }]);
    setNewLabel(''); setNewUrl(''); setAdding(false);
  };

  return (
    <>
      <Card cls="m-links" title="Quick links" count={`${links.length}`}>
        <div className="links">
          {links.map(l => (
            <a key={l.id} className="link" href={l.url} target="_blank" rel="noopener" title={domain(l.url)}>
              <span className="link__icon" style={{ background: LINK_COLORS[l.color % LINK_COLORS.length] }}>
                {initial(l.label)}
              </span>
              <span className="link__label">{l.label}</span>
              <button
                className="link__remove"
                onClick={(e) => { e.preventDefault(); setLinks(links.filter(x => x.id !== l.id)); }}
                aria-label="remove"
              >×</button>
            </a>
          ))}
          <button className="link link--add" onClick={() => setAdding(true)}>
            <span className="link__icon"><Icon name="plus" /></span>
            <span className="link__label">Add</span>
          </button>
        </div>
      </Card>
      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add a quick link</h3>
            <div className="field">
              <label>Label</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Slack" autoFocus />
            </div>
            <div className="field">
              <label>URL</label>
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://…" onKeyDown={e => e.key === 'Enter' && add()} />
            </div>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={add}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// expose to global scope so app.jsx can use them
Object.assign(window, {
  TasksModule, HabitsModule, ScheduleModule, GoalsModule, NotesModule, LinksModule,
  Icon, useLocalState, todayISO, Card,
});

// ============================================================
// SOCIAL MEDIA ANALYTICS
// ============================================================
const formatK = (n) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 1 : 2)}k` : String(n);
const formatDelta = (n) => `${n >= 0 ? '+' : ''}${n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n}`;

// Tiny SVG sparkline — takes 7 numbers, normalizes to viewBox 100x32.
function Spark({ data, color = 'var(--ssm-eminence)', fill = 'rgba(111, 63, 142, 0.12)' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => [
    (i / (n - 1)) * 100,
    32 - ((v - min) / range) * 28 - 2,
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L100,32 L0,32 Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 100 32" width="100%" height="32" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.4" fill={color} />
    </svg>
  );
}

const PLATFORMS = {
  instagram: { name: 'Instagram', color: '#C13584', short: 'IG' },
  tiktok:    { name: 'TikTok',    color: '#1F1320', short: 'TT' },
  threads:   { name: 'Threads',   color: '#3E2A45', short: 'TH' },
  linkedin:  { name: 'LinkedIn',  color: '#2F7568', short: 'LI' },
  youtube:   { name: 'YouTube',   color: '#B33A3A', short: 'YT' },
  twitter:   { name: 'X',         color: '#1F1320', short: 'X'  },
};

// Build a realistic upward-drifting series ending at `followers`
const buildSeries = (followers, delta, n = 7) => {
  const start = followers - delta;
  return Array.from({ length: n }, (_, i) => {
    const base = start + (delta * (i / (n - 1)));
    const jitter = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * Math.max(8, Math.abs(delta) * 0.08);
    return Math.round(base + jitter);
  });
};

function SocialModule() {
  const [accounts, setAccounts] = useLocalState('dash.social.v1', [
    { id: 's1', platform: 'instagram', handle: '@startsayingmore', followers: 14820, delta7d: 312, engagement: 4.8, posts: 42 },
    { id: 's2', platform: 'tiktok',    handle: '@startsayingmore', followers:  8240, delta7d: 184, engagement: 7.2, posts: 28 },
  ]);

  // One-time migration: drop legacy Threads / LinkedIn rows seeded in earlier versions.
  useEffect(() => {
    const dropped = accounts.filter(a => a.platform === 'threads' || a.platform === 'linkedin');
    if (dropped.length) setAccounts(accounts.filter(a => a.platform !== 'threads' && a.platform !== 'linkedin'));
  }, []);

  const [range, setRange] = useState('7d');

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalDelta = accounts.reduce((s, a) => s + a.delta7d, 0);
  const avgEng = accounts.length ? (accounts.reduce((s, a) => s + a.engagement, 0) / accounts.length) : 0;

  return (
    <Card
      cls="m-social"
      title="Social"
      count={`${accounts.length} accounts`}
      action={
        <div className="pills">
          {['7d', '30d', '90d'].map(k => (
            <button key={k} className={`pill ${range === k ? 'is-active' : ''}`} onClick={() => setRange(k)}>{k}</button>
          ))}
        </div>
      }
    >
      <div className="social-summary">
        <div className="social-stat">
          <span className="k">Total reach</span>
          <span className="v">{formatK(totalFollowers)}</span>
          <span className={`d ${totalDelta >= 0 ? 'd--up' : 'd--down'}`}>
            {totalDelta >= 0 ? '▲' : '▼'} {formatDelta(totalDelta)} this {range}
          </span>
        </div>
        <div className="social-stat">
          <span className="k">Avg engagement</span>
          <span className="v">{avgEng.toFixed(1)}<span className="unit">%</span></span>
          <span className="d d--neutral">across {accounts.length} platforms</span>
        </div>
        <div className="social-stat">
          <span className="k">Posts this {range}</span>
          <span className="v">{accounts.reduce((s, a) => s + a.posts, 0)}</span>
          <span className="d d--neutral">{(accounts.reduce((s, a) => s + a.posts, 0) / (range === '7d' ? 7 : range === '30d' ? 30 : 90)).toFixed(1)}/day</span>
        </div>
        <div className="social-stat">
          <span className="k">Best performer</span>
          <span className="v" style={{ fontSize: 16, color: 'var(--ssm-eminence)' }}>
            {(() => {
              const best = [...accounts].sort((a, b) => b.engagement - a.engagement)[0];
              return PLATFORMS[best?.platform]?.name || '—';
            })()}
          </span>
          <span className="d d--neutral">by engagement rate</span>
        </div>
      </div>

      <div className="social-grid">
        {accounts.map(a => {
          const p = PLATFORMS[a.platform] || PLATFORMS.instagram;
          const series = buildSeries(a.followers, a.delta7d);
          const up = a.delta7d >= 0;
          return (
            <div key={a.id} className="social-card">
              <div className="social-card__head">
                <span className="social-card__badge" style={{ background: p.color }}>{p.short}</span>
                <div className="social-card__id">
                  <span className="social-card__platform">{p.name}</span>
                  <span className="social-card__handle">{a.handle}</span>
                </div>
                <span className={`social-card__delta ${up ? 'is-up' : 'is-down'}`}>
                  {up ? '▲' : '▼'} {formatDelta(a.delta7d)}
                </span>
              </div>
              <div className="social-card__num">
                {formatK(a.followers)}
                <span className="social-card__unit">followers</span>
              </div>
              <div className="social-card__chart">
                <Spark
                  data={series}
                  color={up ? 'var(--ssm-eminence)' : 'var(--fg-error)'}
                  fill={up ? 'rgba(111, 63, 142, 0.10)' : 'rgba(179, 58, 58, 0.08)'}
                />
              </div>
              <div className="social-card__foot">
                <span><strong>{a.engagement.toFixed(1)}%</strong> engagement</span>
                <span><strong>{a.posts}</strong> posts</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

Object.assign(window, { SocialModule });
