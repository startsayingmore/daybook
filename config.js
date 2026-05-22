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
// 1. Go to https://github.com/settings/tokens/new
// 2. Note: "Daybook Sync", set Expiration to "No expiration" (or 1 year)
// 3. Under Scopes, check only "gist"
// 4. Click "Generate token" — copy the token (starts with ghp_...)
// 5. Paste it in githubToken below, save, commit, and push.
//
// On first use: open Settings → Sync → "Push to Gist" to create your Gist.
// On a new device: open Settings → Sync → "Pull from Gist" to load your data.
// Auto-sync: data is pushed automatically when you leave the page, and pulled
// on load whenever the Gist has been updated from another device.
//
// ============================================================

window.DAYBOOK_CONFIG = {
  gcalClientId:  '886350660616-lgm5eps4s7veo5pp1mp962eb2hv8c0ep.apps.googleusercontent.com',
  financeSheetId: '1tcbIxX3e6O0YHfIicRRV-mvaYxlUqr82llbTMHZ2fNo',
  githubToken:   '', // paste your ghp_... token here
};
