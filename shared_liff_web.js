/**
 * shared_liff_web.js — 静的ホスト(GitHub Pages)版のLIFF共通スクリプト
 * =================================================================
 * GASのiframeサンドボックスでは liff.init() が固まるため、LIFF画面は
 * 普通のHTTPS静的ホストに置き、データはGAS Web Appへ fetch で送る。
 * インターフェースはGAS版 shared_liff.html と同じ（CAKEME.* / esc / LIFF_ID）。
 *
 * 設定は各ページの <script>window.LIFF_CFG={liffId,gasUrl}</script> で注入。
 */
(function () {
  var CFG = window.LIFF_CFG || {};
  window.LIFF_ID = CFG.liffId || '';
  var GAS_URL = CFG.gasUrl || '';

  window.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  window.CAKEME = {
    token: null,
    profile: null,

    init: function (onReady) {
      if (typeof liff === 'undefined') {
        document.body.innerHTML = '<div class="wrap"><p class="err">LIFF SDK未ロード</p></div>'; return;
      }
      if (!LIFF_ID) { document.body.innerHTML = '<div class="wrap"><p class="err">LIFF未設定</p></div>'; return; }
      liff.init({ liffId: LIFF_ID }).then(function () {
        if (!liff.isLoggedIn()) { liff.login(); return Promise.reject(new Error('redirecting')); }
        CAKEME.token = liff.getAccessToken();
        return liff.getProfile();
      }).then(function (profile) {
        if (profile) CAKEME.profile = profile;
        if (onReady) onReady();
      }).catch(function (e) {
        if (String(e && e.message).indexOf('redirect') >= 0) return; // ログインへ遷移中
        document.body.innerHTML = '<div class="wrap"><p class="err">初期化エラー: ' + (e && e.message) + '</p></div>';
      });
    },

    /** GAS Web App へ fetch（CORS回避のため text/plain・no-preflight） */
    call: function (api, payload) {
      return fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ api: api, payload: payload || {}, accessToken: CAKEME.token })
      }).then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok) return res.data;
          throw new Error((res && res.error) || 'error');
        });
    },

    close: function () { try { liff.closeWindow(); } catch (e) {} },

    toast: function (msg) {
      var t = document.getElementById('toast');
      if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
      t.textContent = msg; t.classList.add('show');
      setTimeout(function () { t.classList.remove('show'); }, 2200);
    },

    withLoading: function (btn, fn) {
      var orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
      Promise.resolve().then(fn).then(function () { btn.disabled = false; btn.innerHTML = orig; })
        .catch(function (e) { btn.disabled = false; btn.innerHTML = orig; CAKEME.toast('エラー: ' + (e && e.message ? e.message : e)); });
    }
  };
})();
