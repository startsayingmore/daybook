/* global React */
// calendar.jsx — Google Calendar OAuth + multi-calendar event fetching (today + week)
// Exposes: useCalendar(), CalendarBanner, gcalStore
const { useState, useEffect } = React;

const GCAL_CLIENT_ID = ((window.DAYBOOK_CONFIG || {}).gcalClientId || '').trim();
const FINANCE_SHEET_ID = ((window.DAYBOOK_CONFIG || {}).financeSheetId || '').trim();
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/spreadsheets.readonly';
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

const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

const todayMidnight  = () => { const d = new Date(); d.setHours(0,0,0,0);       return toLocalISO(d); };
const todayEndOfDay  = () => { const d = new Date(); d.setHours(23,59,59,999);  return toLocalISO(d); };

const weekMondayMidnight = () => {
  const d = new Date(); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow); d.setHours(0,0,0,0); return toLocalISO(d);
};
const weekSundayEndOfDay = () => {
  const d = new Date(); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow+6); d.setHours(23,59,59,999); return toLocalISO(d);
};
const upcoming60End = () => { const d = new Date(); d.setDate(d.getDate()+60); d.setHours(23,59,59,999); return toLocalISO(d); };

const minsFromMidnight = (isoStr) => { const d = new Date(isoStr); return d.getHours()*60+d.getMinutes(); };

const gEventToInternal = (e, calColor, calName = '') => {
  const isAllDay = !e.start.dateTime;
  const dateStr  = isAllDay ? e.start.date : e.start.dateTime.slice(0,10);
  const startMins = isAllDay ? 0 : minsFromMidnight(e.start.dateTime);
  const dur = isAllDay ? 1440 : Math.max(15, Math.round((new Date(e.end.dateTime) - new Date(e.start.dateTime)) / 60000));
  const location = e.location ? e.location.split(',')[0].trim() : '';
  const attendeeNames = (e.attendees||[]).filter(a=>!a.self).map(a=>a.displayName||a.email.split('@')[0]).slice(0,3).join(', ');
  const sub = [location, attendeeNames].filter(Boolean).join(' · ') || e.description?.replace(/<[^>]+>/g,'').slice(0,60) || '';
  return { id: e.id, start: startMins, dur, date: dateStr, title: e.summary||'(No title)', sub, allDay: isAllDay, htmlLink: e.htmlLink, calColor, calName };
};

const loadSelectedIds = () => { try { const r = localStorage.getItem(SELECTED_KEY); return r ? new Set(JSON.parse(r)) : null; } catch { return null; } };
const saveSelectedIds = (s)  => { try { localStorage.setItem(SELECTED_KEY, JSON.stringify(s ? [...s] : null)); } catch {} };

// ── API ───────────────────────────────────────────────────────────────────────

async function apiFetch(token, path) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { const e = new Error('Unauthorized'); e.code = 401; throw e; }
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  return res.json();
}

async function fetchCalendarList(token) {
  const data = await apiFetch(token, '/users/me/calendarList?minAccessRole=reader');
  return (data.items||[]).map(c => ({ id: c.id, name: c.summaryOverride||c.summary, color: c.backgroundColor||'#6F3F8E', primary: !!c.primary }));
}

async function fetchFinanceData(token, sheetId) {
  if (!sheetId) return null;
  const ranges = [
    'Dashboard!B5',           // Net Worth
    'Dashboard!C5',           // Total Assets
    'Dashboard!D5',           // Total Debts
    'Dashboard!E5',           // Budget Remaining
    'Dashboard!C15',          // Student Loans
    'Dashboard!C42',          // Monthly Net Income
    'Dashboard!D42',          // Savings Rate
    'Financial Health!B5',    // Emergency Fund
    'Financial Health!C5',    // Debt-to-Income
    'Visual Summary!I2:J4',   // Asset breakdown (donut)
    'Monthly Spending!B8:E24',// Budget vs spent by category
  ];
  const params = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message || `HTTP ${res.status}`;
      console.warn('[Finance] Sheets API error:', res.status, msg);
      return { _error: `${res.status}: ${msg}` };
    }
    const data = await res.json();
    const v = data.valueRanges.map(vr => vr.values?.[0]?.[0] ?? null);

    // Asset breakdown rows for donut chart
    const assetRows = data.valueRanges[9].values || [];
    const assetBreakdown = assetRows.map(r => ({
      name: r[0] || '',
      value: parseFloat((r[1] || '0').replace(/[$,]/g, '')) || 0,
    })).filter(a => a.name && a.value > 0);

    // Budget vs spent rows for bar chart
    const budgetRows = data.valueRanges[10].values || [];
    const budgetCategories = budgetRows.map(r => ({
      name: r[0] || '',
      spent: parseFloat((r[1] || '0').replace(/[$,()]/g, '')) || 0,
      budget: parseFloat((r[2] || '0').replace(/[$,()]/g, '')) || 0,
    })).filter(r => r.name && (r.spent > 0 || r.budget > 0));

    return {
      netWorth: v[0], totalAssets: v[1], totalDebts: v[2], budgetRemaining: v[3],
      studentLoans: v[4], monthlyNet: v[5], savingsRate: v[6],
      emergencyFund: v[7], debtToIncome: v[8],
      assetBreakdown, budgetCategories,
    };
  } catch (e) { console.warn('[Finance] fetch error:', e); return null; }
}

async function fetchEventsForCalendar(token, calId, calColor, calName, timeMin, timeMax) {
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '50' });
  const data = await apiFetch(token, `/calendars/${encodeURIComponent(calId)}/events?${params}`);
  return (data.items||[]).map(e => gEventToInternal(e, calColor, calName));
}

async function fetchAllEvents(token, calendarList, selectedIds, timeMin, timeMax) {
  const active = selectedIds ? calendarList.filter(c => selectedIds.has(c.id)) : calendarList;
  const results = await Promise.all(active.map(c => fetchEventsForCalendar(token, c.id, c.color, c.name, timeMin, timeMax)));
  return results.flat().sort((a,b) => a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.start - b.start);
}

// ── Store ─────────────────────────────────────────────────────────────────────

const AUTO_KEY  = 'dash.gcal.wasConnected';
const TOKEN_KEY = 'dash.gcal.tokenCache'; // { token, exp } — localStorage, survives tab close

const loadCachedToken = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, exp } = JSON.parse(raw);
    // keep a 60s safety margin so we don't use a token right at the edge
    if (!token || !exp || Date.now() > exp - 60000) return null;
    return token;
  } catch { return null; }
};
const saveCachedToken = (token) => {
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + 55 * 60 * 1000 })); } catch {}
};
const clearCachedToken = () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} };

const gcalStore = (() => {
  const cachedToken = loadCachedToken();

  let state = {
    status: cachedToken ? 'loading' : 'idle',
    events: null, weekEvents: null, upcomingEvents: null, financeData: null,
    calendarList: null, selectedIds: loadSelectedIds(),
    token: cachedToken || null, error: null,
  };
  const listeners = new Set();
  const set  = (patch) => { state = {...state,...patch}; listeners.forEach(fn=>fn({...state})); };
  const get  = () => ({...state});
  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  const doFetch = async (token, calendarList, selectedIds) => {
    try {
      const cals = calendarList || await fetchCalendarList(token);
      const [events, weekEvents, upcomingEvents, financeData] = await Promise.all([
        fetchAllEvents(token, cals, selectedIds, todayMidnight(), todayEndOfDay()),
        fetchAllEvents(token, cals, selectedIds, weekMondayMidnight(), weekSundayEndOfDay()),
        fetchAllEvents(token, cals, selectedIds, todayMidnight(), upcoming60End()),
        fetchFinanceData(token, FINANCE_SHEET_ID),
      ]);
      saveCachedToken(token);
      localStorage.setItem(AUTO_KEY, '1');
      set({ status: 'ready', token, calendarList: cals, events, weekEvents, upcomingEvents, financeData });
    } catch (e) {
      if (e.code === 401) {
        clearCachedToken();
        set({ status: 'idle', token: null, events: null, weekEvents: null, upcomingEvents: null, financeData: null, calendarList: null });
        connect(true); // token expired — try silent re-auth, fall back to Connect button
      } else { set({ status: 'error', error: e.message }); }
    }
  };

  // silent=true → no popup on failure, just show the Connect button
  const connect = (silent = false) => {
    if (!GCAL_CLIENT_ID) { set({ status: 'unconfigured' }); return; }
    if (!window.google?.accounts?.oauth2) { set({ status: 'no_gis' }); return; }
    set({ status: 'loading' });
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GCAL_CLIENT_ID, scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { silent ? set({ status: 'idle' }) : set({ status: 'error', error: resp.error }); return; }
        doFetch(resp.access_token, null, state.selectedIds);
      },
    });
    client.requestAccessToken({ prompt: silent ? '' : undefined });
  };

  const refresh = () => { if (!state.token) { connect(); return; } set({ status: 'loading' }); doFetch(state.token, state.calendarList, state.selectedIds); };

  const toggleCalendar = (id) => {
    if (!state.calendarList) return;
    const current = state.selectedIds ?? new Set(state.calendarList.map(c=>c.id));
    const next = new Set(current);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    const allIds = new Set(state.calendarList.map(c=>c.id));
    const newSelected = next.size === allIds.size && [...next].every(id=>allIds.has(id)) ? null : next;
    saveSelectedIds(newSelected);
    set({ status: 'loading', selectedIds: newSelected });
    doFetch(state.token, state.calendarList, newSelected);
  };

  const disconnect = () => {
    if (state.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(state.token, ()=>{});
    clearCachedToken();
    localStorage.removeItem(AUTO_KEY);
    set({ status: 'idle', events: null, weekEvents: null, upcomingEvents: null, financeData: null, token: null, calendarList: null, error: null });
  };

  // Kick off fetch immediately if we recovered a cached token
  if (cachedToken) { Promise.resolve().then(() => doFetch(cachedToken, null, state.selectedIds)); }

  return { get, subscribe, connect, refresh, disconnect, toggleCalendar };
})();

// If no cached token but user was previously connected, try silent OAuth re-auth.
// Polls until the GIS script (loaded async) is ready.
if (!loadCachedToken() && localStorage.getItem(AUTO_KEY)) {
  const tryAutoConnect = (n) => {
    if (window.google?.accounts?.oauth2) { gcalStore.connect(true); }
    else if (n < 30) { setTimeout(() => tryAutoConnect(n + 1), 200); }
  };
  tryAutoConnect(0);
}

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
  const base = { display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:600, marginBottom:2 };

  if (status === 'idle') return (
    <div style={{...base, background:'var(--ssm-eminence-tint)', color:'var(--ssm-eminence)'}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span style={{flex:1}}>Connect your real Google Calendar</span>
      <button onClick={()=>gcalStore.connect()} style={{padding:'4px 12px', background:'var(--ssm-eminence)', color:'white', borderRadius:999, fontSize:11, fontWeight:700}}>Connect</button>
    </div>
  );

  if (status === 'unconfigured') return (
    <div style={{...base, background:'rgba(181,118,42,0.1)', color:'var(--fg-warning)'}}>
      <span>Add your Client ID in <code style={{fontSize:11}}>config.js</code> to connect Google Calendar</span>
    </div>
  );

  if (status === 'no_gis') return (
    <div style={{...base, background:'rgba(179,58,58,0.08)', color:'var(--fg-error)'}}>
      <span>Google Identity Services not loaded — check your connection</span>
    </div>
  );

  if (status === 'loading') return (
    <div style={{...base, background:'var(--ssm-eminence-tint)', color:'var(--ssm-eminence)'}}>
      <span style={{display:'inline-block', width:12, height:12, border:'2px solid var(--ssm-eminence)', borderTopColor:'transparent', borderRadius:'50%', animation:'gcal-spin 0.7s linear infinite'}}></span>
      <span>Fetching your calendars…</span>
      <style>{`@keyframes gcal-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (status === 'error') return (
    <div style={{...base, background:'rgba(179,58,58,0.08)', color:'var(--fg-error)'}}>
      <span style={{flex:1}}>Calendar error{error ? `: ${error}` : ''}</span>
      <button onClick={()=>gcalStore.connect()} style={{padding:'3px 10px', background:'var(--fg-error)', color:'white', borderRadius:999, fontSize:11, fontWeight:700}}>Retry</button>
    </div>
  );

  if (status === 'ready') {
    const count = events?.length ?? 0;
    const activeCount = selectedIds ? selectedIds.size : (calendarList?.length ?? 0);
    const totalCount = calendarList?.length ?? 0;
    return (
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        <div style={{...base, background:'rgba(47,143,110,0.08)', color:'var(--fg-success)', justifyContent:'space-between', marginBottom:0}}>
          <span style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={{width:7, height:7, borderRadius:'50%', background:'var(--fg-success)', display:'inline-block'}}></span>
            {count===0 ? 'No events today' : `${count} event${count===1?'':'s'} today`}
            {totalCount > 1 && <span style={{fontWeight:500, color:'var(--fg-muted)', fontSize:11}}>· {activeCount} of {totalCount} calendars</span>}
          </span>
          <span style={{display:'flex', gap:10}}>
            {totalCount > 1 && <button onClick={()=>setShowCals(s=>!s)} style={{fontSize:11, fontWeight:600, color:'var(--fg-success)', letterSpacing:'0.04em'}}>{showCals ? 'Hide' : 'Calendars'}</button>}
            <button onClick={()=>gcalStore.refresh()} style={{fontSize:11, fontWeight:600, color:'var(--fg-success)', letterSpacing:'0.04em'}}>Refresh</button>
            <button onClick={()=>gcalStore.disconnect()} style={{fontSize:11, fontWeight:600, color:'var(--fg-muted)', letterSpacing:'0.04em'}}>Disconnect</button>
          </span>
        </div>
        {showCals && calendarList && (
          <div style={{display:'flex', flexDirection:'column', gap:3, padding:'8px 12px', background:'var(--ssm-paper)', borderRadius:10, border:'1px solid var(--border-subtle)'}}>
            {calendarList.map(c => {
              const isActive = !selectedIds || selectedIds.has(c.id);
              return (
                <label key={c.id} style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'4px 0', fontSize:12}}>
                  <span style={{width:10, height:10, borderRadius:'50%', background:c.color, flexShrink:0}}></span>
                  <span style={{flex:1, fontWeight:500, color:isActive?'var(--fg-primary)':'var(--fg-muted)', textDecoration:isActive?'none':'line-through'}}>
                    {c.name}{c.primary?' (primary)':''}
                  </span>
                  <input type="checkbox" checked={isActive} onChange={()=>gcalStore.toggleCalendar(c.id)} style={{accentColor:c.color, width:14, height:14}} />
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

Object.assign(window, { gcalStore, useCalendar, CalendarBanner });
