// Social Media Follower Sync — Apps Script
// Spreadsheet: SSM Social Media Metrics (separate from financial sheet)
//
// SETUP:
// 1. Open the SSM Social Media Metrics spreadsheet
// 2. Extensions → Apps Script → paste this entire file → Save
// 3. Run testFetch() first to confirm both platforms work (approve permissions when prompted)
// 4. If test passes: Triggers (clock icon) → Add Trigger → syncSocialFollowers
//    → Time-driven → Day timer → 8–9 AM → Save

const SPREADSHEET_ID = '1hmIwg8TmEK94pzC3QSlfstcEjNmjJpn-4p_Go-4vbyg';
const METRICS_SHEET  = 'Metrics';
const HISTORY_SHEET  = 'History';
const TIMEZONE       = 'America/Chicago';

function syncSocialFollowers() {
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const metrics = ss.getSheetByName(METRICS_SHEET);
  if (!metrics) { console.error('Metrics sheet not found'); return; }

  // Save current counts as "prev" before overwriting
  const prevIG = metrics.getRange('D5').getValue() || 0;
  const prevTT = metrics.getRange('D6').getValue() || 0;

  const igCount = fetchInstagramFollowers('startsayingmore');
  const ttCount = fetchTikTokFollowers('startsayingmore');

  const today       = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const displayDate = Utilities.formatDate(new Date(), TIMEZONE, 'MMMM d, yyyy');

  if (igCount !== null) {
    metrics.getRange('E5').setValue(prevIG);
    metrics.getRange('D5').setValue(igCount);
    metrics.getRange('G5').setValue(today);
    console.log('Instagram updated: ' + igCount + ' (prev: ' + prevIG + ')');
  } else {
    console.warn('Instagram fetch failed — D5 left unchanged');
  }

  if (ttCount !== null) {
    metrics.getRange('E6').setValue(prevTT);
    metrics.getRange('D6').setValue(ttCount);
    metrics.getRange('G6').setValue(today);
    console.log('TikTok updated: ' + ttCount + ' (prev: ' + prevTT + ')');
  } else {
    console.warn('TikTok fetch failed — D6 left unchanged');
  }

  // Always stamp last-run date in C2
  metrics.getRange('C2').setValue(displayDate);

  // Append a row to History tab for trend tracking
  const history = ss.getSheetByName(HISTORY_SHEET);
  if (history) {
    const ig = igCount !== null ? igCount : prevIG;
    const tt = ttCount !== null ? ttCount : prevTT;
    history.appendRow([today, ig, tt, ig - prevIG, tt - prevTT, ig + tt]);
    console.log('History row appended');
  }

  console.log('Sync complete — ' + displayDate);
}

function fetchInstagramFollowers(username) {
  // Approach 1: internal JSON API (doesn't serve a challenge page like the HTML profile)
  try {
    const apiRes = UrlFetchApp.fetch('https://i.instagram.com/api/v1/users/web_profile_info/?username=' + username, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'x-ig-app-id': '936619743392459',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.instagram.com/',
      },
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (apiRes.getResponseCode() === 200) {
      const json = JSON.parse(apiRes.getContentText());
      const count = json?.data?.user?.edge_followed_by?.count;
      if (count !== undefined) { console.log('Instagram via API: ' + count); return count; }
    } else {
      console.warn('Instagram API HTTP ' + apiRes.getResponseCode());
    }
  } catch (e) { console.warn('Instagram API error: ' + e.message); }

  // Approach 2: HTML profile page with Chrome UA
  try {
    const res = UrlFetchApp.fetch('https://www.instagram.com/' + username + '/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
      },
      muteHttpExceptions: true,
      followRedirects: true
    });

    if (res.getResponseCode() !== 200) {
      console.warn('Instagram HTML HTTP ' + res.getResponseCode());
      return null;
    }

    const html = res.getContentText();

    const patterns = [
      /property="og:description"[^>]*content="([\d,]+)\s+Followers/i,
      /content="([\d,]+)\s+Followers[^"]*"[^>]*property="og:description"/i,
      /name="description"[^>]*content="([\d,]+)\s+Followers/i,
      /"follower_count":(\d+)/,
      /"edge_followed_by":\{"count":(\d+)\}/,
      /"followersCount":(\d+)/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) return parseInt(m[1].replace(/,/g, ''));
    }

    console.warn('Instagram: no follower count pattern matched');
    return null;
  } catch (e) {
    console.error('Instagram fetch error: ' + e.message);
    return null;
  }
}

function fetchTikTokFollowers(username) {
  // Try two user-agents — TikTok now serves a degraded page to Googlebot
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ];
  for (const ua of userAgents) {
    const result = _tryTikTok(username, ua);
    if (result !== null) { console.log('TikTok matched with UA: ' + ua.slice(0, 40)); return result; }
  }
  console.warn('TikTok: no follower count pattern matched across all user-agents');
  return null;
}

function _tryTikTok(username, userAgent) {
  try {
    const res = UrlFetchApp.fetch('https://www.tiktok.com/@' + username, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      muteHttpExceptions: true,
      followRedirects: true
    });

    if (res.getResponseCode() !== 200) return null;
    const html = res.getContentText();

    // Anchored to username — avoids matching other users' counts
    const anchoredPatterns = [
      new RegExp('"uniqueId":"' + username + '"[\\s\\S]{1,1200}?"followerCount":(\\d+)'),
      new RegExp('"followerCount":(\\d+)[\\s\\S]{1,1200}?"uniqueId":"' + username + '"'),
      new RegExp('"uniqueId":"' + username + '"[\\s\\S]{1,1200}?"fans":(\\d+)'),
    ];
    for (const p of anchoredPatterns) {
      const m = html.match(p);
      if (m) return parseInt(m[1]);
    }

    // __UNIVERSAL_DATA__ (newer TikTok structure)
    const univMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (univMatch) {
      try {
        const obj = JSON.parse(univMatch[1]);
        const detail = obj?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo;
        if (detail?.stats?.followerCount !== undefined) return detail.stats.followerCount;
      } catch (e) { console.warn('TikTok: __UNIVERSAL_DATA__ parse failed — ' + e.message); }
    }

    // SIGI_STATE (older TikTok structure)
    const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
    if (sigiMatch) {
      try {
        const sigi = JSON.parse(sigiMatch[1]);
        const users = sigi.UserModule?.users || {};
        const user  = users[username] || users[username.toLowerCase()];
        if (user?.stats?.followerCount !== undefined) return user.stats.followerCount;
      } catch (e) { console.warn('TikTok: SIGI_STATE parse failed — ' + e.message); }
    }

    // og:description: "1,305 Followers, X Following..."
    const ogMatch = html.match(/property="og:description"[^>]*content="([\d,]+)\s+Followers/i)
                 || html.match(/content="([\d,]+)\s+Followers[^"]*"[^>]*property="og:description"/i);
    if (ogMatch) return parseInt(ogMatch[1].replace(/,/g, ''));

    return null;
  } catch (e) {
    console.error('TikTok fetch error: ' + e.message);
    return null;
  }
}

// Run this first to verify both platforms fetch correctly before setting the trigger
function testFetch() {
  console.log('Instagram: ' + fetchInstagramFollowers('startsayingmore'));
  console.log('TikTok:    ' + fetchTikTokFollowers('startsayingmore'));
}

// Run this if testFetch() returns null — logs what each platform is actually serving
function debugFetch() {
  // Instagram internal API
  const igApi = UrlFetchApp.fetch('https://i.instagram.com/api/v1/users/web_profile_info/?username=startsayingmore', {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15', 'x-ig-app-id': '936619743392459' },
    muteHttpExceptions: true
  });
  console.log('IG API status: ' + igApi.getResponseCode());
  console.log('IG API body:   ' + igApi.getContentText().slice(0, 400));

  // Instagram HTML — search for specific patterns
  const igHtml = UrlFetchApp.fetch('https://www.instagram.com/startsayingmore/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
    muteHttpExceptions: true
  });
  const igBody = igHtml.getContentText();
  console.log('IG HTML status: ' + igHtml.getResponseCode() + ' (' + igBody.length + ' chars)');
  ['edge_followed_by', 'follower_count', 'followersCount', 'og:description', '_sharedData', 'followerCount'].forEach(function(pat) {
    var idx = igBody.indexOf(pat);
    if (idx >= 0) {
      console.log('IG HAS "' + pat + '" @ ' + idx + ': ' + igBody.slice(Math.max(0, idx - 10), idx + 150));
    } else {
      console.log('IG missing: "' + pat + '"');
    }
  });

  // TikTok — search for specific patterns
  const tt = UrlFetchApp.fetch('https://www.tiktok.com/@startsayingmore', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
    muteHttpExceptions: true
  });
  const ttBody = tt.getContentText();
  console.log('TT status: ' + tt.getResponseCode() + ' (' + ttBody.length + ' chars)');
  ['__UNIVERSAL_DATA_FOR_REHYDRATION__', 'SIGI_STATE', 'followerCount', 'uniqueId', 'startsayingmore'].forEach(function(pat) {
    var idx = ttBody.indexOf(pat);
    if (idx >= 0) {
      console.log('TT HAS "' + pat + '" @ ' + idx + ': ' + ttBody.slice(Math.max(0, idx - 10), idx + 250));
    } else {
      console.log('TT missing: "' + pat + '"');
    }
  });
}
