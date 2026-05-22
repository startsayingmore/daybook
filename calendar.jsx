/* global React */
// calendar.jsx — Google Calendar OAuth + multi-calendar event fetching
// Exposes: useCalendar(), CalendarBanner, gcalStore
const { useState, useEffect } = React;

const GCAL_CLIENT_ID = ((window.DAYBOOK_CONFIG || {}).gcalClientId || '').trim();
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const SELECTED_KEY = 'dash.gcal.selectedCals';

// ── Helpers ──────────────────────────────────────────────────────────────────

const pad2 = (n) => String(n).padStart(2, '0');

const toLocalISO = (d) => {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const hh = pad2(Math.floor(Math.abs(off) / 60));
  const mm = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}${sign}${hh}:${mm}`;
};

const todayMidnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return toLocalISO(d); };
const todayEndOfDay = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return toLocalISO(d); };
const minsFromMidnight = (isoStr) => { const d = new Date(isoStr); return d.getHours() * 60 + d.getMinutes(); };

const gEventToInternal = (e, calColor) => {
  const isAllDay = !e.start.dateTime;
  const startMins = isAllDay ? 0 : minsFromMidnight(e.start.dateTime);
  const dur = isAllDay
    ? 1440
    : Math.max(15, Math.round((new Date(e.end.dateTime) - new Date(e.start.dateTime)) / 60000));
  const location = e.location ? e.location.split(',')[0].trim() : '';
  const attendeeNames = (e.attendees || [])
    .filter(a => !a.self)
    .map(a => a.displayName || a.email.split('@')[0])
    .slice(0, 3)
    .join(', ');
  const sub = [location, attendeeNames].filter(Boolean).join(' · ') || e.description?.replace(/<[^>]+>/g, '').slice(0, 60) || '';
  return { id: e.id, start: startMins, dur, title: e.summary || '(No title)', sub, allDay: isAllDay, htmlLink: e.htmlLink, calColor };
};

// Load persisted selected calendar IDs (null = all selected)
const loadSelectedIds = () => {
  try { const raw = localStorage.getItem(SELECTED_KEY); return raw ? new Set(JSON.parse(raw)) : null; } catch { return null; }
};
const saveSelectedIds = (set) => {
  try { localStorage.setItem(SELECTED_KEY, JSON.stringify(set ? [...set] : null)); } catch {}
};

// ── API calls ─────────────────────────────────────────────────────────────────

async function apiFetch(token, path) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) { const e = new Error('Unauthorized'); e.code = 401; throw e; }
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  return res.json();
}

async function fetchCalendarList(token) {
  const data = await apiFetch(token, '/users/me/calendarList?minAccessRole=reader');
  return (data.items || []).map(c => ({
    id: c.id,
    name: c.summaryOverride || c.summary,
    color: c.backgroundColor || '#6F3F8E',
    primary: !!c.primary,
  }));
}

async function fetchEventsForCalendar(token, calId, calColor) {
  const params = new URLSearchParams({
    timeMin: todayMidnight(),
    timeMax: todayEndOfDay(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '25',
  });
  const data = await apiFetch(token, `/calendars/${encodeURIComponent(calId)}/events?${params}`);
  return (data.items || []).map(e => gEventToInternal(e, calColor));
}

async function fetchAllEvents(token, calendarList, selectedIds) {
  const activeCals = selectedIds
    ? calendarList.filter(c => selectedIds.has(c.id))
    : calendarList;
  const results = await Promise.all(activeCals.map(c => fetchEventsForCalendar(token, c.id, c.color)));
  return results.flat().sort((a, b) => a.start - b.start);
}

// ── Store ─────────────────────────────────────────────────────────────────────

const gcalStore = (() => {
  let state = {
    status: 'idle',   // idle | loading | ready | error | unconfigured | no_gis
    events: null,
    calendarList: null,
    selectedIds: loadSelectedIds(),
    token: null,
    error: null,
  };
  const listeners = new Set();
  const set = (patch) => { state = { ...state, ...patch }; listeners.forEach(fn => fn({ ...state })); };
  const get = () => ({ ...state });
  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  const doFetch = async (token, calendarList, selectedIds) => {
    try {
      const cals = calendarList || await fetchCalendarList(token);
      const events = await fetchAllEvents(token, cals, selectedIds);
      set({ status: 'ready', token, calendarList: cals, events });
    } catch (e) {
      if (e.code === 401) { set({ status: 'idle', token: null, events: null, calendarList: null }); connect(); }
      else { set({ status: 'error', error: e.message }); }
    }
  };

  const connect = () => {
    if (!GCAL_CLIENT_ID) { set({ status: 'unconfigured' }); return; }
    if (!window.google?.accounts?.oauth2) { set({ status: 'no_gis' }); return; }
    set({ status: 'loading' });
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GCAL_CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { set({ status: 'error', error: resp.error }); return; }
        doFetch(resp.access_token, null, state.selectedIds);
      },
    });
    client.requestAccessToken({ prompt: state.token ? '' : undefined });
  };

  const refresh = () => {
    if (!state.token) { connect(); return; }
    set({ status: 'loading' });
    doFetch(state.token, state.calendarList, state.selectedIds);
  };

  const toggleCalendar = (id) => {
    if (!state.calendarList) return;
    // null means "all selected" — expand to explicit set first
    const current = state.selectedIds ?? new Set(state.calendarList.map(c => c.id));
    const next = new Set(current);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    // If everything is selected, collapse back to null
    const allIds = new Set(state.calendarList.map(c => c.id));
    const newSelected = [...next].every(id => allIds.has(id)) && next.size === allIds.size ? null : next;
    saveSelectedIds(newSelected);
    set({ status: 'loading', selectedIds: newSelected });
    doFetch(state.token, state.calendarList, newSelected);
  };

  const disconnect = () => {
    if (state.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(state.token, () => {});
    set({ status: 'idle', events: null, token: null, calendarList: null, error: null });
  };

  return { get, subscribe, connect, refresh, disconnect, toggleCalendar };
})();

// ── Hook ──────────────────────────────────────────────────────────────────────

function useCalendar() {
  const [state, setState] = useState(gcalStore.get());
  useEffect(() => gcalStore.subscribe(setState), []);
  return state;
}

// ── CalendarBanner ────────────────────────────────────────────────────────────

function CalendarBanner({ cal }) {
  const { status, events, error, calendarList, selectedIds } = cal;
  const [showCals, setShowCals] = useState(false);

  const base = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, marginBottom: 2 };

  if (status === 'idle') return (
    <div style={{ ...base, background: 'var(--ssm-eminence-tint)', color: 'var(--ssm-eminence)' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span style={{ flex: 1 }}>Connect your real Google Calendar</span>
      <button onClick={() => gcalStore.connect()} style={{ padding: '4px 12px', background: 'var(--ssm-eminence)', color: 'white', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>Connect</button>
    </div>
  );

  if (status === 'unconfigured') return (
    <div style={{ ...base, background: 'rgba(181,118,42,0.1)', color: 'var(--fg-warning)' }}>
      <span>Add your Client ID in <code style={{ fontSize: 11 }}>config.js</code> to connect Google Calendar</span>
    </div>
  );

  if (status === 'no_gis') return (
    <div style={{ ...base, background: 'rgba(179,58,58,0.08)', color: 'var(--fg-error)' }}>
      <span>Google Identity Services script not loaded — check your connection</span>
    </div>
  );

  if (status === 'loading') return (
    <div style={{ ...base, background: 'var(--ssm-eminence-tint)', color: 'var(--ssm-eminence)' }}>
      <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--ssm-eminence)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'gcal-spin 0.7s linear infinite' }}></span>
      <span>Fetching your calendars…</span>
      <style>{`@keyframes gcal-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (status === 'error') return (
    <div style={{ ...base, background: 'rgba(179,58,58,0.08)', color: 'var(--fg-error)' }}>
      <span style={{ flex: 1 }}>Calendar error{error ? `: ${error}` : ''}</span>
      <button onClick={() => gcalStore.connect()} style={{ padding: '3px 10px', background: 'var(--fg-error)', color: 'white', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>Retry</button>
    </div>
  );

  if (status === 'ready') {
    const count = events?.length ?? 0;
    const activeCount = selectedIds ? selectedIds.size : (calendarList?.length ?? 0);
    const totalCount = calendarList?.length ?? 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...base, background: 'rgba(47,143,110,0.08)', color: 'var(--fg-success)', justifyContent: 'space-between', marginBottom: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--fg-success)', display: 'inline-block' }}></span>
            {count === 0 ? 'No events today' : `${count} event${count === 1 ? '' : 's'} today`}
            {totalCount > 1 && (
              <span style={{ fontWeight: 500, color: 'var(--fg-muted)', fontSize: 11 }}>
                · {activeCount} of {totalCount} calendar{totalCount === 1 ? '' : 's'}
              </span>
            )}
          </span>
          <span style={{ display: 'flex', gap: 10 }}>
            {totalCount > 1 && (
              <button
                onClick={() => setShowCals(s => !s)}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-success)', letterSpacing: '0.04em' }}
              >
                {showCals ? 'Hide' : 'Calendars'}
              </button>
            )}
            <button onClick={() => gcalStore.refresh()} style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-success)', letterSpacing: '0.04em' }}>Refresh</button>
            <button onClick={() => gcalStore.disconnect()} style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', letterSpacing: '0.04em' }}>Disconnect</button>
          </span>
        </div>

        {showCals && calendarList && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 12px', background: 'var(--ssm-paper)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            {calendarList.map(c => {
              const isActive = !selectedIds || selectedIds.has(c.id);
              return (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }}></span>
                  <span style={{ flex: 1, fontWeight: 500, color: isActive ? 'var(--fg-primary)' : 'var(--fg-muted)', textDecoration: isActive ? 'none' : 'line-through' }}>
                    {c.name}{c.primary ? ' (primary)' : ''}
                  </span>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => gcalStore.toggleCalendar(c.id)}
                    style={{ accentColor: c.color, width: 14, height: 14 }}
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Update ScheduleModule event dots to show calendar color
// Expose to global scope
Object.assign(window, { gcalStore, useCalendar, CalendarBanner });
