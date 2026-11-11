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
        return Promise.resolve(v);
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
