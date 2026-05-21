/* global React */
/* global Card, Icon, useLocalState, todayISO */
/* global TasksModule, HabitsModule, ScheduleModule, GoalsModule, LinksModule, SocialModule */
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
function CurrentlyReadingModule() {
  const [book, setBook] = useLocalState('dash.book.v1', {
    title: 'Before the Coffee Gets Cold',
    author: 'Toshikazu Kawaguchi',
    status: 'reading',
    pages: 213,
    progress: 86
  });
  const STATUSES = [
  { v: 'reading', l: 'Reading' },
  { v: 'paused', l: 'Paused' },
  { v: 'completed', l: 'Completed' }];

  return (
    <Card cls="m-reading" title="Currently reading">
      <div className="reading">
        <div className="reading__cover">
          <div className="reading__cover-inner">
            <div className="reading__cover-spine"></div>
            <div className="reading__cover-title">{book.title.split(' ').slice(0, 3).join(' ')}</div>
            <div className="reading__cover-author">{book.author.split(' ').slice(-1)}</div>
          </div>
        </div>
        <div className="reading__meta">
          <input
            className="reading__title"
            value={book.title}
            onChange={(e) => setBook({ ...book, title: e.target.value })} />
          
          <input
            className="reading__author"
            value={book.author}
            onChange={(e) => setBook({ ...book, author: e.target.value })} />
          
          <div className="reading__status">
            {STATUSES.map((s) =>
            <button
              key={s.v}
              className={`reading__pill ${book.status === s.v ? 'is-active' : ''} reading__pill--${s.v}`}
              onClick={() => setBook({ ...book, status: s.v })}>
              
                {book.status === s.v && '● '}
                {s.l}
              </button>
            )}
          </div>
          <p className="reading__note">Marking complete will log it to your quarter.</p>
        </div>
      </div>
    </Card>);

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
      title="Gym"
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
  // weeks of sessions count; index 0 = oldest, 12 = current week
  const [data, setData] = useLocalState('dash.gymBars.v1', [2, 3, 2, 4, 3, 5, 4, 3, 5, 4, 6, 3, 5]);
  const max = Math.max(...data, 5);
  const avg = (data.reduce((s, x) => s + x, 0) / data.length).toFixed(1);
  return (
    <Card cls="m-gymconsist" title="Gym consistency" count="Last 13 weeks" action={<span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>avg <strong style={{ color: 'var(--ssm-eminence)' }}>{avg}</strong>/wk</span>}>
      <div className="gymbars">
        {data.map((v, i) =>
        <div key={i} className="gymbar-col" title={`Week ${i + 1}: ${v} sessions`}>
            <span className="gymbar" style={{ height: `${v / max * 100}%`, background: i === data.length - 1 ? 'var(--ssm-orange)' : 'var(--ssm-orange-light)' }}></span>
          </div>
        )}
      </div>
      <div className="gymbars__foot">
        <span>13 weeks ago</span>
        <span>This week</span>
      </div>
    </Card>);

}

// ============================================================
// FINANCES
// ============================================================
function FinancesModule({ compact = false }) {
  const { q, year } = currentQuarter();
  const [data, setData] = useLocalState('dash.finances.v1', {
    debtTotal: 18500,
    debtPaid: 4200,
    savingsGoal: 12000,
    savingsHave: 5680,
    monthlyIncome: 8400,
    monthlySpend: 5120
  });

  const debtPct = Math.round(data.debtPaid / Math.max(1, data.debtTotal) * 100);
  const saveProgressPct = Math.round(data.savingsHave / Math.max(1, data.savingsGoal) * 100);
  const netWorth = data.savingsHave - (data.debtTotal - data.debtPaid);
  const cashflow = data.monthlyIncome - data.monthlySpend;

  const updateNum = (k, v) => setData({ ...data, [k]: Math.max(0, +v || 0) });
  const fmt = (n) => '$' + n.toLocaleString();

  if (compact) {
    return (
      <Card cls="m-finance" title="Finances" count={`Q${q} ${year}`}>
        <div className="fin-mini">
          <div className="fin-mini__row">
            <div>
              <p className="fin-mini__k">Net worth</p>
              <p className={`fin-mini__v ${netWorth >= 0 ? 'is-pos' : 'is-neg'}`}>{netWorth >= 0 ? '' : '-'}{fmt(Math.abs(netWorth))}</p>
            </div>
            <div>
              <p className="fin-mini__k">Cash flow / mo</p>
              <p className={`fin-mini__v ${cashflow >= 0 ? 'is-pos' : 'is-neg'}`}>{cashflow >= 0 ? '+' : ''}{fmt(cashflow)}</p>
            </div>
          </div>
          <div className="fin-mini__bars">
            <div>
              <div className="fin-mini__barhead"><span>Debt paid</span><strong>{debtPct}%</strong></div>
              <div className="goal__bar"><div className="goal__fill" style={{ width: `${debtPct}%`, background: 'linear-gradient(90deg, var(--ssm-orange) 0%, var(--ssm-orange-light) 100%)' }}></div></div>
            </div>
            <div>
              <div className="fin-mini__barhead"><span>Savings progress</span><strong>{saveProgressPct}%</strong></div>
              <div className="goal__bar"><div className="goal__fill" style={{ width: `${saveProgressPct}%` }}></div></div>
            </div>
          </div>
        </div>
      </Card>);

  }

  return (
    <Card cls="m-finance" title="Finances" count={`Q${q} ${year} · debt paydown & savings`}>
      <div className="fin-grid">
        <div className="fin-stat">
          <p className="fin-stat__k">Net worth</p>
          <p className={`fin-stat__v ${netWorth >= 0 ? 'is-pos' : 'is-neg'}`}>{netWorth >= 0 ? '' : '-'}{fmt(Math.abs(netWorth))}</p>
          <p className="fin-stat__sub">savings − remaining debt</p>
        </div>
        <div className="fin-stat">
          <p className="fin-stat__k">Monthly cash flow</p>
          <p className={`fin-stat__v ${cashflow >= 0 ? 'is-pos' : 'is-neg'}`}>{cashflow >= 0 ? '+' : ''}{fmt(cashflow)}</p>
          <p className="fin-stat__sub">income − spend</p>
        </div>
        <div className="fin-stat">
          <p className="fin-stat__k">Debt remaining</p>
          <p className="fin-stat__v">{fmt(Math.max(0, data.debtTotal - data.debtPaid))}</p>
          <p className="fin-stat__sub">of {fmt(data.debtTotal)} total</p>
        </div>
        <div className="fin-stat">
          <p className="fin-stat__k">Savings</p>
          <p className="fin-stat__v">{fmt(data.savingsHave)}</p>
          <p className="fin-stat__sub">toward {fmt(data.savingsGoal)} goal</p>
        </div>
      </div>

      <div className="fin-bar">
        <div className="fin-bar__head">
          <span>Debt paid off</span>
          <span className="fin-bar__pct">{debtPct}% <span style={{ color: 'var(--fg-muted)' }}>· {fmt(data.debtTotal - data.debtPaid)} remaining</span></span>
        </div>
        <div className="goal__bar"><div className="goal__fill" style={{ width: `${debtPct}%`, background: 'linear-gradient(90deg, var(--ssm-orange) 0%, var(--ssm-orange-light) 100%)' }}></div></div>
      </div>
      <div className="fin-bar">
        <div className="fin-bar__head">
          <span>Savings progress</span>
          <span className="fin-bar__pct">{saveProgressPct}% <span style={{ color: 'var(--fg-muted)' }}>· {fmt(data.savingsGoal - data.savingsHave)} to go</span></span>
        </div>
        <div className="goal__bar"><div className="goal__fill" style={{ width: `${saveProgressPct}%` }}></div></div>
      </div>

      <details className="fin-edit">
        <summary>Edit values</summary>
        <div className="fin-edit__grid">
          {[
          ['debtTotal', 'Total debt'],
          ['debtPaid', 'Debt paid'],
          ['savingsGoal', 'Savings goal'],
          ['savingsHave', 'Saved so far'],
          ['monthlyIncome', 'Monthly income'],
          ['monthlySpend', 'Monthly spend']].
          map(([k, label]) =>
          <label key={k}>
              <span>{label}</span>
              <input type="number" value={data[k]} onChange={(e) => updateNum(k, e.target.value)} />
            </label>
          )}
        </div>
      </details>
    </Card>);

}

// ============================================================
// QUARTERLY GOALS (tabbed)
// ============================================================
const QGOAL_TABS = ['Finance', 'Health', 'Business', 'Personal'];
function QuarterlyGoalsModule() {
  const { q, year } = currentQuarter();
  const [goals, setGoals] = useLocalState('dash.qGoals.v1', [
  { id: 'qg1', tab: 'Finance', text: 'Pay off $6,000 in debt', done: false },
  { id: 'qg2', tab: 'Finance', text: 'Hit $8k in emergency fund', done: false },
  { id: 'qg3', tab: 'Health', text: 'Hit 60 gym sessions', done: false },
  { id: 'qg4', tab: 'Business', text: 'Launch SSM v2 onboarding', done: false },
  { id: 'qg5', tab: 'Personal', text: 'Read 6 books', done: true }]
  );
  const [tab, setTab] = useState('Finance');
  const [draft, setDraft] = useState('');

  const visible = goals.filter((g) => g.tab === tab);
  const complete = goals.filter((g) => g.done).length;

  const add = () => {
    const v = draft.trim();if (!v) return;
    setGoals([...goals, { id: 'qg' + Date.now(), tab, text: v, done: false }]);
    setDraft('');
  };

  return (
    <Card cls="m-qgoals" title="Quarterly goals" count={`Q${q} ${year} · ${complete}/${goals.length} complete`}>
      <div className="pills" style={{ marginBottom: 4 }}>
        {QGOAL_TABS.map((k) =>
        <button key={k} className={`pill ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{k}</button>
        )}
      </div>
      <div className="task-list" style={{ maxHeight: 220 }}>
        {visible.length === 0 && <div className="empty"><strong>No {tab.toLowerCase()} goals yet.</strong>Add your first one below.</div>}
        {visible.map((g) =>
        <div key={g.id} className={`task ${g.done ? 'is-done' : ''}`}>
            <button className={`check ${g.done ? 'is-checked' : ''}`} onClick={() => setGoals(goals.map((x) => x.id === g.id ? { ...x, done: !x.done } : x))}>
              <Icon name="check" />
            </button>
            <div className="task__body"><span className="task__title">{g.text}</span></div>
            <button className="task__delete" onClick={() => setGoals(goals.filter((x) => x.id !== g.id))} aria-label="remove">
              <Icon name="trash" />
            </button>
          </div>
        )}
      </div>
      <form className="task-input task-input--mini" onSubmit={(e) => {e.preventDefault();add();}}>
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
      <WeekEventsModule />
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
      <FinancesModule />
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

Object.assign(window, {
  WeekView, MonthView, QuarterView, YearView, HabitsView, BucketListView,
  // expose individual modules in case Tweaks or other code references them
  WeeklyFocusModule, CurrentlyReadingModule, ReflectionModule, WeekEventsModule,
  MonthCalendarModule, MonthlyReflectionModule,
  GymConsistencyModule, FinancesModule, QuarterlyGoalsModule, QuarterlyWinsModule, BooksReadModule, IdeaParkingLotModule,
  YearVisionModule, FocusBucketsModule,
  HabitTrackerExpandedModule, BucketListModule
});