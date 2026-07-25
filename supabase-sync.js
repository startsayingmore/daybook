// Supabase sync engine for Daybook.
// Loads before React. Attaches window.DaybookSync for React components to consume.
// Auto-pulls once per browser session (reloads if remote is newer).
// Auto-pushes 3 s after any dash.* localStorage change, and on page hide.

(function () {
  const cfg = window.DAYBOOK_CONFIG || {};
  const SB_SESSION_KEY = 'dash.sb.pullDone';   // sessionStorage — prevents reload loops
  const SB_SYNCED_KEY  = 'dash.sb.syncedAt';   // localStorage  — last push timestamp
  const EXCLUDE = new Set([
    'dash.gcal.tokenCache', 'dash.activeView',
    'dash.gist.id', 'dash.gist.lastPulledAt',
    SB_SYNCED_KEY,
  ]);

  // ── No-op if Supabase not configured ──────────────────────────────────────
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    window.DaybookSync = { configured: false, user: null };
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  // ── Data helpers ───────────────────────────────────────────────────────────
  function gather() {
    const out = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith('dash.') && !EXCLUDE.has(k))
      .forEach(k => { try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { out[k] = localStorage.getItem(k); } });
    return out;
  }

  function restore(data) {
    Object.keys(data)
      .filter(k => k.startsWith('dash.') && !EXCLUDE.has(k) && k !== '_syncedAt')
      .forEach(k => { try { localStorage.setItem(k, JSON.stringify(data[k])); } catch {} });
  }

  // ── Supabase operations ────────────────────────────────────────────────────
  async function push(userId) {
    const data = { ...gather(), _syncedAt: Date.now() };
    const { error } = await sb
      .from('user_data')
      .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    try { localStorage.setItem(SB_SYNCED_KEY, String(data._syncedAt)); } catch {}
    return data._syncedAt;
  }

  async function pull(userId) {
    const { data: row, error } = await sb
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message); // PGRST116 = no rows
    return row?.data || null;
  }

  // ── Auto-push (debounced) ──────────────────────────────────────────────────
  let pushTimer;
  function schedulePush(userId) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(userId).catch(e => console.warn('[Supabase] push:', e.message)), 3000);
  }

  // ── Initialization ─────────────────────────────────────────────────────────
  let currentUser = null;

  sb.auth.getSession().then(({ data: { session } }) => {
    currentUser = session?.user || null;
    if (!currentUser) return;

    // Auto-pull once per browser session
    if (!sessionStorage.getItem(SB_SESSION_KEY)) {
      sessionStorage.setItem(SB_SESSION_KEY, '1');
      pull(currentUser.id).then(remote => {
        if (!remote) return;
        const localTs  = parseInt(localStorage.getItem(SB_SYNCED_KEY) || '0', 10);
        const remoteTs = remote._syncedAt || 0;
        if (remoteTs > localTs) {
          restore(remote);
          try { localStorage.setItem(SB_SYNCED_KEY, String(remoteTs)); } catch {}
          location.reload();
        }
      }).catch(e => console.warn('[Supabase] auto-pull:', e.message));
    }

    // Listen for data changes from useLocalState
    window.addEventListener('daybook:datachange', () => schedulePush(currentUser.id));

    // Push on page hide
    const onHide = () => { if (currentUser) push(currentUser.id).catch(() => {}); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); });
    window.addEventListener('pagehide', onHide);
  });

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
  });

  // ── Public API for React components ───────────────────────────────────────
  window.DaybookSync = {
    configured: true,
    sb,
    get user() { return currentUser; },
    signInWithGoogle() {
      return sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    },
    signOut: () => sb.auth.signOut(),
    async forcePush() {
      if (!currentUser) throw new Error('Not signed in');
      return push(currentUser.id);
    },
    async forcePull() {
      if (!currentUser) throw new Error('Not signed in');
      const data = await pull(currentUser.id);
      if (!data) throw new Error('No data found in Supabase yet — push first.');
      restore(data);
      location.reload();
    },
  };
})();
