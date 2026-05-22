/* global React */
/* global Card, Icon, useLocalState, todayISO */
/* global TasksModule, HabitsModule, ScheduleModule, GoalsModule, LinksModule, SocialModule */
/* global parseGoalMetric, setGoalDone */
const { useState, useEffect, useMemo, useRef } = React;

// ============================================================
// Shared date helpers
// ============================================================
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const startOfWeek = (d = new Date()) => {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
};
const weekDates = (anchor = new Date()) => {
  const m = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(m);d.setDate(m.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
};
const fmtWeekLabel = (anchor = new Date()) => {
  const m = startOfWeek(anchor);
  return `Week of ${MONTHS[m.getMonth()].slice(0, 3)} ${m.getDate()}`;
};
const currentQuarter = (d = new Date()) => ({
  q: Math.floor(d.getMonth() / 3) + 1,
  year: d.getFullYear()
});

// ============================================================
// WEEKLY FOCUS
// ============================================================
function WeeklyFocusModule() {
  const [data, setData] = useLocalState('dash.weeklyFocus.v1', {
    focus: 'I am on track to build generational wealth before 35.',
    goals: [
    { id: 'wg1', text: 'Some type of activity everyday this week', done: false },
    { id: 'wg2', text: 'Film content for SSM TikTok', done: false },
    { id: 'wg3', text: 'Apply for 3 more grants', done: true }]

  });
  const [draft, setDraft] = useState('');

  const addGoal = (e) => {
    e?.preventDefault?.();
    const v = draft.trim();if (!v) return;
    setData({ ...data, goals: [...data.goals, { id: 'wg' + Date.now(), text: v, done: false }] });
    setDraft('');
  };
  const toggle = (id) => setData({ ...data, goals: data.goals.map((g) => g.id === id ? { ...g, done: !g.done } : g) });
  const remove = (id) => setData({ ...data, goals: data.goals.filter((g) => g.id !== id) });

  return (
    <Card cls="m-focus" title="Weekly focus" count={fmtWeekLabel()}>
      <div className="focus-goals">
        <p className="focus-goals__head">Weekly goals</p>
        <div className="focus-goals__list">
          {data.goals.map((g) =>
          <div key={g.id} className={`focus-goal ${g.done ? 'is-done' : ''}`}>
              <button className={`check ${g.done ? 'is-checked' : ''}`} onClick={() => toggle(g.id)}>
                <Icon name="check" />
              </button>
              <span className="focus-goal__text">{g.text}</span>
              <button className="focus-goal__remove" onClick={() => remove(g.id)} aria-label="remove">×</button>
            </div>
          )}
        </div>
        <form className="task-input task-input--mini" onSubmit={addGoal}>
          <Icon name="plus" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a goal for this week…" />
          <button type="submit" className="submit">Add</button>
        </form>
      </div>
    </Card>);

}

// ============================================================
// CURRENTLY READING
// ============================================================
const READING_STATUSES = [
  { v: 'reading', l: 'Reading' },
  { v: 'paused', l: 'Paused' },
  { v: 'completed', l: 'Completed' },
];

function CurrentlyReadingModule() {
  const [books, setBooks] = useLocalState('dash.books.v2', [
    { id: 'book1', title: 'Before the Coffee Gets Cold', author: 'Toshikazu Kawaguchi', status: 'reading', format: 'print' },
  ]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});

  const startEdit = (b) => { setEditing(b.id); setDraft({ ...b }); };
  const startAdd = () => {
    const id = 'book' + Date.now();
    setEditing(id);
    setDraft({ id, title: '', author: '', status: 'reading', format: 'print' });
  };
  const saveEdit = () => {
    if (!draft.title.trim()) { setEditing(null); return; }
    const exists = books.find((b) => b.id === draft.id);
    if (exists) { setBooks(books.map((b) => b.id === draft.id ? draft : b)); }
    else { setBooks([...books, draft]); }
    setEditing(null);
  };
  const deleteBook = (id) => { setBooks(books.filter((b) => b.id !== id)); setEditing(null); };

  const active = books.filter((b) => b.status !== 'completed').length;

  return (
    <Card
      cls="m-reading"
      title="Currently reading"
      count={`${active} active`}
      action={
        <button
          onClick={startAdd}
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--ssm-eminence)', letterSpacing: '0.04em' }}>
          + Add
        </button>
      }>
      {books.length === 0 && (
        <div className="empty"><strong>Nothing added yet.</strong> Hit "+ Add" to log a book.</div>
      )}
      {books.map((book) => (
        <div key={book.id} className="reading-book">
          {editing === book.id ? (
            <div className="reading-edit">
              <input
                className="reading-edit__title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Book title"
                autoFocus />
              <input
                className="reading-edit__author"
                value={draft.author}
                onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                placeholder="Author" />
              <div className="reading__status">
                {READING_STATUSES.map((s) => (
                  <button
                    key={s.v}
                    className={`reading__pill ${draft.status === s.v ? 'is-active' : ''} reading__pill--${s.v}`}
                    onClick={() => setDraft({ ...draft, status: s.v })}>
                    {draft.status === s.v && '● '}{s.l}
                  </button>
                ))}
              </div>
              <div className="reading-edit__foot">
                <button className="btn btn--primary" style={{ padding: '5px 14px', fontSize: 11 }} onClick={saveEdit}>Save</button>
                <button className="btn btn--ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => setEditing(null)}>Cancel</button>
                <button
                  style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-error)', fontWeight: 600 }}
                  onClick={() => deleteBook(book.id)}>
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="reading-row">
              <div className="reading__cover reading__cover--sm">
                <div className="reading__cover-inner">
                  <div className="reading__cover-spine"></div>
                  <div className="reading__cover-title">{book.title.split(' ').slice(0, 3).join(' ')}</div>
                </div>
              </div>
              <div className="reading-row__body">
                <div className="reading-row__title">{book.title || '(untitled)'}</div>
                {book.author && <div className="reading-row__author">{book.author}</div>}
                <span className={`reading__pill reading__pill--${book.status} is-active`}>
                  ● {READING_STATUSES.find((s) => s.v === book.status)?.l}
                </span>
              </div>
              <button className="icon-btn reading-row__edit" onClick={() => startEdit(book)} aria-label="edit" title="Edit">
                <Icon name="write" style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

// ============================================================
// DAILY REFLECTION
// ============================================================
function ReflectionModule() {
  const [entries, setEntries] = useLocalState('dash.reflection.v1', {});
  const [draft, setDraft] = useState('');
  const today = todayISO();

  const save = () => {
    const v = draft.trim();if (!v) return;
    setEntries({ ...entries, [today]: v });
    setDraft('');
  };

  const recent = Object.entries(entries).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4);

  return (
    <Card cls="m-reflect" title="Reflection" count="Today">
      <div className="note-editor">
        <textarea
          value={draft || entries[today] || ''}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What's on your mind today? Gratitude, wins, thoughts…"
          onKeyDown={(e) => {if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();}} />
        
        <div className="note-editor__foot">
          <span>{(draft || entries[today] || '').length} chars · ⌘↵ save</span>
          <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={save}>Save</button>
        </div>
      </div>
      {recent.length > 0 &&
      <div className="note-list" style={{ maxHeight: 120 }}>
          {recent.filter(([d]) => d !== today).slice(0, 2).map(([d, body]) =>
        <div key={d} className="note-entry">
              <div className="note-entry__head">
                <span>{new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="note-entry__body" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{body}</div>
            </div>
        )}
        </div>
      }
    </Card>);

}

// ============================================================
// EVENTS THIS WEEK
// ============================================================
function WeekEventsModule() {
  const [events, setEvents] = useLocalState('dash.weekEvents.v1', [
  { id: 'we1', date: 'today', label: 'Dinner @ SPICE', time: '8:00 PM', tag: 'today' },
  { id: 'we2', date: 'today', label: "WCAC Morgan's birthday", time: '10:00 PM', tag: 'today' },
  { id: 'we3', date: 'tomorrow', label: 'Church', time: '9:00 AM', tag: 'tomorrow' },
  { id: 'we4', date: 'sat', label: 'Therapy intake call', time: '11:00 AM', tag: 'sat' }]
  );
  return (
    <Card cls="m-events" title="Events this week" count={`${events.length}`}>
      <div className="week-events">
        {events.length === 0 && <div className="empty"><strong>Clear week.</strong>Nothing on the calendar yet.</div>}
        {events.map((e) =>
        <div key={e.id} className="week-event">
            <div className="week-event__date">{e.date.slice(0, 3)}</div>
            <div className="week-event__body">
              <div className="week-event__title">{e.label}</div>
              <div className="week-event__time">{e.time}</div>
            </div>
            <button className="week-event__x" onClick={() => setEvents(events.filter((x) => x.id !== e.id))} aria-label="remove">×</button>
          </div>
        )}
      </div>
    </Card>);

}

// ============================================================
// MONTH CALENDAR — workout/activity heatmap
// ============================================================
function MonthCalendarModule() {
  const [data, setData] = useLocalState('dash.monthCal.v1', { trackedDays: {} });
  const [view, setView] = useState(() => {const d = new Date();return { y: d.getFullYear(), m: d.getMonth() };});

  const monthStart = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const startDow = (monthStart.getDay() + 6) % 7;
  const cells = [
  ...Array(startDow).fill(null),
  ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isoFor = (day) => `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayI = todayISO();
  const sessions = Object.keys(data.trackedDays).filter((k) => k.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`) && data.trackedDays[k]).length;

  const toggle = (day) => {
    if (!day) return;
    const iso = isoFor(day);
    if (iso > todayI) return;
    setData({ ...data, trackedDays: { ...data.trackedDays, [iso]: !data.trackedDays[iso] } });
  };

  // Seed a few sessions for the current month on first load
  useEffect(() => {
    const key = `${view.y}-${String(view.m + 1).padStart(2, '0')}`;
    const hasAny = Object.keys(data.trackedDays).some((k) => k.startsWith(key));
    if (!hasAny && view.y === new Date().getFullYear() && view.m === new Date().getMonth()) {
      const today = new Date();
      const seeds = [11, 12, 13, 14, 15].map((d) => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      const seeded = {};
      seeds.forEach((s) => {seeded[s] = true;});
      setData({ ...data, trackedDays: { ...data.trackedDays, ...seeded } });
    }
  }, []);

  return (
    <Card
      cls="m-monthcal"
      title="Exercise & Movement"
      count={`${sessions} session${sessions === 1 ? '' : 's'}`}
      action={
      <div className="monthcal__nav">
          <button className="icon-btn" onClick={() => setView({ y: view.m === 0 ? view.y - 1 : view.y, m: (view.m + 11) % 12 })}><Icon name="chevron" style={{ transform: 'rotate(180deg)' }} /></button>
          <span className="monthcal__label">{MONTHS[view.m]} {view.y}</span>
          <button className="icon-btn" onClick={() => setView({ y: view.m === 11 ? view.y + 1 : view.y, m: (view.m + 1) % 12 })}><Icon name="chevron" /></button>
        </div>
      }>
      
      <div className="monthcal">
        <div className="monthcal__head">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="monthcal__grid">
          {cells.map((day, i) => {
            if (day == null) return <span key={i} className="monthcal__cell monthcal__cell--blank"></span>;
            const iso = isoFor(day);
            const isFuture = iso > todayI;
            const isToday = iso === todayI;
            const isDone = !!data.trackedDays[iso];
            return (
              <button
                key={i}
                className={`monthcal__cell ${isDone ? 'is-done' : ''} ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}`}
                onClick={() => toggle(day)}>
                
                {day}
              </button>);

          })}
        </div>
      </div>
    </Card>);

}

// ============================================================
// MONTHLY REFLECTION (8 questions)
// ============================================================
const MONTHLY_QUESTIONS = [
'What were your biggest wins this month?',
'What was your biggest challenge and how did you handle it?',
'What are you most grateful for this month?',
"What's the most important thing you learned?",
'How did you take care of your health — body and mind?',
'How did you grow personally or professionally?',
'What would you do differently next month?',
"What's your intention going into next month?"];


function MonthlyReflectionModule() {
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [answers, setAnswers] = useLocalState(`dash.monthRefl.${monthKey}.v1`, {});
  const answered = Object.values(answers).filter((v) => v && v.trim()).length;
  return (
    <Card
      cls="m-monthrefl"
      title="Monthly reflection"
      count={`${answered}/${MONTHLY_QUESTIONS.length} answered`}>
      
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
        {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
      </p>
      <div className="reflection-q">
        {MONTHLY_QUESTIONS.map((q, i) =>
        <div key={i} className="reflection-row">
            <label>{q}</label>
            <input
            type="text"
            value={answers[i] || ''}
            onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
            placeholder="Write your thoughts…" />
          
          </div>
        )}
      </div>
    </Card>);

}

// ============================================================
// GYM CONSISTENCY (13-week bars)
// ============================================================
function GymConsistencyModule() {
  const [calData] = useLocalState('dash.monthCal.v1', { trackedDays: {} });
  const trackedDays = calData.trackedDays || {};

  const weeklyData = useMemo(() => {
    const today = new Date();
    const dow = today.getDay(); // 0=Sun
    const toMonday = dow === 0 ? -6 : 1 - dow;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + toMonday);
    currentMonday.setHours(0, 0, 0, 0);

    return Array.from({ length: 13 }, (_, w) => {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - (12 - w) * 7);
      let count = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + d);
        const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        if (trackedDays[iso]) count++;
      }
      return count;
    });
  }, [trackedDays]);

  const max = Math.max(...weeklyData, 1);
  const avg = (weeklyData.reduce((s, x) => s + x, 0) / weeklyData.length).toFixed(1);
  const total = weeklyData.reduce((s, x) => s + x, 0);

  return (
    <Card cls="m-gymconsist" title="Gym consistency" count={`${total} session${total === 1 ? '' : 's'} · 13 wks`} action={<span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>avg <strong style={{ color: 'var(--ssm-eminence)' }}>{avg}</strong>/wk</span>}>
      <div className="gymbars">
        {weeklyData.map((v, i) =>
          <div key={i} className="gymbar-col" title={`${v} session${v === 1 ? '' : 's'}`}>
            <span className="gymbar" style={{ height: `${v / max * 100}%`, background: i === weeklyData.length - 1 ? 'var(--ssm-orange)' : 'var(--ssm-orange-light)' }}></span>
          </div>
        )}
      </div>
      <div className="gymbars__foot">
        <span>13 weeks ago</span>
        <span>This week</span>
      </div>
    </Card>
  );
}

// ============================================================
// FINANCES
// ============================================================
function FinancesModule({ compact = false }) {
  const { q, year } = currentQuarter();
  const cal = useCalendar();
  const fd = cal.financeData; // live sheet data when connected + scoped

  const hasError = fd && fd._error;
  const hasData = fd && !fd._error;

  if (compact) {
    return (
      <Card cls="m-finance" title="Finances" count={`Q${q} ${year}`}>
        {hasData ? (
          <div className="fin-mini">
            <div className="fin-mini__row">
              <div>
                <p className="fin-mini__k">Net worth</p>
                <p className="fin-mini__v is-pos">{fd.netWorth}</p>
              </div>
              <div>
                <p className="fin-mini__k">Monthly net</p>
                <p className="fin-mini__v is-pos">{fd.monthlyNet}</p>
              </div>
            </div>
            <div className="fin-mini__row" style={{ marginTop: 6 }}>
              <div>
                <p className="fin-mini__k">Budget left</p>
                <p className="fin-mini__v is-pos">{fd.budgetRemaining}</p>
              </div>
              <div>
                <p className="fin-mini__k">Savings rate</p>
                <p className="fin-mini__v">{fd.savingsRate}</p>
              </div>
            </div>
          </div>
        ) : hasError ? (
          <p style={{ fontSize: 11, color: '#c0392b', margin: 0, fontFamily: 'monospace' }}>
            Sheets error: {fd._error}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
            Connect Google to see live figures from your sheet.
          </p>
        )}
      </Card>
    );
  }

  if (hasData) {
    return (
      <Card cls="m-finance" title="Finances" count={`Q${q} ${year} · live from Google Sheets`}>
        <div className="fin-grid">
          <div className="fin-stat">
            <p className="fin-stat__k">Net worth</p>
            <p className="fin-stat__v is-pos">{fd.netWorth}</p>
            <p className="fin-stat__sub">assets − debts</p>
          </div>
          <div className="fin-stat">
            <p className="fin-stat__k">Total assets</p>
            <p className="fin-stat__v">{fd.totalAssets}</p>
            <p className="fin-stat__sub">cash + investments + savings</p>
          </div>
          <div className="fin-stat">
            <p className="fin-stat__k">Total debts</p>
            <p className="fin-stat__v is-neg">{fd.totalDebts}</p>
            <p className="fin-stat__sub">credit cards + student loans</p>
          </div>
          <div className="fin-stat">
            <p className="fin-stat__k">Monthly net</p>
            <p className="fin-stat__v is-pos">{fd.monthlyNet}</p>
            <p className="fin-stat__sub">estimated take-home</p>
          </div>
        </div>
        <div className="fin-grid" style={{ marginTop: 10 }}>
          <div className="fin-stat">
            <p className="fin-stat__k">Budget remaining</p>
            <p className="fin-stat__v is-pos">{fd.budgetRemaining}</p>
            <p className="fin-stat__sub">this month</p>
          </div>
          <div className="fin-stat">
            <p className="fin-stat__k">Savings rate</p>
            <p className="fin-stat__v">{fd.savingsRate}</p>
            <p className="fin-stat__sub">of take-home</p>
          </div>
          <div className="fin-stat">
            <p className="fin-stat__k">Student loans</p>
            <p className="fin-stat__v is-neg">{fd.studentLoans}</p>
            <p className="fin-stat__sub">NSU · IBR $413/mo</p>
          </div>
          <div className="fin-stat">
            <p className="fin-stat__k">Emergency fund</p>
            <p className="fin-stat__v">{fd.emergencyFund}</p>
            <p className="fin-stat__sub">of expenses covered</p>
          </div>
        </div>
        <div className="fin-health">
          <span className="fin-health__pill">DTI {fd.debtToIncome}</span>
          <span className="fin-health__pill">Savings rate {fd.savingsRate}</span>
          <a href={`https://docs.google.com/spreadsheets/d/${((window.DAYBOOK_CONFIG||{}).financeSheetId||'')}`} target="_blank" rel="noopener noreferrer" className="fin-health__link">Open sheet ↗</a>
        </div>
      </Card>
    );
  }

  // Error state — Sheets API returned an error (likely not enabled in Cloud Console)
  if (hasError) {
    return (
      <Card cls="m-finance" title="Finances" count={`Q${q} ${year}`}>
        <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 6px', fontWeight: 600 }}>
          Sheets API error
        </p>
        <p style={{ fontSize: 11, color: '#c0392b', margin: '0 0 8px', fontFamily: 'monospace' }}>
          {fd._error}
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
          If you see "403" or "disabled", go to <strong>console.cloud.google.com</strong> → your Daybook project → APIs &amp; Services → Library → search "Google Sheets API" → Enable. Then disconnect and reconnect here.
        </p>
      </Card>
    );
  }

  // Fallback — not connected yet
  return (
    <Card cls="m-finance" title="Finances" count={`Q${q} ${year}`}>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 8px' }}>
        Disconnect and reconnect your Google account once to grant Sheets access — figures will pull from your spreadsheet automatically after that.
      </p>
    </Card>);

}

// ============================================================
// QUARTERLY GOALS (tabbed)
// ============================================================
const QGOAL_TABS = ['Finance', 'Health', 'Business', 'Personal'];
function QuarterlyGoalsModule() {
  const { q, year } = currentQuarter();
  const [goals, setGoals] = useLocalState('dash.qGoals.v1', [
  { id: 'qg1', tab: 'Finance', text: 'Pay off $6,000 in debt', done: false, progress: 0, metric: '' },
  { id: 'qg2', tab: 'Finance', text: 'Hit $8k in emergency fund', done: false, progress: 0, metric: '' },
  { id: 'qg3', tab: 'Health', text: 'Hit 60 gym sessions', done: false, progress: 0, metric: '' },
  { id: 'qg4', tab: 'Business', text: 'Launch SSM v2 onboarding', done: false, progress: 0, metric: '' },
  { id: 'qg5', tab: 'Personal', text: 'Read 6 books', done: true, progress: 100, metric: '6 of 6' }]
  );
  const [tab, setTab] = useState('Finance');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState({ text: '', metric: '' });

  const visible = goals.filter((g) => g.tab === tab);
  const complete = goals.filter((g) => g.done).length;

  const add = () => {
    const v = draft.trim(); if (!v) return;
    setGoals([...goals, { id: 'qg' + Date.now(), tab, text: v, done: false, progress: 0, metric: '' }]);
    setDraft('');
  };
  const startEdit = (g) => { setEditing(g.id); setEditDraft({ text: g.text, metric: g.metric || '' }); };
  const saveEdit = (id) => {
    if (!editDraft.text.trim()) return;
    setGoals(goals.map((g) => {
      if (g.id !== id) return g;
      const parsed = parseGoalMetric(editDraft.metric);
      const progress = parsed ? Math.round(parsed.done / parsed.total * 100) : g.progress;
      return { ...g, text: editDraft.text.trim(), metric: editDraft.metric, progress, done: progress === 100 };
    }));
    setEditing(null);
  };
  const setProgress = (id, pct) => {
    setGoals(goals.map((g) => {
      if (g.id !== id) return g;
      const parsed = parseGoalMetric(g.metric);
      if (parsed) {
        const newDone = Math.round(pct / 100 * parsed.total);
        const newMetric = setGoalDone(g.metric, newDone);
        return { ...g, metric: newMetric, progress: Math.round(Math.max(0, Math.min(parsed.total, newDone)) / parsed.total * 100), done: pct === 100 };
      }
      return { ...g, progress: pct, done: pct === 100 };
    }));
  };
  const toggleDone = (id) => {
    setGoals(goals.map((g) => g.id === id ? { ...g, done: !g.done, progress: !g.done ? 100 : g.progress } : g));
  };

  return (
    <Card cls="m-qgoals" title="Quarterly goals" count={`Q${q} ${year} · ${complete}/${goals.length} complete`}>
      <div className="pills" style={{ marginBottom: 4 }}>
        {QGOAL_TABS.map((k) =>
        <button key={k} className={`pill ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{k}</button>
        )}
      </div>
      <div className="task-list" style={{ maxHeight: 280 }}>
        {visible.length === 0 && <div className="empty"><strong>No {tab.toLowerCase()} goals yet.</strong> Add your first one below.</div>}
        {visible.map((g) => {
          const parsed = parseGoalMetric(g.metric);
          const pct = parsed ? Math.round(parsed.done / parsed.total * 100) : (g.progress ?? (g.done ? 100 : 0));
          const isEditing = editing === g.id;
          return (
            <div key={g.id} className={`task ${g.done ? 'is-done' : ''}`} style={{ display: 'block', padding: '8px 6px' }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <input
                    autoFocus
                    value={editDraft.text}
                    onChange={(e) => setEditDraft((d) => ({ ...d, text: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(g.id); if (e.key === 'Escape') setEditing(null); }}
                    placeholder="Goal title…"
                    style={{ border: '1.5px solid var(--ssm-eminence)', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600, outline: 'none', background: 'var(--ssm-paper)', fontFamily: 'inherit' }}
                  />
                  <input
                    value={editDraft.metric}
                    onChange={(e) => setEditDraft((d) => ({ ...d, metric: e.target.value }))}
                    placeholder="Metric e.g. $2,000 of $6,000 or 21 of 60"
                    style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: '5px 10px', fontSize: 12, outline: 'none', background: 'var(--ssm-paper)', fontFamily: 'inherit', color: 'var(--fg-muted)' }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => saveEdit(g.id)} className="btn btn--primary" style={{ fontSize: 11, padding: '4px 12px' }}>Save</button>
                    <button onClick={() => setEditing(null)} className="btn btn--ghost" style={{ fontSize: 11, padding: '4px 10px' }}>Cancel</button>
                    <button onClick={() => { setGoals(goals.filter((x) => x.id !== g.id)); setEditing(null); }} style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-error)', padding: '4px 10px', background: 'rgba(179,58,58,0.08)', borderRadius: 7, marginLeft: 'auto' }}>Delete</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <button className={`check ${g.done ? 'is-checked' : ''}`} onClick={() => toggleDone(g.id)} style={{ flexShrink: 0 }}>
                      <Icon name="check" />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="task__title" style={{ cursor: 'pointer' }} onClick={() => startEdit(g)}>{g.text}</span>
                      {g.metric && <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{g.metric}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {parsed && (
                        <div className="goal__stepper">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setProgress(g.id, Math.round(Math.max(0, parsed.done - 1) / parsed.total * 100)); }} disabled={parsed.done <= 0} aria-label="Decrease">−</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setProgress(g.id, Math.round(Math.min(parsed.total, parsed.done + 1) / parsed.total * 100)); }} disabled={parsed.done >= parsed.total} aria-label="Increase">+</button>
                        </div>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ssm-eminence)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                  <div
                    className="goal__bar"
                    style={{ cursor: 'pointer', marginLeft: 32 }}
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setProgress(g.id, Math.round(((e.clientX - r.left) / r.width) * 100)); }}
                    title="Click to set progress"
                  >
                    <div className="goal__fill" style={{ width: `${pct}%` }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <form className="task-input task-input--mini" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Icon name="plus" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add a ${tab.toLowerCase()} goal…`} />
        <button type="submit" className="submit">Add</button>
      </form>
    </Card>);

}

// ============================================================
// QUARTERLY WINS
// ============================================================
function QuarterlyWinsModule() {
  const { q, year } = currentQuarter();
  const [wins, setWins] = useLocalState('dash.qWins.v1', [
  { id: 'w1', text: 'Got back on the gym schedule after 6 weeks off.' },
  { id: 'w2', text: 'Closed first SSM partnership — $4k contract.' }]
  );
  const [draft, setDraft] = useState('');
  const add = () => {const v = draft.trim();if (!v) return;setWins([{ id: 'w' + Date.now(), text: v }, ...wins]);setDraft('');};

  return (
    <Card cls="m-qwins" title="Quarterly wins" count={`Q${q} ${year} · ${wins.length} logged`}>
      {wins.length === 0 ?
      <div className="empty"><strong>No wins logged yet</strong>Start celebrating your progress.</div> :

      <div className="wins">
          {wins.map((w) =>
        <div key={w.id} className="win">
              <span className="win__mark">★</span>
              <span className="win__text">{w.text}</span>
              <button className="task__delete" onClick={() => setWins(wins.filter((x) => x.id !== w.id))} aria-label="remove">
                <Icon name="trash" />
              </button>
            </div>
        )}
        </div>
      }
      <form className="task-input task-input--mini" onSubmit={(e) => {e.preventDefault();add();}}>
        <Icon name="plus" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Log a win…" />
        <button type="submit" className="submit">Add</button>
      </form>
    </Card>);

}

// ============================================================
// BOOKS READ
// ============================================================
function BooksReadModule() {
  const { q, year } = currentQuarter();
  const [books, setBooks] = useLocalState('dash.qBooks.v1', [
  { id: 'b1', title: 'The Mountain Is You', author: 'Brianna Wiest' }]
  );
  const [draft, setDraft] = useState('');
  const add = () => {const v = draft.trim();if (!v) return;setBooks([{ id: 'b' + Date.now(), title: v, author: '' }, ...books]);setDraft('');};

  return (
    <Card cls="m-qbooks" title="Books read" count={`Q${q} ${year} · ${books.length} book${books.length === 1 ? '' : 's'}`}>
      {books.length === 0 ?
      <div className="empty"><strong>No books finished yet</strong>Mark one complete to see it here.</div> :

      <div className="books">
          {books.map((b) =>
        <div key={b.id} className="book">
              <span className="book__icon"><Icon name="book" /></span>
              <div className="book__body">
                <div className="book__title">{b.title}</div>
                {b.author && <div className="book__author">{b.author}</div>}
              </div>
              <button className="task__delete" onClick={() => setBooks(books.filter((x) => x.id !== b.id))} aria-label="remove">
                <Icon name="trash" />
              </button>
            </div>
        )}
        </div>
      }
      <form className="task-input task-input--mini" onSubmit={(e) => {e.preventDefault();add();}}>
        <Icon name="plus" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a finished book…" />
        <button type="submit" className="submit">Add</button>
      </form>
    </Card>);

}

// ============================================================
// IDEA PARKING LOT
// ============================================================
function IdeaParkingLotModule() {
  const [ideas, setIdeas] = useLocalState('dash.ideas.v1', [
  { id: 'i1', text: 'Therapist match quiz — gamify with personality archetypes.' },
  { id: 'i2', text: 'Newsletter: weekly "what to say more about" prompt.' }]
  );
  const [draft, setDraft] = useState('');
  const add = () => {const v = draft.trim();if (!v) return;setIdeas([{ id: 'i' + Date.now(), text: v }, ...ideas]);setDraft('');};

  return (
    <Card cls="m-ideas" title="Idea parking lot" count={`${ideas.length} captured`}>
      {ideas.length === 0 ?
      <div className="empty"><strong>Your parking lot is empty</strong>Capture an idea now — act on it later.</div> :

      <div className="ideas">
          {ideas.map((i) =>
        <div key={i.id} className="idea">
              <span className="idea__mark"></span>
              <span className="idea__text">{i.text}</span>
              <button className="task__delete" onClick={() => setIdeas(ideas.filter((x) => x.id !== i.id))} aria-label="remove">
                <Icon name="trash" />
              </button>
            </div>
        )}
        </div>
      }
      <form className="task-input task-input--mini" onSubmit={(e) => {e.preventDefault();add();}}>
        <Icon name="plus" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Drop an idea…" />
        <button type="submit" className="submit">Park it</button>
      </form>
    </Card>);

}

// ============================================================
// YEAR — Lamibaby's Tenets (2026 Foundations)
// ============================================================
const TENETS = [
{ k: 't1', text: 'I exhibit the fruits of the Spirit.' },
{ k: 't2', text: 'I do not engage in behaviors that pose health risks I do not want to accept liability for.' },
{ k: 't3', text: "If I choose not to do something, I am consenting to not having something else I've wanted." },
{
  k: 't4',
  text: 'I own my narrative; other narratives do not have to align with mine; I can drop what does not align.',
  sub: {
    quote: 'Sensible people control their temper; they earn respect by overlooking wrongs.',
    ref: 'Proverbs 19:11 NLT'
  }
},
{ k: 't5', text: 'Forgiveness, kindness, and goodness matter.' }];


function YearVisionModule() {
  const year = new Date().getFullYear();
  const [tenets, setTenets] = useLocalState(`dash.tenets.${year}.v1`, TENETS);

  const update = (k, field, value) => {
    setTenets(tenets.map((t) => t.k === k ? { ...t, [field]: value } : t));
  };
  const updateSub = (k, field, value) => {
    setTenets(tenets.map((t) => t.k === k ?
    { ...t, sub: { ...(t.sub || { quote: '', ref: '' }), [field]: value } } :
    t));
  };
  const addTenet = () => setTenets([...tenets, { k: 't' + Date.now(), text: '' }]);
  const removeTenet = (k) => setTenets(tenets.filter((t) => t.k !== k));
  const reset = () => {
    if (!confirm('Reset tenets to defaults? Your edits will be lost.')) return;
    setTenets(TENETS);
  };

  return (
    <Card
      cls="m-yearvision"
      title={`${year} foundations`}
      count="Lamibaby's tenets"
      action={
      <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 10px' }} onClick={reset}>Reset</button>
          <button className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 10px' }} onClick={addTenet}>+ Add tenet</button>
        </div>
      }>
      
      <p style={{ fontSize: 12.5, color: 'var(--fg-secondary)', margin: '0 0 4px', lineHeight: 1.6 }}>
        The principles that guide every yes, every no, and every recalibration this year.
      </p>
      <ol className="tenets">
        {tenets.map((t, i) =>
        <li key={t.k} className="tenet">
            <span className="tenet__num">{i + 1}</span>
            <div className="tenet__body">
              <textarea
              className="tenet__text"
              value={t.text}
              onChange={(e) => update(t.k, 'text', e.target.value)}
              placeholder="A tenet you'll live by this year…"
              rows={1}
              onInput={(e) => {e.target.style.height = 'auto';e.target.style.height = e.target.scrollHeight + 'px';}} />
            
              {t.sub &&
            <div className="tenet__sub">
                  <span className="tenet__sub-mark">"</span>
                  <textarea
                className="tenet__sub-quote"
                value={t.sub.quote}
                onChange={(e) => updateSub(t.k, 'quote', e.target.value)}
                placeholder="Optional reference quote…"
                rows={1}
                onInput={(e) => {e.target.style.height = 'auto';e.target.style.height = e.target.scrollHeight + 'px';}} />
              
                  <input
                className="tenet__sub-ref"
                value={t.sub.ref}
                onChange={(e) => updateSub(t.k, 'ref', e.target.value)}
                placeholder="— source" />
              
                </div>
            }
              {!t.sub &&
            <button
              className="tenet__addsub"
              onClick={() => updateSub(t.k, 'quote', '')}
              type="button">
              + Add reference quote</button>
            }
            </div>
            <button className="tenet__remove" onClick={() => removeTenet(t.k)} aria-label="remove">×</button>
          </li>
        )}
      </ol>
    </Card>);

}

// ============================================================
// FOCUS BUCKETS
// ============================================================
function FocusBucketsModule() {
  const [buckets, setBuckets] = useLocalState('dash.buckets.v1', [
  { id: 'fb1', name: 'Wellness ERA (Mind, Body & Soul)', items: ['Train 4x/week', 'Therapy biweekly', 'Bedtime by 11'] },
  { id: 'fb2', name: 'Wealth ERA', items: ['Max out Roth', 'Diversify investments'] },
  { id: 'fb3', name: 'Personal Power', items: ['Say no without guilt'] },
  { id: 'fb4', name: 'God First', items: ['Sunday worship', 'Daily prayer'] }]
  );
  const [drafts, setDrafts] = useState({});

  const addItem = (id) => {
    const v = (drafts[id] || '').trim();if (!v) return;
    setBuckets(buckets.map((b) => b.id === id ? { ...b, items: [...b.items, v] } : b));
    setDrafts({ ...drafts, [id]: '' });
  };
  const removeItem = (id, i) => setBuckets(buckets.map((b) => b.id === id ? { ...b, items: b.items.filter((_, j) => j !== i) } : b));
  const renameBucket = (id, name) => setBuckets(buckets.map((b) => b.id === id ? { ...b, name } : b));
  const removeBucket = (id) => setBuckets(buckets.filter((b) => b.id !== id));
  const addBucket = () => setBuckets([...buckets, { id: 'fb' + Date.now(), name: 'New bucket', items: [] }]);

  return (
    <Card
      cls="m-buckets"
      title="Focus buckets"
      count="Areas of life you're actively investing in"
      action={<button className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 10px' }} onClick={addBucket}>+ New bucket</button>}>
      
      <div className="bucket-grid">
        {buckets.map((b) =>
        <div key={b.id} className="bucket">
            <div className="bucket__head">
              <input
              className="bucket__name"
              value={b.name}
              onChange={(e) => renameBucket(b.id, e.target.value)} />
            
              <button className="bucket__x" onClick={() => removeBucket(b.id)} aria-label="remove">×</button>
            </div>
            <div className="bucket__items">
              {b.items.length === 0 && <p className="bucket__empty">No items yet</p>}
              {b.items.map((it, i) =>
            <div key={i} className="bucket__item">
                  <span>{it}</span>
                  <button onClick={() => removeItem(b.id, i)} aria-label="remove">×</button>
                </div>
            )}
            </div>
            <form className="bucket__add" onSubmit={(e) => {e.preventDefault();addItem(b.id);}}>
              <input
              value={drafts[b.id] || ''}
              onChange={(e) => setDrafts({ ...drafts, [b.id]: e.target.value })}
              placeholder="Add item…" />
            
              <button type="submit">+</button>
            </form>
          </div>
        )}
      </div>
    </Card>);

}

// ============================================================
// EXPANDED HABIT TRACKER (for Habits view)
// ============================================================
const DAY_LETTERS_FULL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function HabitTrackerExpandedModule() {
  // re-uses dash.habits.v1 so toggles sync across views
  const [habits, setHabits] = useLocalState('dash.habits.v1', []);
  const week = weekDates();
  const todayI = todayISO();
  const totalCells = habits.length * 7;
  const doneCells = habits.reduce((s, h) => s + week.filter((d) => h.days?.[d]).length, 0);
  const score = totalCells ? Math.round(doneCells / totalCells * 100) : 0;

  const toggleDay = (hid, iso) => {
    setHabits(habits.map((h) => h.id === hid ? { ...h, days: { ...h.days, [iso]: !h.days[iso] } } : h));
  };

  return (
    <Card cls="m-hctrack" title="Habit tracker" count={fmtWeekLabel()} action={<span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>weekly score <strong style={{ color: 'var(--ssm-orange)', fontSize: 13 }}>{score}%</strong></span>}>
      <div className="goal__bar" style={{ height: 6 }}>
        <div className="goal__fill" style={{ width: `${score}%`, background: 'linear-gradient(90deg, var(--ssm-orange) 0%, var(--ssm-orange-light) 100%)' }}></div>
      </div>
      <p style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--fg-muted)', margin: '8px 0 0' }}>
        Daily habits
      </p>
      <div className="hctrack">
        <div className="hctrack__head">
          <span></span>
          <span className="hctrack__progress"></span>
          {week.map((iso, i) => {
            const d = new Date(iso);
            const isToday = iso === todayI;
            return (
              <span key={iso} className={`hctrack__day ${isToday ? 'is-today' : ''}`}>
                <span>{DAY_LETTERS_FULL[i]}</span>
                <span className="hctrack__daynum">{d.getDate()}</span>
              </span>);

          })}
        </div>
        {habits.map((h) => {
          const done = week.filter((d) => h.days?.[d]).length;
          const pct = done / 7 * 100;
          return (
            <div key={h.id} className="hctrack__row">
              <div className="hctrack__name">
                <span className="glyph">{h.glyph}</span>
                <span>{h.name}</span>
              </div>
              <div className="hctrack__pbar">
                <div style={{ width: `${pct}%` }}></div>
                <span className="hctrack__pcount">{done}/7</span>
              </div>
              {week.map((iso, i) => {
                const isFuture = iso > todayI;
                const isToday = iso === todayI;
                const isDone = !!h.days?.[iso];
                return (
                  <button
                    key={iso}
                    className={`hctrack__cell ${isDone ? 'is-done' : ''} ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}`}
                    onClick={() => !isFuture && toggleDay(h.id, iso)}>
                    
                    {isDone ? '✓' : ''}
                  </button>);

              })}
            </div>);

        })}
      </div>
    </Card>);

}

// ============================================================
// BUCKET LIST
// ============================================================
const BUCKET_CATS = ['Career', 'Financial', 'Health', 'Personal', 'Creative', 'Travel', 'Experience', 'Other'];
const CAT_COLOR = {
  Career: '#2F7568',
  Financial: 'var(--ssm-eminence)',
  Health: '#2F8F6E',
  Personal: 'var(--ssm-eminence-soft)',
  Creative: '#B5762A',
  Travel: 'var(--ssm-orange)',
  Experience: 'var(--ssm-eminence-deep)',
  Other: 'var(--ssm-graphite)'
};

function BucketListModule() {
  const [items, setItems] = useLocalState('dash.bucket.v1', [
  { id: 'k1', text: 'Hit $8k emergency fund', cat: 'Financial', done: false },
  { id: 'k2', text: 'Run a half marathon', cat: 'Health', done: false },
  { id: 'k3', text: 'Speak at a TEDx event', cat: 'Career', done: false },
  { id: 'k4', text: 'Launch SSM v2 onboarding', cat: 'Career', done: false },
  { id: 'k5', text: 'Buy a home', cat: 'Financial', done: false },
  { id: 'k6', text: 'Write a memoir', cat: 'Creative', done: false },
  { id: 'k7', text: 'Sponsor a scholarship', cat: 'Personal', done: false },
  { id: 'k8', text: 'Trip to Cape Town', cat: 'Travel', done: false },
  { id: 'k9', text: 'Read 6 books this quarter', cat: 'Personal', done: true },
  { id: 'k10', text: 'Pay off $6,000 in debt', cat: 'Financial', done: false },
  { id: 'k11', text: 'Take a pottery class', cat: 'Creative', done: false },
  { id: 'k12', text: 'Sabbatical month — no work', cat: 'Personal', done: false }]
  );
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState('');
  const [draftCat, setDraftCat] = useState('Career');

  const visible = items.filter((i) => filter === 'all' ? true : filter === 'todo' ? !i.done : i.done);
  const done = items.filter((i) => i.done).length;

  const add = (e) => {
    e?.preventDefault?.();
    const v = draft.trim();if (!v) return;
    setItems([...items, { id: 'k' + Date.now(), text: v, cat: draftCat, done: false }]);
    setDraft('');
  };

  return (
    <Card cls="m-bucket" title="Goals" count={`${done} of ${items.length} complete`}>
      <div className="goal__bar" style={{ height: 4, margin: '4px 0 0' }}>
        <div className="goal__fill" style={{ width: `${items.length ? done / items.length * 100 : 0}%`, background: 'linear-gradient(90deg, var(--ssm-orange) 0%, var(--ssm-orange-light) 100%)' }}></div>
      </div>

      <div className="bucket-add">
        <p className="bucket-add__label">Add a goal</p>
        <form onSubmit={add} className="bucket-add__row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What do you want to accomplish?" />
          
          <button type="submit" className="btn btn--primary" style={{ padding: '8px 16px', fontSize: 11.5 }}>Add</button>
        </form>
        <div className="bucket-cats">
          {BUCKET_CATS.map((c) =>
          <button
            key={c}
            type="button"
            className={`bucket-cat ${draftCat === c ? 'is-active' : ''}`}
            style={{ '--cc': CAT_COLOR[c] }}
            onClick={() => setDraftCat(c)}>
            {c}</button>
          )}
        </div>
      </div>

      <div className="pills" style={{ marginTop: 6 }}>
        {[
        { v: 'all', l: `All (${items.length})` },
        { v: 'todo', l: `To do (${items.filter((i) => !i.done).length})` },
        { v: 'done', l: `Done (${done})` }].
        map((p) =>
        <button key={p.v} className={`pill ${filter === p.v ? 'is-active' : ''}`} onClick={() => setFilter(p.v)}>{p.l}</button>
        )}
      </div>

      <div className="bucket-list">
        {visible.length === 0 && <div className="empty"><strong>No goals here yet.</strong>Add one above to get started.</div>}
        {visible.map((it) =>
        <div key={it.id} className={`bucket-item ${it.done ? 'is-done' : ''}`}>
            <button className={`check ${it.done ? 'is-checked' : ''}`} onClick={() => setItems(items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x))}>
              <Icon name="check" />
            </button>
            <div className="bucket-item__body">
              <span className="bucket-item__text">{it.text}</span>
              <span className="bucket-item__cat" style={{ '--cc': CAT_COLOR[it.cat] }}>{it.cat}</span>
            </div>
            <button className="task__delete" onClick={() => setItems(items.filter((x) => x.id !== it.id))} aria-label="remove">
              <Icon name="trash" />
            </button>
          </div>
        )}
      </div>
    </Card>);

}

// ============================================================
// UPCOMING EVENTS — curated significant dates (birthdays, trips, etc.)
// ============================================================
const EVENT_TAGS = [
  { v: 'birthday', l: 'Birthday', e: '🎂' },
  { v: 'trip',     l: 'Trip',     e: '✈️' },
  { v: 'event',    l: 'Event',    e: '🎉' },
  { v: 'work',     l: 'Work',     e: '💼' },
  { v: 'personal', l: 'Personal', e: '💜' },
  { v: 'other',    l: 'Other',    e: '📅' },
];
const tagEmoji = (v) => (EVENT_TAGS.find((t) => t.v === v) || EVENT_TAGS[5]).e;
const tagLabel = (v) => (EVENT_TAGS.find((t) => t.v === v) || EVENT_TAGS[5]).l;

function UpcomingEventsModule() {
  const cal = useCalendar();
  // Manual fallback list used when calendar is not connected
  const [manualEvents, setManualEvents] = useLocalState('dash.upcoming.v1', [
    { id: 'ue1', title: "Mom's birthday", date: '2026-06-14', tag: 'birthday' },
    { id: 'ue2', title: 'SSM grant deadline', date: '2026-06-30', tag: 'work' },
    { id: 'ue3', title: 'Dallas girls trip', date: '2026-07-04', tag: 'trip' },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', date: '', tag: 'event' });

  const today = todayISO();
  const connected = cal.status === 'ready';

  const daysUntil = (iso) => Math.round(
    (new Date(iso + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000
  );

  const dayLabel = (n) => {
    if (n === 0) return { text: 'Today',    cls: 'is-today' };
    if (n === 1) return { text: 'Tomorrow', cls: 'is-soon' };
    if (n > 0 && n <= 7) return { text: `In ${n} days`, cls: 'is-soon' };
    if (n > 0) return { text: `In ${n} days`, cls: '' };
    return { text: `${Math.abs(n)}d ago`, cls: 'is-past' };
  };

  // ── Calendar-fed list — all-day events OR "Events and Plans" calendar, next 7 days ──
  const isEventsAndPlans = (e) => (e.calName || '').toLowerCase().includes('events and plans');
  const calEvents = connected ? (cal.upcomingEvents || []).filter((e) => {
    const d = daysUntil(e.date);
    return d >= 0 && d <= 7 && (e.allDay || isEventsAndPlans(e));
  }) : [];
  const calSorted = [...calEvents].sort((a, b) => a.date.localeCompare(b.date));
  const calUpcoming = calSorted.filter((e) => daysUntil(e.date) >= 0).length;

  // ── Manual list (fallback) ─────────────────────────────────
  const manualSorted = [...manualEvents].sort((a, b) => {
    const da = daysUntil(a.date), db = daysUntil(b.date);
    if ((da < 0) !== (db < 0)) return da < 0 ? 1 : -1;
    return da - db;
  });

  const addEvent = () => {
    if (!draft.title.trim() || !draft.date) return;
    setManualEvents([...manualEvents, { id: 'ue' + Date.now(), ...draft, title: draft.title.trim() }]);
    setDraft({ title: '', date: '', tag: 'event' });
    setAdding(false);
  };
  const remove = (id) => setManualEvents(manualEvents.filter((e) => e.id !== id));

  const fmtTime = (mins) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // ── Connected view ─────────────────────────────────────────
  if (connected) {
    return (
      <Card cls="m-events" title="Upcoming" count={`${calUpcoming} ahead`}>
        {calSorted.length === 0 && (
          <div className="empty"><strong>Nothing in the next 60 days.</strong></div>
        )}
        <div className="ue-list">
          {calSorted.map((ev) => {
            const n = daysUntil(ev.date);
            const { text, cls } = dayLabel(n);
            const d = new Date(ev.date + 'T12:00:00');
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={ev.id} className={`ue-item ${cls}`}>
                <span className="ue-item__dot" style={{ background: ev.calColor || 'var(--ssm-eminence)' }}></span>
                <div className="ue-item__body">
                  <span className="ue-item__title">{ev.title}</span>
                  <span className="ue-item__date">
                    {dateStr}{!ev.allDay ? ` · ${fmtTime(ev.start)}` : ''}
                  </span>
                </div>
                <span className={`ue-item__badge ${cls}`}>{text}</span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // ── Disconnected fallback — manual list + connect prompt ───
  return (
    <Card
      cls="m-events"
      title="Upcoming"
      count={`${manualSorted.filter((e) => daysUntil(e.date) >= 0).length} ahead`}
      action={
        <button
          onClick={() => setAdding((s) => !s)}
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--ssm-eminence)', letterSpacing: '0.04em' }}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      }>
      <CalendarBanner cal={cal} />
      {adding && (
        <div className="ue-add">
          <input className="ue-add__title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Event name" autoFocus />
          <input type="date" className="ue-add__date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <div className="ue-add__tags">
            {EVENT_TAGS.map((t) => (
              <button key={t.v} className={`ue-tag ${draft.tag === t.v ? 'is-active' : ''}`} onClick={() => setDraft({ ...draft, tag: t.v })}>
                {t.e} {t.l}
              </button>
            ))}
          </div>
          <button className="btn btn--primary" style={{ alignSelf: 'flex-start', padding: '6px 16px', fontSize: 11 }} onClick={addEvent}>Save</button>
        </div>
      )}
      {manualSorted.length === 0 && !adding && (
        <div className="empty"><strong>Nothing added yet.</strong> Connect your calendar or hit "+ Add".</div>
      )}
      <div className="ue-list">
        {manualSorted.map((ev) => {
          const n = daysUntil(ev.date);
          const { text, cls } = dayLabel(n);
          const d = new Date(ev.date + 'T12:00:00');
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <div key={ev.id} className={`ue-item ${cls}`}>
              <span className="ue-item__emoji">{tagEmoji(ev.tag)}</span>
              <div className="ue-item__body">
                <span className="ue-item__title">{ev.title}</span>
                <span className="ue-item__date">{dateStr} · {tagLabel(ev.tag)}</span>
              </div>
              <span className={`ue-item__badge ${cls}`}>{text}</span>
              <button className="task__delete" onClick={() => remove(ev.id)} aria-label="remove"><Icon name="trash" /></button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================
// VIEWS — orchestrate which modules render per tab
// ============================================================
function WeekView({ nowMinutes }) {
  return (
    <div className="grid grid--week">
      <WeeklyFocusModule />
      <TasksModule />
      <ScheduleModule nowMinutes={nowMinutes} />
      <HabitsModule />
      <CurrentlyReadingModule />
      <UpcomingEventsModule />
      <FinancesModule compact />
      <SocialModule />
      <LinksModule />
    </div>);

}

function MonthView() {
  return (
    <div className="grid grid--month">
      <MonthCalendarModule />
      <CurrentlyReadingModule />
      <MonthlyReflectionModule />
    </div>);

}

function QuarterView() {
  return (
    <div className="grid grid--quarter">
      <GymConsistencyModule />
      <QuarterlyGoalsModule />
      <QuarterlyWinsModule />
      <BooksReadModule />
      <IdeaParkingLotModule />
    </div>);

}

function YearView() {
  return (
    <div className="grid grid--year">
      <YearVisionModule />
      <FocusBucketsModule />
    </div>);

}

function HabitsView() {
  return (
    <div className="grid grid--single">
      <HabitTrackerExpandedModule />
    </div>);

}

function BucketListView() {
  return (
    <div className="grid grid--single">
      <GoalsModule />
    </div>);
}

// ============================================================
// FINANCE VIEW — donut + budget bars
// ============================================================
const DONUT_COLORS = ['#6F3F8E', '#E0904F', '#2F8F6E', '#5B8FD4', '#B5762A'];
const DEBT_COLOR   = '#C0392B';

function parseAmt(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[$,()]/g, '')) || 0;
}

function NetWorthDonutModule() {
  const cal = useCalendar();
  const fd  = cal.financeData;

  if (!fd || fd._error || !fd.assetBreakdown) {
    return (
      <Card cls="m-fin-donut" title="Net worth breakdown" count="Assets vs debts">
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
          {fd?._error ? `Error: ${fd._error}` : 'Connect Google to load live data.'}
        </p>
      </Card>
    );
  }

  // Merge Cash & Banking + Savings Goals into one segment
  const mergedAssets = (fd.assetBreakdown || []).reduce((acc, a) => {
    const isCash    = /cash|banking/i.test(a.name);
    const isSavings = /savings/i.test(a.name);
    const key = (isCash || isSavings) ? 'Cash & Savings' : a.name;
    const existing = acc.find(x => x.name === key);
    if (existing) { existing.value += a.value; }
    else { acc.push({ name: key, value: a.value }); }
    return acc;
  }, []);

  const assets = mergedAssets;
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalDebts  = parseAmt(fd.totalDebts);
  const netWorth    = parseAmt(fd.netWorth);

  // SVG donut — assets as coloured segments, debts as a single red segment
  const SIZE = 220, CX = SIZE / 2, CY = SIZE / 2, R = 80, STROKE = 28;
  const circ = 2 * Math.PI * R;
  const grandTotal = totalAssets + totalDebts;
  const allSegments = [
    ...assets.map((a, i) => ({ label: a.name, value: a.value, color: DONUT_COLORS[i % DONUT_COLORS.length] })),
    { label: 'Total debts', value: totalDebts, color: DEBT_COLOR },
  ];
  let cumulative = 0;
  const segments = allSegments.map(seg => {
    const pct    = grandTotal > 0 ? seg.value / grandTotal : 0;
    const dash   = pct * circ;
    const offset = circ - cumulative * circ;
    cumulative  += pct;
    return { ...seg, dash, offset, pct };
  });

  const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

  return (
    <Card cls="m-fin-donut" title="Net worth breakdown" count={`Net worth ${fd.netWorth}`}>
      <div className="fin-donut-wrap">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--ssm-mist)" strokeWidth={STROKE} />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              strokeDashoffset={s.offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: `${CX}px ${CY}px`, transition: 'stroke-dasharray 0.6s ease' }}
            />
          ))}
          <text x={CX} y={CY - 10} textAnchor="middle" style={{ fontSize: 12, fill: 'var(--fg-muted)', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Net worth</text>
          <text x={CX} y={CY + 14} textAnchor="middle" style={{ fontSize: 18, fill: 'var(--ssm-eminence)', fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>{fd.netWorth}</text>
        </svg>
        <div className="fin-donut-legend">
          {segments.map((s, i) => (
            <div key={i} className="fin-donut-legend__item">
              <span className="fin-donut-legend__dot" style={{ background: s.color }} />
              <span className="fin-donut-legend__label">{s.label}</span>
              <span className="fin-donut-legend__val">{fmt(s.value)}</span>
              <span className="fin-donut-legend__pct">{(s.pct * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function BudgetBarsModule() {
  const cal = useCalendar();
  const fd  = cal.financeData;

  if (!fd || fd._error || !fd.budgetCategories) {
    return (
      <Card cls="m-fin-budget" title="Budget vs spent" count="Month to date">
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
          {fd?._error ? `Error: ${fd._error}` : 'Connect Google to load live data.'}
        </p>
      </Card>
    );
  }

  const cats = fd.budgetCategories.filter(c => c.budget > 0 || c.spent > 0);
  const maxVal = Math.max(...cats.map(c => Math.max(c.spent, c.budget)), 1);

  const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

  return (
    <Card cls="m-fin-budget" title="Budget vs spent" count="Month to date">
      <div className="fin-bars">
        {cats.map((c, i) => {
          const over     = c.spent > c.budget && c.budget > 0;
          const budgetW  = (c.budget / maxVal) * 100;
          const spentW   = (c.spent  / maxVal) * 100;
          return (
            <div key={i} className="fin-bar-row">
              <div className="fin-bar-row__label">{c.name}</div>
              <div className="fin-bar-row__track">
                <div className="fin-bar-row__budget" style={{ width: `${budgetW}%` }} />
                <div
                  className="fin-bar-row__spent"
                  style={{ width: `${spentW}%`, background: over ? DEBT_COLOR : 'var(--ssm-eminence)' }}
                />
              </div>
              <div className="fin-bar-row__vals">
                <span style={{ color: over ? DEBT_COLOR : 'var(--fg-primary)', fontWeight: over ? 700 : 500 }}>{fmt(c.spent)}</span>
                <span style={{ color: 'var(--fg-muted)' }}>/ {fmt(c.budget)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FinanceView() {
  return (
    <div className="grid grid--finance">
      <FinancesModule />
      <NetWorthDonutModule />
      <BudgetBarsModule />
    </div>
  );
}

Object.assign(window, {
  WeekView, MonthView, QuarterView, YearView, HabitsView, BucketListView, FinanceView,
  // expose individual modules in case Tweaks or other code references them
  WeeklyFocusModule, CurrentlyReadingModule, ReflectionModule, WeekEventsModule, UpcomingEventsModule,
  MonthCalendarModule, MonthlyReflectionModule,
  GymConsistencyModule, FinancesModule, QuarterlyGoalsModule, QuarterlyWinsModule, BooksReadModule, IdeaParkingLotModule,
  YearVisionModule, FocusBucketsModule,
  HabitTrackerExpandedModule, BucketListModule
});