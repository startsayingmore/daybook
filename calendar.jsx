/* global React */
// calendar.jsx — Google Calendar OAuth + event fetching
// Exposes: useCalendar(), CalendarBanner, gcalStore
const { useState, useEffect } = React;

const GCAL_CLIENT_ID = ((window.DAYBOOK_CONFIG || {}).gcalClientId || '').trim();
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// ── Helpers ─────────────────────────────────────────────────────────────────

const pad2 = (n) => String(n).padStart(2, '0');

// ISO string with local timezone offset (Google API requires this for proper local-day filtering)
const toLocalISO = (d) => {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const hh = pad2(Math.floor(Math.abs(off) / 60));
  const mm = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}${sign}${hh}:${mm}`;
};

const todayMidnight = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return toLocalISO(d);
};
const todayEndOfDay = () => {
  const d = new Date(); d.setHours(23, 59, 59, 999); return toLocalISO(d);
};

const minsFromMidnight = (isoStr) => {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
};

// Transform a Google Calendar API event → our internal shape
const gEventToInternal = (e) => {
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

  return {
    id: e.id,
    start: startMins,
    dur,
    title: e.summary || '(No title)',
    sub,
    allDay: isAllDay,
    htmlLink: e.htmlLink,
  };
};

// Fetch today's events using the Calendar REST API
async function fetchTodayEvents(accessToken) {
  const params = new URLSearchParams({
    timeMin: todayMidnight(),
    timeMax: todayEndOfDay(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '25',
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 401) {
    const err = new Error('Token expired'); err.code = 401; throw err;
  }
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  const data = await res.json();
  return (data.items || []).map(gEventToInternal);
}

// ── Store (singleton, shared across all components) ──────────────────────────

const gcalStore = (() => {
  // status: idle | loading | ready | error | unconfigured | no_gis
  let state = { status: 'idle', events: null, token: null, error: null };
  const listeners = new Set();

  const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach(fn => fn({ ...state }));
  };

  const get = () => ({ ...state });
  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  const doFetch = async (token) => {
    set({ status: 'loading', token });
    try {
      const events = await fetchTodayEvents(token);
      set({ status: 'ready', events });
    } catch (e) {
      if (e.code === 401) {
        set({ status: 'idle', token: null, events: null });
        connect();
      } else {
        set({ status: 'error', error: e.message });
      }
    }
  };

  const connect = () => {
    if (!GCAL_CLIENT_ID) { set({ status: 'unconfigured' }); return; }
    if (!window.google?.accounts?.oauth2) { set({ status: 'no_gis' }); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GCAL_CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { set({ status: 'error', error: resp.error }); return; }
        doFetch(resp.access_token);
      },
    });
    // If we already have a session, skip the consent screen
    client.requestAccessToken({ prompt: state.token ? '' : undefined });
  };

  const refresh = () => {
    if (!state.token) { connect(); return; }
    doFetch(state.token);
  };

  const disconnect = () => {
    if (state.token && window.google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(state.token, () => {});
    }
    set({ status: 'idle', events: null, token: null, error: null });
  };

  return { get, subscribe, connect, refresh, disconnect };
})();

// ── Hook ─────────────────────────────────────────────────────────────────────

function useCalendar() {
  const [state, setState] = useState(gcalStore.get());
  useEffect(() => gcalStore.subscribe(setState), []);
  return state;
}

// ── CalendarBanner ───────────────────────────────────────────────────────────
// Compact strip shown at the top of the Today / Schedule card.

function CalendarBanner({ cal }) {
  const { status, events, error } = cal;

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 2,
  };

  if (status === 'idle') {
    return (
      <div style={{ ...baseStyle, background: 'var(--ssm-eminence-tint)', color: 'var(--ssm-eminence)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{ flex: 1 }}>Connect your real Google Calendar</span>
        <button
          onClick={() => gcalStore.connect()}
          style={{
            padding: '4px 12px',
            background: 'var(--ssm-eminence)',
            color: 'white',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          Connect
        </button>
      </div>
    );
  }

  if (status === 'unconfigured') {
    return (
      <div style={{ ...baseStyle, background: 'rgba(181, 118, 42, 0.1)', color: 'var(--fg-warning)' }}>
        <span style={{ flex: 1 }}>
          Add your Client ID in <code style={{ fontSize: 11 }}>config.js</code> to connect Google Calendar
        </span>
      </div>
    );
  }

  if (status === 'no_gis') {
    return (
      <div style={{ ...baseStyle, background: 'rgba(179, 58, 58, 0.08)', color: 'var(--fg-error)' }}>
        <span>Google Identity Services script not loaded — check your connection</span>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div style={{ ...baseStyle, background: 'var(--ssm-eminence-tint)', color: 'var(--ssm-eminence)' }}>
        <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--ssm-eminence)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'gcal-spin 0.7s linear infinite' }}></span>
        <span>Fetching your calendar…</span>
        <style>{`@keyframes gcal-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ ...baseStyle, background: 'rgba(179, 58, 58, 0.08)', color: 'var(--fg-error)' }}>
        <span style={{ flex: 1 }}>Calendar error{error ? `: ${error}` : ''}</span>
        <button
          onClick={() => gcalStore.connect()}
          style={{ padding: '3px 10px', background: 'var(--fg-error)', color: 'white', borderRadius: 999, fontSize: 11, fontWeight: 700 }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === 'ready') {
    const count = events?.length ?? 0;
    return (
      <div style={{ ...baseStyle, background: 'rgba(47, 143, 110, 0.08)', color: 'var(--fg-success)', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--fg-success)', display: 'inline-block' }}></span>
          Google Calendar · {count === 0 ? 'No events today' : `${count} event${count === 1 ? '' : 's'} today`}
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => gcalStore.refresh()}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-success)', letterSpacing: '0.04em' }}
          >
            Refresh
          </button>
          <button
            onClick={() => gcalStore.disconnect()}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', letterSpacing: '0.04em' }}
          >
            Disconnect
          </button>
        </span>
      </div>
    );
  }

  return null;
}

// Expose to global scope — modules.jsx uses these
Object.assign(window, { gcalStore, useCalendar, CalendarBanner });
