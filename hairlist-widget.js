/*!
 * Hairlist Widget — a pluggable, zero-dependency booking & info widget
 * for any website powered by a hairlist.ch / Belbo salon page.
 *
 * Drop it on any site with a single <script> tag. It surfaces a salon's
 * hairstylist info "in full" — the complete online booking page
 * (services, prices, stylists, availability, booking flow) is loaded live
 * inside a modal or inline iframe in the visitor's own browser, and an
 * optional structured info panel (hours, team, contact, service menu) can
 * be rendered from a small JSON config.
 *
 * Usage (auto-init from the script tag):
 *   <script src="hairlist-widget.js"
 *           data-salon="steiner"
 *           data-mode="modal"
 *           data-label="Termin buchen"
 *           data-color="#111827"
 *           data-lang="de"
 *           data-info="steiner.json"></script>
 *
 * Or programmatically:
 *   HairlistWidget.init({ salon: 'steiner', mode: 'inline', mount: '#booking' });
 *   HairlistWidget.open();  HairlistWidget.close();
 *
 * License: MIT
 */
(function (global) {
  'use strict';

  var NS = 'hlw';
  var VERSION = '1.0.0';

  // ---------------------------------------------------------------------------
  // i18n — UI chrome strings. Salon content itself comes from hairlist/JSON.
  // ---------------------------------------------------------------------------
  var I18N = {
    de: {
      book: 'Termin buchen',
      bookingAt: 'Termin buchen bei',
      close: 'Schließen',
      openInNewTab: 'In neuem Tab öffnen',
      loading: 'Buchung wird geladen …',
      loadTrouble: 'Die Buchung kann hier nicht angezeigt werden.',
      loadTroubleCta: 'Buchungsseite in neuem Tab öffnen',
      services: 'Leistungen',
      team: 'Team',
      hours: 'Öffnungszeiten',
      contact: 'Kontakt',
      closedLabel: 'Geschlossen',
      duration: 'Min.',
      from: 'ab',
      website: 'Website',
      call: 'Anrufen',
      email: 'E-Mail',
      directions: 'Route',
      poweredBy: 'Buchung über hairlist'
    },
    en: {
      book: 'Book appointment',
      bookingAt: 'Book an appointment at',
      close: 'Close',
      openInNewTab: 'Open in new tab',
      loading: 'Loading booking …',
      loadTrouble: 'The booking cannot be shown here.',
      loadTroubleCta: 'Open the booking page in a new tab',
      services: 'Services',
      team: 'Team',
      hours: 'Opening hours',
      contact: 'Contact',
      closedLabel: 'Closed',
      duration: 'min',
      from: 'from',
      website: 'Website',
      call: 'Call',
      email: 'Email',
      directions: 'Directions',
      poweredBy: 'Booking via hairlist'
    },
    fr: {
      book: 'Prendre rendez-vous',
      bookingAt: 'Prendre rendez-vous chez',
      close: 'Fermer',
      openInNewTab: 'Ouvrir dans un nouvel onglet',
      loading: 'Chargement de la réservation …',
      loadTrouble: 'La réservation ne peut pas être affichée ici.',
      loadTroubleCta: 'Ouvrir la page de réservation dans un nouvel onglet',
      services: 'Prestations',
      team: 'Équipe',
      hours: 'Horaires',
      contact: 'Contact',
      closedLabel: 'Fermé',
      duration: 'min',
      from: 'dès',
      website: 'Site web',
      call: 'Appeler',
      email: 'E-mail',
      directions: 'Itinéraire',
      poweredBy: 'Réservation via hairlist'
    },
    it: {
      book: 'Prenota appuntamento',
      bookingAt: 'Prenota un appuntamento da',
      close: 'Chiudi',
      openInNewTab: 'Apri in una nuova scheda',
      loading: 'Caricamento prenotazione …',
      loadTrouble: 'La prenotazione non può essere mostrata qui.',
      loadTroubleCta: 'Apri la pagina di prenotazione in una nuova scheda',
      services: 'Servizi',
      team: 'Team',
      hours: 'Orari di apertura',
      contact: 'Contatto',
      closedLabel: 'Chiuso',
      duration: 'min',
      from: 'da',
      website: 'Sito web',
      call: 'Chiama',
      email: 'E-mail',
      directions: 'Indicazioni',
      poweredBy: 'Prenotazione tramite hairlist'
    }
  };

  function t(cfg, key) {
    var pack = I18N[cfg.lang] || I18N.de;
    return pack[key] != null ? pack[key] : (I18N.de[key] || key);
  }

  // ---------------------------------------------------------------------------
  // Small DOM/utility helpers
  // ---------------------------------------------------------------------------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.indexOf('on') === 0 && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else {
          node.setAttribute(k, v);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }

  // ---------------------------------------------------------------------------
  // Config resolution
  // ---------------------------------------------------------------------------
  var DEFAULTS = {
    salon: null,            // subdomain, e.g. "steiner" -> steiner.hairlist.ch/termin
    shop: null,             // alias for `salon` — the shop key/identifier for a specific shop
    key: null,              // optional API/booking key for the shop (appended as ?key=)
    keyParam: 'key',        // query-parameter name used to pass `key` to the booking page
    url: null,              // explicit full booking URL (overrides salon/shop)
    path: '/termin',        // booking path appended to the salon host
    mode: 'modal',          // 'modal' | 'inline' | 'button'
    mount: null,            // selector/element for 'inline' mode (and 'button' target)
    lang: 'de',             // de | en | fr | it (UI chrome + ?lang= on booking url)
    color: '#111827',       // accent color
    label: null,            // launcher button text (defaults to i18n 'book')
    title: null,            // modal heading (defaults to salon name / host)
    position: 'bottom-right', // floating button: bottom-right | bottom-left | top-right | top-left | inline
    height: '640px',        // inline iframe height
    info: null,             // URL to a salon info JSON, OR an inline info object
    showInfoPanel: true,    // render the info panel next to the booking iframe
    autoOpen: false,        // open the modal automatically on load
    zIndex: 2147483000,     // stacking for floating/modal layers
    passLang: true          // append ?lang=<lang> to the booking URL
  };

  function readScriptConfig() {
    var s = document.currentScript;
    if (!s) {
      var list = document.getElementsByTagName('script');
      for (var i = list.length - 1; i >= 0; i--) {
        if (/hairlist-widget(\.min)?\.js/.test(list[i].src)) { s = list[i]; break; }
      }
    }
    if (!s) return {};
    var d = s.dataset || {};
    var out = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      if (d[key] != null && d[key] !== '') out[key] = d[key];
    });
    // coerce booleans that arrive as strings
    ['showInfoPanel', 'autoOpen', 'passLang'].forEach(function (k) {
      if (typeof out[k] === 'string') out[k] = out[k] !== 'false';
    });
    return out;
  }

  function resolveConfig(user) {
    var cfg = {};
    Object.keys(DEFAULTS).forEach(function (k) { cfg[k] = DEFAULTS[k]; });
    var script = readScriptConfig();
    Object.keys(script).forEach(function (k) { cfg[k] = script[k]; });
    if (user) Object.keys(user).forEach(function (k) {
      if (user[k] !== undefined) cfg[k] = user[k];
    });
    // `shop` is a friendly alias for `salon` (the shop key/identifier).
    if (!cfg.salon && cfg.shop) cfg.salon = cfg.shop;
    if (!I18N[cfg.lang]) cfg.lang = 'de';
    return cfg;
  }

  function bookingUrl(cfg) {
    var base;
    if (cfg.url) {
      base = cfg.url;
    } else if (cfg.salon) {
      var host = /\./.test(cfg.salon) ? cfg.salon : cfg.salon + '.hairlist.ch';
      base = 'https://' + host + (cfg.path || '/termin');
    } else {
      return null;
    }
    if (cfg.passLang && cfg.lang && base.indexOf('lang=') === -1) {
      base += (base.indexOf('?') === -1 ? '?' : '&') + 'lang=' + encodeURIComponent(cfg.lang);
    }
    // Pass the shop's booking key through to the booking page when provided.
    if (cfg.key) {
      var kp = cfg.keyParam || 'key';
      if (base.indexOf(kp + '=') === -1) {
        base += (base.indexOf('?') === -1 ? '?' : '&') + kp + '=' + encodeURIComponent(cfg.key);
      }
    }
    return base;
  }

  function defaultTitle(cfg) {
    if (cfg.title) return cfg.title;
    if (cfg._info && cfg._info.name) return cfg._info.name;
    if (cfg.salon && !/\./.test(cfg.salon)) {
      return cfg.salon.charAt(0).toUpperCase() + cfg.salon.slice(1);
    }
    var u = bookingUrl(cfg);
    try { return u ? new URL(u).hostname.split('.')[0] : 'Salon'; } catch (e) { return 'Salon'; }
  }

  // ---------------------------------------------------------------------------
  // Styles — injected once, all class names are prefixed to avoid collisions.
  // Light/dark aware, responsive.
  // ---------------------------------------------------------------------------
  function injectStyles(cfg) {
    if (document.getElementById(NS + '-styles')) return;
    var css = [
      ':root{--' + NS + '-accent:' + '#111827}',
      '.' + NS + '-root,.' + NS + '-root *{box-sizing:border-box}',
      '.' + NS + '-root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.45;color:#1f2430}',

      // Floating launcher button
      '.' + NS + '-fab{position:fixed;z-index:' + cfg.zIndex + ';border:0;cursor:pointer;display:inline-flex;align-items:center;gap:.55em;padding:.85em 1.25em;border-radius:999px;font-size:15px;font-weight:600;color:#fff;background:var(--' + NS + '-accent);box-shadow:0 6px 24px rgba(0,0,0,.22);transition:transform .15s ease,box-shadow .15s ease}',
      '.' + NS + '-fab:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.28)}',
      '.' + NS + '-fab:focus-visible{outline:3px solid rgba(120,150,255,.6);outline-offset:2px}',
      '.' + NS + '-fab svg{width:1.15em;height:1.15em}',
      // Positions respect iOS/Android safe-area insets (notch, home indicator).
      '.' + NS + '-pos-bottom-right{right:calc(20px + env(safe-area-inset-right));bottom:calc(20px + env(safe-area-inset-bottom))}',
      '.' + NS + '-pos-bottom-left{left:calc(20px + env(safe-area-inset-left));bottom:calc(20px + env(safe-area-inset-bottom))}',
      '.' + NS + '-pos-top-right{right:calc(20px + env(safe-area-inset-right));top:calc(20px + env(safe-area-inset-top))}',
      '.' + NS + '-pos-top-left{left:calc(20px + env(safe-area-inset-left));top:calc(20px + env(safe-area-inset-top))}',

      // Inline trigger button (mode=button, position=inline)
      '.' + NS + '-btn{display:inline-flex;align-items:center;gap:.55em;padding:.7em 1.15em;border-radius:10px;border:0;cursor:pointer;font-size:15px;font-weight:600;color:#fff;background:var(--' + NS + '-accent)}',
      '.' + NS + '-btn:hover{filter:brightness(1.08)}',

      // Modal
      '.' + NS + '-overlay{position:fixed;inset:0;z-index:' + cfg.zIndex + ';background:rgba(15,18,26,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity .18s ease}',
      '.' + NS + '-overlay.' + NS + '-open{opacity:1}',
      '.' + NS + '-modal{background:#fff;width:min(1080px,100%);height:min(88vh,900px);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.4);transform:translateY(12px) scale(.99);transition:transform .18s ease}',
      '.' + NS + '-overlay.' + NS + '-open .' + NS + '-modal{transform:none}',

      // Header
      '.' + NS + '-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #eceef2;flex:0 0 auto}',
      '.' + NS + '-head h2{margin:0;font-size:16px;font-weight:700;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.' + NS + '-head .' + NS + '-sub{font-size:12px;font-weight:500;color:#8b93a1;display:block}',
      '.' + NS + '-iconbtn{border:0;background:#f1f3f7;color:#3a4150;width:36px;height:36px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}',
      '.' + NS + '-iconbtn:hover{background:#e6e9ef}',
      '.' + NS + '-iconbtn svg{width:18px;height:18px}',

      // Body layout: info panel + booking frame
      '.' + NS + '-body{display:flex;flex:1;min-height:0}',
      '.' + NS + '-info{flex:0 0 300px;max-width:300px;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px;border-right:1px solid #eceef2;background:#fafbfc}',
      '.' + NS + '-frame-wrap{position:relative;flex:1;min-width:0;background:#fff}',
      '.' + NS + '-frame{border:0;width:100%;height:100%;display:block}',

      // Inline (non-modal) container
      '.' + NS + '-inline{border:1px solid #e6e9ef;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 12px rgba(0,0,0,.05)}',
      '.' + NS + '-inline .' + NS + '-body{min-height:0}',

      // Loading + fallback overlays over the frame
      '.' + NS + '-cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px;background:#fff}',
      '.' + NS + '-cover.' + NS + '-hidden{display:none}',
      '.' + NS + '-spinner{width:34px;height:34px;border-radius:50%;border:3px solid #e6e9ef;border-top-color:var(--' + NS + '-accent);animation:' + NS + '-spin .8s linear infinite}',
      '@keyframes ' + NS + '-spin{to{transform:rotate(360deg)}}',
      '.' + NS + '-muted{color:#8b93a1;font-size:13px}',
      '.' + NS + '-cta{display:inline-flex;align-items:center;gap:.5em;padding:.7em 1.15em;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;color:#fff;background:var(--' + NS + '-accent)}',
      '.' + NS + '-cta.' + NS + '-ghost{background:transparent;color:var(--' + NS + '-accent);border:1px solid currentColor}',

      // Info panel content
      '.' + NS + '-info h3{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#8b93a1}',
      '.' + NS + '-info section{margin-bottom:20px}',
      '.' + NS + '-info .' + NS + '-name{font-size:18px;font-weight:800;margin:0 0 2px}',
      '.' + NS + '-info .' + NS + '-tagline{font-size:13px;color:#6b7280;margin:0 0 14px}',
      '.' + NS + '-row{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;padding:4px 0}',
      '.' + NS + '-row .' + NS + '-k{color:#4b5563}',
      '.' + NS + '-row .' + NS + '-v{color:#111827;font-weight:600;white-space:nowrap}',
      '.' + NS + '-svc{padding:7px 0;border-bottom:1px dashed #e9ecf1}',
      '.' + NS + '-svc:last-child{border-bottom:0}',
      '.' + NS + '-svc-top{display:flex;justify-content:space-between;gap:10px}',
      '.' + NS + '-svc-name{font-size:13.5px;font-weight:600;color:#1f2430}',
      '.' + NS + '-svc-price{font-size:13.5px;font-weight:700;color:var(--' + NS + '-accent);white-space:nowrap}',
      '.' + NS + '-svc-meta{font-size:12px;color:#9aa1ad;margin-top:2px}',
      '.' + NS + '-svc-cat{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9aa1ad;margin:12px 0 4px}',
      '.' + NS + '-team-item{display:flex;align-items:center;gap:10px;padding:6px 0}',
      '.' + NS + '-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;background:#e6e9ef;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-weight:700;color:#6b7280;font-size:14px}',
      '.' + NS + '-team-name{font-size:13.5px;font-weight:600}',
      '.' + NS + '-team-role{font-size:12px;color:#9aa1ad}',
      '.' + NS + '-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
      '.' + NS + '-chip{display:inline-flex;align-items:center;gap:.4em;font-size:12.5px;text-decoration:none;color:#374151;background:#eef1f5;padding:.45em .7em;border-radius:8px}',
      '.' + NS + '-chip:hover{background:#e3e7ee}',
      '.' + NS + '-info-book{margin-top:4px;width:100%;justify-content:center}',
      '.' + NS + '-powered{font-size:11px;color:#b3b9c4;text-align:center;padding:8px 0 2px}',
      '.' + NS + '-powered a{color:inherit}',

      // Responsive: full-screen modal + stacked info panel on phones.
      '@media (max-width:760px){',
      '.' + NS + '-overlay{padding:0;align-items:stretch}',
      '.' + NS + '-modal{width:100%;height:100vh;height:100dvh;max-height:none;border-radius:0}',
      // header sits below the status bar / notch
      '.' + NS + '-head{padding-top:calc(14px + env(safe-area-inset-top));padding-left:calc(16px + env(safe-area-inset-left));padding-right:calc(16px + env(safe-area-inset-right))}',
      '.' + NS + '-iconbtn{width:40px;height:40px}',
      '.' + NS + '-body{flex-direction:column}',
      '.' + NS + '-info{flex:0 0 auto;max-width:none;max-height:42vh;border-right:0;border-bottom:1px solid #eceef2}',
      '.' + NS + '-fab{font-size:14px;padding:.8em 1.15em}',
      '}',
      // Very small phones: let the booking frame dominate.
      '@media (max-width:480px){',
      '.' + NS + '-info{max-height:36vh}',
      '.' + NS + '-fab span{max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '}',

      // Dark mode
      '@media (prefers-color-scheme:dark){',
      '.' + NS + '-modal,.' + NS + '-frame-wrap,.' + NS + '-cover,.' + NS + '-inline{background:#161a22;color:#e6e9ef}',
      '.' + NS + '-head{border-color:#262c37}',
      '.' + NS + '-head h2{color:#f3f5f8}',
      '.' + NS + '-info{background:#12151c;border-color:#262c37}',
      '.' + NS + '-info .' + NS + '-name{color:#f3f5f8}',
      '.' + NS + '-svc-name,.' + NS + '-team-name,.' + NS + '-row .' + NS + '-v{color:#e6e9ef}',
      '.' + NS + '-svc{border-color:#262c37}',
      '.' + NS + '-iconbtn{background:#232936;color:#c7cdd8}',
      '.' + NS + '-iconbtn:hover{background:#2c3342}',
      '.' + NS + '-chip{background:#232936;color:#c7cdd8}',
      '.' + NS + '-inline{border-color:#262c37}',
      '}'
    ].join('\n');

    var style = el('style', { id: NS + '-styles', type: 'text/css' });
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // SVG icons (inline, no external assets)
  // ---------------------------------------------------------------------------
  var ICON = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>'
  };

  function iconEl(name, cls) {
    return el('span', { class: cx(NS + '-ico', cls), html: ICON[name] || '' });
  }

  // ---------------------------------------------------------------------------
  // Info panel rendering (from JSON config)
  // ---------------------------------------------------------------------------
  function formatPrice(svc, info) {
    if (svc.price == null) return null;
    var cur = svc.currency || (info && info.currency) || 'CHF';
    var val = typeof svc.price === 'number' ? svc.price.toLocaleString('de-CH') : svc.price;
    return (svc.priceFrom ? '' : '') + cur + ' ' + val;
  }

  function renderInfoPanel(cfg, info) {
    var wrap = el('div', { class: NS + '-info' });
    if (!info) return wrap;

    // Header
    if (info.name) wrap.appendChild(el('div', { class: NS + '-name', text: info.name }));
    if (info.tagline) wrap.appendChild(el('div', { class: NS + '-tagline', text: info.tagline }));

    // Contact / address
    var contactItems = [];
    if (info.address) {
      var a = info.address;
      var line = [a.street, [a.zip, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      if (line) contactItems.push({ icon: 'pin', text: line,
        href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((info.name ? info.name + ', ' : '') + line) });
    }
    if (info.phone) contactItems.push({ icon: 'phone', text: info.phone, href: 'tel:' + info.phone.replace(/\s+/g, '') });
    if (info.email) contactItems.push({ icon: 'mail', text: info.email, href: 'mailto:' + info.email });
    if (info.website) contactItems.push({ icon: 'globe', text: t(cfg, 'website'), href: info.website });

    if (contactItems.length) {
      var contactSec = el('section');
      contactSec.appendChild(el('h3', { text: t(cfg, 'contact') }));
      var chips = el('div', { class: NS + '-links' });
      contactItems.forEach(function (c) {
        chips.appendChild(el('a', {
          class: NS + '-chip', href: c.href,
          target: /^https?:/.test(c.href) ? '_blank' : null,
          rel: /^https?:/.test(c.href) ? 'noopener' : null
        }, [iconEl(c.icon), document.createTextNode(c.text)]));
      });
      contactSec.appendChild(chips);
      wrap.appendChild(contactSec);
    }

    // Opening hours
    if (info.hours && info.hours.length) {
      var hoursSec = el('section');
      hoursSec.appendChild(el('h3', { text: t(cfg, 'hours') }));
      info.hours.forEach(function (h) {
        var value = h.closed
          ? t(cfg, 'closedLabel')
          : (h.open && h.close ? h.open + '–' + h.close : (h.text || ''));
        hoursSec.appendChild(el('div', { class: NS + '-row' }, [
          el('span', { class: NS + '-k', text: h.day }),
          el('span', { class: NS + '-v', text: value })
        ]));
      });
      wrap.appendChild(hoursSec);
    }

    // Services (grouped by category if present)
    if (info.services && info.services.length) {
      var svcSec = el('section');
      svcSec.appendChild(el('h3', { text: t(cfg, 'services') }));
      var groups = {};
      var order = [];
      info.services.forEach(function (s) {
        var cat = s.category || '';
        if (!groups[cat]) { groups[cat] = []; order.push(cat); }
        groups[cat].push(s);
      });
      order.forEach(function (cat) {
        if (cat) svcSec.appendChild(el('div', { class: NS + '-svc-cat', text: cat }));
        groups[cat].forEach(function (s) {
          var price = formatPrice(s, info);
          var meta = [];
          if (s.duration) meta.push(s.duration + ' ' + t(cfg, 'duration'));
          var svcNode = el('div', { class: NS + '-svc' }, [
            el('div', { class: NS + '-svc-top' }, [
              el('span', { class: NS + '-svc-name', text: s.name }),
              price ? el('span', { class: NS + '-svc-price',
                text: (s.priceFrom ? t(cfg, 'from') + ' ' : '') + price }) : null
            ]),
            meta.length ? el('div', { class: NS + '-svc-meta', text: meta.join(' · ') }) : null
          ]);
          svcSec.appendChild(svcNode);
        });
      });
      wrap.appendChild(svcSec);
    }

    // Team
    if (info.team && info.team.length) {
      var teamSec = el('section');
      teamSec.appendChild(el('h3', { text: t(cfg, 'team') }));
      info.team.forEach(function (m) {
        var avatar = m.photo
          ? el('img', { class: NS + '-avatar', src: m.photo, alt: m.name, loading: 'lazy' })
          : el('span', { class: NS + '-avatar', text: (m.name || '?').charAt(0).toUpperCase() });
        teamSec.appendChild(el('div', { class: NS + '-team-item' }, [
          avatar,
          el('div', {}, [
            el('div', { class: NS + '-team-name', text: m.name }),
            m.role ? el('div', { class: NS + '-team-role', text: m.role }) : null
          ])
        ]));
      });
      wrap.appendChild(teamSec);
    }

    return wrap;
  }

  // ---------------------------------------------------------------------------
  // Booking frame (iframe) with loading + fallback handling
  // ---------------------------------------------------------------------------
  function renderFrame(cfg) {
    var url = bookingUrl(cfg);
    var wrap = el('div', { class: NS + '-frame-wrap' });

    var loaded = false;
    var iframe = el('iframe', {
      class: NS + '-frame',
      src: url,
      title: t(cfg, 'bookingAt') + ' ' + defaultTitle(cfg),
      allow: 'payment; clipboard-write',
      referrerpolicy: 'no-referrer-when-downgrade'
    });

    // Loading cover
    var loadingCover = el('div', { class: NS + '-cover' }, [
      el('div', { class: NS + '-spinner' }),
      el('div', { class: NS + '-muted', text: t(cfg, 'loading') })
    ]);

    // Fallback cover (shown if the frame never loads — e.g. X-Frame-Options)
    var fallbackCover = el('div', { class: cx(NS + '-cover', NS + '-hidden') }, [
      el('div', { class: NS + '-muted', text: t(cfg, 'loadTrouble') }),
      el('a', {
        class: NS + '-cta', href: url, target: '_blank', rel: 'noopener'
      }, [iconEl('external'), document.createTextNode(t(cfg, 'loadTroubleCta'))])
    ]);

    iframe.addEventListener('load', function () {
      loaded = true;
      loadingCover.classList.add(NS + '-hidden');
    });

    // If the frame hasn't fired `load` after a grace period, assume it was
    // blocked from embedding and reveal the "open in new tab" fallback.
    setTimeout(function () {
      if (!loaded) {
        loadingCover.classList.add(NS + '-hidden');
        fallbackCover.classList.remove(NS + '-hidden');
      }
    }, 8000);

    wrap.appendChild(iframe);
    wrap.appendChild(loadingCover);
    wrap.appendChild(fallbackCover);
    return wrap;
  }

  // ---------------------------------------------------------------------------
  // Body (info panel + frame) shared by modal and inline modes
  // ---------------------------------------------------------------------------
  function renderBody(cfg, info) {
    var body = el('div', { class: NS + '-body' });
    if (cfg.showInfoPanel && info) {
      var panel = renderInfoPanel(cfg, info);
      var url = bookingUrl(cfg);
      // In-panel primary booking CTA (opens booking in a new tab as a safe default)
      if (cfg.mode === 'inline' && url) {
        panel.appendChild(el('a', {
          class: cx(NS + '-cta', NS + '-info-book'),
          href: url, target: '_blank', rel: 'noopener'
        }, [iconEl('calendar'), document.createTextNode(t(cfg, 'book'))]));
      }
      panel.appendChild(el('div', { class: NS + '-powered', html:
        esc(t(cfg, 'poweredBy')) }));
      body.appendChild(panel);
    }
    body.appendChild(renderFrame(cfg));
    return body;
  }

  // ---------------------------------------------------------------------------
  // Modal controller
  // ---------------------------------------------------------------------------
  function Modal(cfg, info) {
    var overlay, modal, previouslyFocused, keyHandler;

    function build() {
      var header = el('div', { class: NS + '-head' }, [
        iconEl('calendar'),
        el('h2', {}, [
          document.createTextNode(defaultTitle(cfg)),
          el('span', { class: NS + '-sub', text: t(cfg, 'bookingAt') })
        ]),
        el('a', {
          class: NS + '-iconbtn', href: bookingUrl(cfg), target: '_blank',
          rel: 'noopener', title: t(cfg, 'openInNewTab'),
          'aria-label': t(cfg, 'openInNewTab'), html: ICON.external
        }),
        el('button', {
          class: NS + '-iconbtn', type: 'button', title: t(cfg, 'close'),
          'aria-label': t(cfg, 'close'), html: ICON.close, onClick: close
        })
      ]);

      modal = el('div', {
        class: NS + '-modal', role: 'dialog', 'aria-modal': 'true',
        'aria-label': t(cfg, 'bookingAt') + ' ' + defaultTitle(cfg)
      }, [header, renderBody(cfg, info)]);

      overlay = el('div', {
        class: cx(NS + '-root', NS + '-overlay'),
        onClick: function (e) { if (e.target === overlay) close(); }
      }, [modal]);
      overlay.style.setProperty('--' + NS + '-accent', cfg.color);
    }

    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      var f = modal.querySelectorAll('a[href],button,iframe,input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function open() {
      if (overlay) return;
      previouslyFocused = document.activeElement;
      build();
      document.body.appendChild(overlay);
      // Lock background scroll (documentElement + body covers iOS Safari).
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      // force reflow then animate in
      overlay.getBoundingClientRect();
      overlay.classList.add(NS + '-open');
      keyHandler = function (e) {
        if (e.key === 'Escape') close();
        else trapFocus(e);
      };
      document.addEventListener('keydown', keyHandler);
      var closeBtn = modal.querySelector('.' + NS + '-iconbtn:last-child');
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!overlay) return;
      var ov = overlay;
      overlay.classList.remove(NS + '-open');
      document.removeEventListener('keydown', keyHandler);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200);
      overlay = null; modal = null;
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    }

    return { open: open, close: close, isOpen: function () { return !!overlay; } };
  }

  // ---------------------------------------------------------------------------
  // Launcher button
  // ---------------------------------------------------------------------------
  function renderLauncher(cfg, onClick) {
    var label = cfg.label || t(cfg, 'book');
    var isFloating = cfg.position && cfg.position !== 'inline';
    var btn = el('button', {
      class: cx(NS + '-root', isFloating ? NS + '-fab' : NS + '-btn',
        isFloating ? NS + '-pos-' + cfg.position : null),
      type: 'button', 'aria-haspopup': 'dialog', onClick: onClick,
      html: ICON.calendar + '<span>' + esc(label) + '</span>'
    });
    btn.style.setProperty('--' + NS + '-accent', cfg.color);
    return btn;
  }

  function resolveMount(mount) {
    if (!mount) return null;
    if (typeof mount === 'string') return document.querySelector(mount);
    if (mount.nodeType === 1) return mount;
    return null;
  }

  // ---------------------------------------------------------------------------
  // Info loading (URL string -> fetch JSON, object -> use directly)
  // ---------------------------------------------------------------------------
  function loadInfo(info) {
    if (!info) return Promise.resolve(null);
    if (typeof info === 'object') return Promise.resolve(info);
    return fetch(info, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // ---------------------------------------------------------------------------
  // Public instance
  // ---------------------------------------------------------------------------
  function createInstance(userCfg) {
    var cfg = resolveConfig(userCfg);

    if (!bookingUrl(cfg)) {
      console.error('[HairlistWidget] Missing "salon" or "url" — nothing to book.');
      return { open: function () {}, close: function () {}, config: cfg };
    }

    injectStyles(cfg);

    var modalCtrl = null;
    var instance = {
      config: cfg,
      version: VERSION,
      bookingUrl: function () { return bookingUrl(cfg); },
      open: function () {},
      close: function () {},
      destroy: function () {}
    };

    loadInfo(cfg.info).then(function (info) {
      cfg._info = info;

      if (cfg.mode === 'inline') {
        var mount = resolveMount(cfg.mount);
        if (!mount) {
          console.error('[HairlistWidget] mode="inline" requires a valid "mount" selector.');
          return;
        }
        var container = el('div', { class: cx(NS + '-root', NS + '-inline') }, [
          el('div', { class: NS + '-head' }, [
            iconEl('calendar'),
            el('h2', {}, [
              document.createTextNode(defaultTitle(cfg)),
              el('span', { class: NS + '-sub', text: t(cfg, 'bookingAt') })
            ]),
            el('a', {
              class: NS + '-iconbtn', href: bookingUrl(cfg), target: '_blank',
              rel: 'noopener', title: t(cfg, 'openInNewTab'),
              'aria-label': t(cfg, 'openInNewTab'), html: ICON.external
            })
          ]),
          renderBody(cfg, info)
        ]);
        container.style.setProperty('--' + NS + '-accent', cfg.color);
        container.style.height = cfg.height;
        mount.appendChild(container);
        return;
      }

      // modal / button modes
      modalCtrl = Modal(cfg, info);
      instance.open = modalCtrl.open;
      instance.close = modalCtrl.close;

      // Launcher: append floating button to body, or into the mount for inline button
      var launcher = renderLauncher(cfg, modalCtrl.open);
      var target = cfg.position === 'inline' ? resolveMount(cfg.mount) : document.body;
      (target || document.body).appendChild(launcher);
      instance._launcher = launcher;
      instance.destroy = function () {
        modalCtrl.close();
        if (launcher.parentNode) launcher.parentNode.removeChild(launcher);
      };

      if (cfg.autoOpen) modalCtrl.open();
    });

    return instance;
  }

  // ---------------------------------------------------------------------------
  // Global API + auto-init
  // ---------------------------------------------------------------------------
  var singleton = null;

  var HairlistWidget = {
    version: VERSION,
    /** Initialize (and render) a widget instance. Returns the instance. */
    init: function (cfg) {
      var inst = createInstance(cfg || {});
      if (!singleton) singleton = inst;
      return inst;
    },
    /** Convenience: render an inline embed into a selector. */
    render: function (mount, cfg) {
      return this.init(Object.assign({}, cfg, { mode: 'inline', mount: mount }));
    },
    /** Open/close the first auto-initialized instance. */
    open: function () { if (singleton) singleton.open(); },
    close: function () { if (singleton) singleton.close(); },
    bookingUrl: bookingUrl,
    _defaults: DEFAULTS
  };

  // Minimal Object.assign shim for very old engines
  if (typeof Object.assign !== 'function') {
    Object.assign = function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i];
        if (src) for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
      }
      return target;
    };
  }

  global.HairlistWidget = HairlistWidget;

  // Auto-init when a data-salon/data-url is present on the script tag,
  // unless the host explicitly opts out with data-auto="false".
  function autoInit() {
    var script = document.currentScript;
    if (!script) {
      var list = document.getElementsByTagName('script');
      for (var i = list.length - 1; i >= 0; i--) {
        if (/hairlist-widget(\.min)?\.js/.test(list[i].src)) { script = list[i]; break; }
      }
    }
    var d = (script && script.dataset) || {};
    if (d.auto === 'false') return;
    if (d.salon || d.shop || d.url) singleton = createInstance({});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})(typeof window !== 'undefined' ? window : this);
