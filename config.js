// ============================================================
// Daybook — Configuration
// ============================================================
//
// GOOGLE CALENDAR SETUP (one-time):
//
// 1. Go to https://console.cloud.google.com/
// 2. Click "Select a project" → "New Project" → name it "Daybook" → Create
// 3. In the search bar, search "Google Calendar API" → Enable it
// 4. Go to APIs & Services → Credentials → "+ Create Credentials" → OAuth client ID
// 5. Application type: Web application, Name: Daybook
// 6. Under "Authorized JavaScript origins" add:
//      https://startsayingmore.github.io
// 7. Click Create — copy the Client ID (looks like: 123456789-abc...apps.googleusercontent.com)
// 8. Paste it below, save, commit, and push.
//
// ============================================================
//
// GITHUB GIST SYNC SETUP (cross-device sync):
//
// No config needed here — enter your token directly in the app:
// Settings → Sync → paste your ghp_... token → Save token
// The token is stored in your browser only, never committed to the repo.
//
// To create a token: github.com/settings/tokens/new
//   Note: "Daybook Sync", Expiration: No expiration, Scope: gist only
//
// ============================================================

window.DAYBOOK_CONFIG = {
  gcalClientId:   '886350660616-lgm5eps4s7veo5pp1mp962eb2hv8c0ep.apps.googleusercontent.com',
  financeSheetId: '1tcbIxX3e6O0YHfIicRRV-mvaYxlUqr82llbTMHZ2fNo',
  socialSheetId:  '1hmIwg8TmEK94pzC3QSlfstcEjNmjJpn-4p_Go-4vbyg',
};
