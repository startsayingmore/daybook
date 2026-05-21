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
// 8. Paste it below, save, commit, and push:
//      git add config.js && git commit -m "Add Google Calendar client ID" && git push
//
// ============================================================

window.DAYBOOK_CONFIG = {
  gcalClientId: '', // ← paste your Client ID here
};
