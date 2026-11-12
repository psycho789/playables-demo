/*
 * Demo host (ADR-032): a stand-in for YouTube's `ytgame` on the public demo site (GitHub Pages,
 * ADR-019), where the real SDK is inactive and games would otherwise lose all progress on reload.
 * Only the demo copy of a game loads this file, in place of the SDK script; the game bundles
 * themselves are unchanged and still never touch storage (CLAUDE.md hard rule 2).
 *
 * - Saves go to this site's localStorage, one key per game folder (the host's job, as on YouTube).
 * - Ads are skipped (resolve at once, no pause), so nothing interrupts play.
 * - Pause and resume follow the page being hidden or shown, like the real host.
 */
(function () {
  'use strict';
  var key = 'pf-demo-save:' + location.pathname.replace(/index\.html$/, '');
  var store = null;
  try { store = window.localStorage; } catch (e) { store = null; }
  // Test aids, by query string (this file is the demo's host, not part of any game):
  //   ?stats=1   a small readout of the game's own render stats (window.__pfRender), for phone tests
  //   ?stage=N   lava-obby only: start at stage N (the next save the game makes replaces your progress)
  var query = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) query[p[0]] = p[1] === undefined ? '1' : decodeURIComponent(p[1]); });
  function startAt(saved) {
    var n = Math.round(Number(query.stage));
    if (!(n >= 1) || location.pathname.indexOf('/lava-obby/') < 0) return saved;
    var save;
    try { save = JSON.parse(saved); } catch (e) { save = null; }
    if (!save || typeof save !== 'object' || !save.d) save = { v: 1, b: 0, d: { deaths: 0, wins: 0, runTime: 0, bestTime: null } };
    save.d.checkpoint = n;
    save.d.runFromStart = false;
    save.b = Math.max(save.b || 0, n - 1);
    return JSON.stringify(save);
  }
  if (query.stats) {
    window.addEventListener('load', function () {
      var box = document.createElement('pre');
      box.style.cssText = 'position:fixed;left:4px;top:13%;margin:0;padding:4px 6px;z-index:99999;font:11px/1.25 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.62);border-radius:4px;pointer-events:none;white-space:pre';
      document.body.appendChild(box);
      var worst = 0;
      setInterval(function () {
        var r = window.__pfRender;
        if (!r) { box.textContent = 'no render stats yet'; return; }
        if (r.p95Ms > worst && r.p95Ms < 500) worst = r.p95Ms;
        box.textContent = [
          r.fps + ' fps  ' + r.frameMs + ' ms  p95 ' + r.p95Ms + '  worst p95 ' + worst,
          'tier ' + r.tier + (r.degraded ? ' (degraded)' : '') + '  ratio ' + r.pixelRatio + '  ' + (r.pixels / 1e6).toFixed(2) + ' Mpx',
          r.triangles + ' tris  ' + r.calls + ' calls  ' + r.geometries + ' geos  ' + r.textures + ' tex',
          'heap ' + (r.heapMB < 0 ? 'n/a here' : r.heapMB + ' MB') + '  area ' + r.area,
          'models ' + r.models + ' in ' + r.modelFiles + ' files  ' + (r.modelsMs < 0 ? 'loading' : r.modelsMs + ' ms') + (r.dressed ? '  dressed' : ''),
        ].join('\n');
      }, 500);
    });
  }
  var pauseCbs = [];
  var resumeCbs = [];
  var noop = function () {};
  function off(list, cb) { return function () { var i = list.indexOf(cb); if (i >= 0) list.splice(i, 1); }; }
  document.addEventListener('visibilitychange', function () {
    (document.hidden ? pauseCbs : resumeCbs).slice().forEach(function (cb) { try { cb(); } catch (e) { console.error(e); } });
  });
  window.ytgame = {
    IN_PLAYABLES_ENV: true,
    SDK_VERSION: 'demo',
    game: {
      firstFrameReady: noop,
      gameReady: noop,
      loadData: function () {
        var v = '';
        try { v = (store && store.getItem(key)) || ''; } catch (e) { v = ''; }
        return Promise.resolve(startAt(v));
      },
      saveData: function (data) {
        try { if (store) store.setItem(key, String(data)); } catch (e) { /* full or blocked: keep playing */ }
        return Promise.resolve();
      },
    },
    system: {
      getLanguage: function () { return Promise.resolve('en-US'); },
      isAudioEnabled: function () { return true; },
      onAudioEnabledChange: function () { return noop; },
      onPause: function (cb) { pauseCbs.push(cb); return off(pauseCbs, cb); },
      onResume: function (cb) { resumeCbs.push(cb); return off(resumeCbs, cb); },
    },
    engagement: {
      sendScore: function () { return Promise.resolve(); },
      openYTContent: function () { return Promise.resolve(); },
    },
    health: { logError: noop, logWarning: noop },
    ads: {
      requestInterstitialAd: function () { return Promise.resolve(); },
      requestRewardedAd: function () { return Promise.resolve(false); },
    },
  };
})();
