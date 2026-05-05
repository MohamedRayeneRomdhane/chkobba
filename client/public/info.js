/* Chkobba Café — shared script for static info pages.
   - Marks active nav link via aria-current.
   - Stamps current year in [data-year].
   - Wires [data-cookies-revoke] to reopen the consent dialog
     (Google Funding Choices when present; legacy localStorage banner fallback). */
(function () {
  'use strict';

  function setActiveNav() {
    var path = location.pathname.replace(/\/+$/, '') || '/';
    var links = document.querySelectorAll('.cafe-bar__nav a');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var hrefPath = href.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
      if (hrefPath === path) {
        links[i].setAttribute('aria-current', 'page');
      }
    }
  }

  function stampYear() {
    var nodes = document.querySelectorAll('[data-year]');
    var year = String(new Date().getFullYear());
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = year;
  }

  function revokeConsent() {
    try {
      if (window.googlefc && window.googlefc.callbackQueue) {
        window.googlefc.callbackQueue.push({
          CONSENT_DATA_READY: function () {
            if (window.googlefc.showRevocationMessage) {
              window.googlefc.showRevocationMessage();
            }
          }
        });
        return;
      }
    } catch (_) { /* fall through */ }
    try { localStorage.removeItem('chkobba_cookie_consent_v1'); } catch (_) {}
    location.assign('/');
  }

  function wireRevoke() {
    var btns = document.querySelectorAll('[data-cookies-revoke]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function (e) {
        e.preventDefault();
        revokeConsent();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setActiveNav(); stampYear(); wireRevoke();
    });
  } else {
    setActiveNav(); stampYear(); wireRevoke();
  }
})();
