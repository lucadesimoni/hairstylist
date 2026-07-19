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

  // Native-flow strings (booking wizard + account). Falls back to German.
  var NATIVE_I18N = {
    de: {
      stepService: 'Leistung', stepStaff: 'Team', stepDate: 'Termin', stepContact: 'Kontakt',
      chooseService: 'Leistung wählen', chooseServiceHint: 'Womit dürfen wir Sie verwöhnen?',
      chooseStaff: 'Mitarbeiter:in wählen', chooseStaffHint: 'Wer soll sich um Sie kümmern?',
      anyStaff: 'Egal — nächste:r frei', anyStaffHint: 'Frühestmöglicher Termin',
      chooseDate: 'Termin wählen', chooseDateHint: 'Freie Zeitfenster kommen live von der API.',
      loadingAvail: 'Verfügbarkeit wird geladen …', closedDay: 'An diesem Tag geschlossen — bitte anderen Tag wählen.',
      noSlots: 'Keine freien Zeiten an diesem Tag.',
      yourDetails: 'Ihre Kontaktdaten', yourDetailsHint: 'Damit wir Ihren Termin bestätigen können.',
      name: 'Name', phone: 'Telefon', email: 'E-Mail', notes: 'Anmerkungen',
      next: 'Weiter', back: 'Zurück', confirmBtn: 'Termin bestätigen', booking: 'Wird gebucht …',
      nameErr: 'Bitte Namen angeben.', contactErr: 'Bitte Telefon oder E-Mail angeben.',
      confirmed: 'Termin bestätigt!', reference: 'Referenz', newBooking: 'Neue Buchung',
      service: 'Leistung', staff: 'Mitarbeiter:in', dateTime: 'Datum & Zeit', durationL: 'Dauer', price: 'Preis', onName: 'Auf den Namen',
      account: 'Konto', createAccount: 'Konto erstellen, um Termine später zu verwalten',
      optional: '(optional)', password: 'Passwort', passwordConfirm: 'Passwort bestätigen',
      pwShort: 'Passwort muss mindestens 8 Zeichen haben.', pwMismatch: 'Die Passwörter stimmen nicht überein.',
      emailForAccount: 'Für ein Konto wird eine gültige E-Mail benötigt.',
      alreadyCustomer: 'Schon Kundin oder Kunde?', signIn: 'Anmelden', signOut: 'Abmelden',
      loggedInAs: 'Angemeldet als', register: 'Registrieren', confirm: 'Bestätigen',
      agb: 'Ich akzeptiere die AGB und Datenschutzbestimmungen.', agbErr: 'Bitte AGB akzeptieren.',
      emailErr: 'Bitte gültige E-Mail angeben.', pwErr: 'Bitte Passwort eingeben.',
      loginErr: 'E-Mail oder Passwort ist nicht korrekt.', regFail: 'Registrierung fehlgeschlagen.',
      bookingFail: 'Die Buchung ist fehlgeschlagen.', accountCreated: 'Neu erstellt', accountSignedIn: 'Angemeldet',
      loadFail: 'Salondaten konnten nicht geladen werden.'
    },
    en: {
      stepService: 'Service', stepStaff: 'Staff', stepDate: 'Time', stepContact: 'Details',
      chooseService: 'Choose a service', chooseServiceHint: 'What can we do for you?',
      chooseStaff: 'Choose a stylist', chooseStaffHint: 'Who should take care of you?',
      anyStaff: 'No preference — first available', anyStaffHint: 'Earliest possible slot',
      chooseDate: 'Pick a time', chooseDateHint: 'Free slots load live from the API.',
      loadingAvail: 'Loading availability …', closedDay: 'Closed on this day — please pick another.',
      noSlots: 'No free slots on this day.',
      yourDetails: 'Your details', yourDetailsHint: 'So we can confirm your appointment.',
      name: 'Name', phone: 'Phone', email: 'Email', notes: 'Notes',
      next: 'Next', back: 'Back', confirmBtn: 'Confirm booking', booking: 'Booking …',
      nameErr: 'Please enter your name.', contactErr: 'Please enter a phone or email.',
      confirmed: 'Appointment confirmed!', reference: 'Reference', newBooking: 'New booking',
      service: 'Service', staff: 'Stylist', dateTime: 'Date & time', durationL: 'Duration', price: 'Price', onName: 'Name',
      account: 'Account', createAccount: 'Create an account to manage appointments later',
      optional: '(optional)', password: 'Password', passwordConfirm: 'Confirm password',
      pwShort: 'Password must be at least 8 characters.', pwMismatch: 'Passwords do not match.',
      emailForAccount: 'A valid email is required for an account.',
      alreadyCustomer: 'Already a customer?', signIn: 'Sign in', signOut: 'Sign out',
      loggedInAs: 'Signed in as', register: 'Register', confirm: 'Confirm',
      agb: 'I accept the terms and privacy policy.', agbErr: 'Please accept the terms.',
      emailErr: 'Please enter a valid email.', pwErr: 'Please enter a password.',
      loginErr: 'Email or password is incorrect.', regFail: 'Registration failed.',
      bookingFail: 'The booking failed.', accountCreated: 'Created', accountSignedIn: 'Signed in',
      loadFail: 'Could not load salon data.'
    },
    fr: {
      stepService: 'Prestation', stepStaff: 'Équipe', stepDate: 'Créneau', stepContact: 'Contact',
      chooseService: 'Choisir une prestation', chooseServiceHint: 'Que pouvons-nous faire pour vous ?',
      chooseStaff: 'Choisir un·e coiffeur·se', chooseStaffHint: 'Qui doit s’occuper de vous ?',
      anyStaff: 'Peu importe — au plus tôt', anyStaffHint: 'Créneau le plus proche',
      chooseDate: 'Choisir un créneau', chooseDateHint: 'Les créneaux libres proviennent de l’API en direct.',
      loadingAvail: 'Chargement des disponibilités …', closedDay: 'Fermé ce jour — choisissez un autre jour.',
      noSlots: 'Aucun créneau libre ce jour.',
      yourDetails: 'Vos coordonnées', yourDetailsHint: 'Pour confirmer votre rendez-vous.',
      name: 'Nom', phone: 'Téléphone', email: 'E-mail', notes: 'Remarques',
      next: 'Continuer', back: 'Retour', confirmBtn: 'Confirmer', booking: 'Réservation …',
      nameErr: 'Veuillez indiquer votre nom.', contactErr: 'Indiquez un téléphone ou un e-mail.',
      confirmed: 'Rendez-vous confirmé !', reference: 'Référence', newBooking: 'Nouvelle réservation',
      service: 'Prestation', staff: 'Coiffeur·se', dateTime: 'Date & heure', durationL: 'Durée', price: 'Prix', onName: 'Au nom de',
      account: 'Compte', createAccount: 'Créer un compte pour gérer vos rendez-vous',
      optional: '(facultatif)', password: 'Mot de passe', passwordConfirm: 'Confirmer le mot de passe',
      pwShort: 'Le mot de passe doit comporter au moins 8 caractères.', pwMismatch: 'Les mots de passe ne correspondent pas.',
      emailForAccount: 'Un e-mail valide est requis pour un compte.',
      alreadyCustomer: 'Déjà client·e ?', signIn: 'Se connecter', signOut: 'Se déconnecter',
      loggedInAs: 'Connecté·e en tant que', register: 'S’inscrire', confirm: 'Confirmer',
      agb: 'J’accepte les CGV et la politique de confidentialité.', agbErr: 'Veuillez accepter les CGV.',
      emailErr: 'Veuillez indiquer un e-mail valide.', pwErr: 'Veuillez saisir un mot de passe.',
      loginErr: 'E-mail ou mot de passe incorrect.', regFail: 'Échec de l’inscription.',
      bookingFail: 'La réservation a échoué.', accountCreated: 'Créé', accountSignedIn: 'Connecté·e',
      loadFail: 'Impossible de charger les données du salon.'
    },
    it: {
      stepService: 'Servizio', stepStaff: 'Team', stepDate: 'Orario', stepContact: 'Contatto',
      chooseService: 'Scegli un servizio', chooseServiceHint: 'Cosa possiamo fare per te?',
      chooseStaff: 'Scegli un·a parrucchiere·a', chooseStaffHint: 'Chi deve occuparsi di te?',
      anyStaff: 'Indifferente — primo libero', anyStaffHint: 'Prima disponibilità',
      chooseDate: 'Scegli un orario', chooseDateHint: 'Gli orari liberi arrivano dall’API in tempo reale.',
      loadingAvail: 'Caricamento disponibilità …', closedDay: 'Chiuso in questo giorno — scegline un altro.',
      noSlots: 'Nessun orario libero in questo giorno.',
      yourDetails: 'I tuoi dati', yourDetailsHint: 'Per confermare il tuo appuntamento.',
      name: 'Nome', phone: 'Telefono', email: 'E-mail', notes: 'Note',
      next: 'Avanti', back: 'Indietro', confirmBtn: 'Conferma', booking: 'Prenotazione …',
      nameErr: 'Inserisci il tuo nome.', contactErr: 'Inserisci un telefono o un’e-mail.',
      confirmed: 'Appuntamento confermato!', reference: 'Riferimento', newBooking: 'Nuova prenotazione',
      service: 'Servizio', staff: 'Parrucchiere·a', dateTime: 'Data e ora', durationL: 'Durata', price: 'Prezzo', onName: 'A nome di',
      account: 'Account', createAccount: 'Crea un account per gestire gli appuntamenti',
      optional: '(facoltativo)', password: 'Password', passwordConfirm: 'Conferma password',
      pwShort: 'La password deve avere almeno 8 caratteri.', pwMismatch: 'Le password non coincidono.',
      emailForAccount: 'Per un account serve un’e-mail valida.',
      alreadyCustomer: 'Già cliente?', signIn: 'Accedi', signOut: 'Esci',
      loggedInAs: 'Connesso come', register: 'Registrati', confirm: 'Conferma',
      agb: 'Accetto i termini e la privacy.', agbErr: 'Accetta i termini.',
      emailErr: 'Inserisci un’e-mail valida.', pwErr: 'Inserisci una password.',
      loginErr: 'E-mail o password non corretti.', regFail: 'Registrazione non riuscita.',
      bookingFail: 'La prenotazione non è riuscita.', accountCreated: 'Creato', accountSignedIn: 'Connesso',
      loadFail: 'Impossibile caricare i dati del salone.'
    }
  };
  function nt(cfg, key) {
    var pack = NATIVE_I18N[cfg.lang] || NATIVE_I18N.de;
    return pack[key] != null ? pack[key] : (NATIVE_I18N.de[key] || key);
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
    passLang: true,         // append ?lang=<lang> to the booking URL
    // --- Native API mode (booking/registration via the hairlist API) ---
    native: null,           // force native flow; auto-true when apiKey is set. mode:"native"/"native-inline" also enable it
    apiKey: null,           // salon API key (Settings > API Access) — enables native mode
    apiBase: null,          // API base URL (defaults to https://<shop>.hairlist.ch/api)
    apiAuthScheme: 'bearer',// 'bearer' | 'header' | 'query'
    apiSrc: null            // URL to hairlist-api.js (defaults to same dir as this script)
  };

  // Captured src of this script (for locating hairlist-api.js in native mode).
  // At module-load time document.currentScript is this very <script> element.
  var WIDGET_SRC = (function () {
    try {
      if (document.currentScript && document.currentScript.src) return document.currentScript.src;
      var list = document.getElementsByTagName('script');
      for (var i = list.length - 1; i >= 0; i--) {
        if (/hairlist-widget(\.min)?\.js/.test(list[i].src)) return list[i].src;
      }
    } catch (e) {}
    return '';
  })();

  function readScriptConfig() {
    var s = document.currentScript;
    if (!s) {
      var list = document.getElementsByTagName('script');
      for (var i = list.length - 1; i >= 0; i--) {
        if (/hairlist-widget(\.min)?\.js/.test(list[i].src)) { s = list[i]; break; }
      }
    }
    if (!s) return {};
    if (s.src) WIDGET_SRC = s.src;
    var d = s.dataset || {};
    var out = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      if (d[key] != null && d[key] !== '') out[key] = d[key];
    });
    // coerce booleans that arrive as strings
    ['showInfoPanel', 'autoOpen', 'passLang', 'native'].forEach(function (k) {
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
    // mode:"native"/"native-inline" is sugar for native flow + container mode.
    if (cfg.mode === 'native') { cfg.mode = 'modal'; cfg.native = true; }
    else if (cfg.mode === 'native-inline') { cfg.mode = 'inline'; cfg.native = true; }
    // Auto-enable native mode when an API key is present.
    if (cfg.native == null) cfg.native = !!cfg.apiKey;
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

      // Native API booking flow
      '.' + NS + '-nf{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;background:#fff}',
      '.' + NS + '-nf-steps{display:flex;gap:4px;padding:14px 16px 0;margin:0;list-style:none;flex:0 0 auto}',
      '.' + NS + '-nf-steps li{flex:1;font-size:11px;font-weight:700;color:#9aa1ad;text-align:center;padding-bottom:11px;position:relative}',
      '.' + NS + '-nf-steps li .n{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#f1f3f7;border:1px solid #e6e9ef;font-size:11px;margin-bottom:5px}',
      '.' + NS + '-nf-steps li[data-state=done] .n{background:var(--' + NS + '-accent);border-color:var(--' + NS + '-accent);color:#fff}',
      '.' + NS + '-nf-steps li[data-state=current]{color:#1f2430}',
      '.' + NS + '-nf-steps li[data-state=current] .n{border-color:var(--' + NS + '-accent);color:var(--' + NS + '-accent)}',
      '.' + NS + '-nf-steps li::after{content:"";position:absolute;top:10px;left:calc(-50% + 10px);width:calc(100% - 20px);height:2px;background:#e6e9ef}',
      '.' + NS + '-nf-steps li[data-state=done]::after,.' + NS + '-nf-steps li[data-state=current]::after{background:var(--' + NS + '-accent)}',
      '.' + NS + '-nf-steps li:first-child::after{display:none}',
      '.' + NS + '-nf-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px}',
      '.' + NS + '-nf-title{font-size:17px;font-weight:700;margin:0 0 3px}',
      '.' + NS + '-nf-hint{font-size:13px;color:#8b93a1;margin:0 0 14px}',
      '.' + NS + '-nf-cat{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9aa1ad;font-weight:700;margin:14px 0 6px}',
      '.' + NS + '-nf-cat:first-child{margin-top:0}',
      '.' + NS + '-nf-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;background:#fff;border:1px solid #e6e9ef;border-radius:11px;padding:12px 13px;margin:7px 0;cursor:pointer;font:inherit;color:inherit}',
      '.' + NS + '-nf-opt:hover{border-color:var(--' + NS + '-accent)}',
      '.' + NS + '-nf-opt[aria-pressed=true]{border-color:var(--' + NS + '-accent);box-shadow:inset 0 0 0 1px var(--' + NS + '-accent)}',
      '.' + NS + '-nf-lead{display:flex;align-items:center;gap:11px;min-width:0}',
      '.' + NS + '-nf-av{width:34px;height:34px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-weight:700;background:#f1f3f7;color:#6b7280;font-size:13px}',
      '.' + NS + '-nf-oname{font-weight:600;font-size:14px}',
      '.' + NS + '-nf-ometa{font-size:12px;color:#9aa1ad;margin-top:1px}',
      '.' + NS + '-nf-price{font-weight:700;color:var(--' + NS + '-accent);white-space:nowrap}',
      '.' + NS + '-nf-dates{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch}',
      '.' + NS + '-nf-date{flex:0 0 auto;min-width:56px;text-align:center;background:#fff;border:1px solid #e6e9ef;border-radius:11px;padding:8px 6px;cursor:pointer;font:inherit;color:inherit}',
      '.' + NS + '-nf-date[aria-pressed=true]{border-color:var(--' + NS + '-accent);box-shadow:inset 0 0 0 1px var(--' + NS + '-accent)}',
      '.' + NS + '-nf-date[data-closed]{opacity:.4;cursor:not-allowed}',
      '.' + NS + '-nf-dow{font-size:11px;font-weight:700;text-transform:uppercase;color:#9aa1ad}',
      '.' + NS + '-nf-num{font-size:18px;font-weight:700;line-height:1.2}',
      '.' + NS + '-nf-mon{font-size:11px;color:#9aa1ad}',
      '.' + NS + '-nf-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:8px;margin-top:14px}',
      '.' + NS + '-nf-slot{font:inherit;font-weight:600;font-size:13.5px;padding:9px 0;border-radius:8px;border:1px solid #e6e9ef;background:#fff;cursor:pointer;color:#1f2430}',
      '.' + NS + '-nf-slot:hover{border-color:var(--' + NS + '-accent)}',
      '.' + NS + '-nf-slot[aria-pressed=true]{background:var(--' + NS + '-accent);border-color:var(--' + NS + '-accent);color:#fff}',
      '.' + NS + '-nf-slot[disabled]{color:#cbcfd6;border-style:dashed;text-decoration:line-through;cursor:not-allowed}',
      '.' + NS + '-nf-note{font-size:13px;color:#8b93a1;text-align:center;padding:22px 0}',
      '.' + NS + '-nf-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}',
      '.' + NS + '-nf-field label{font-size:12px;font-weight:700;color:#4b5563}',
      '.' + NS + '-nf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.' + NS + '-nf input,.' + NS + '-nf textarea{font-family:inherit;font-size:16px;color:#1f2430;background:#fff;border:1px solid #d7dbe2;border-radius:9px;padding:10px 11px;width:100%}',
      '.' + NS + '-nf textarea{min-height:60px;resize:vertical}',
      '.' + NS + '-nf input:focus,.' + NS + '-nf textarea:focus{outline:2px solid var(--' + NS + '-accent);border-color:var(--' + NS + '-accent)}',
      '.' + NS + '-nf-err{font-size:12px;color:#c0392b;margin-top:4px}',
      '.' + NS + '-nf-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#6b7280;cursor:pointer;margin-top:10px}',
      '.' + NS + '-nf-check input{width:18px;height:18px;flex:0 0 auto;margin-top:1px}',
      '.' + NS + '-nf-acct{margin-top:12px;border-top:1px solid #eceef2;padding-top:12px}',
      '.' + NS + '-nf-authbar{display:flex;gap:8px;align-items:center;background:rgba(47,125,84,.1);border:1px solid rgba(47,125,84,.35);border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:13px}',
      '.' + NS + '-nf-who{flex:1;min-width:0}',
      '.' + NS + '-nf-tickmini{width:22px;height:22px;border-radius:50%;background:#2f7d54;color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
      '.' + NS + '-nf-tickmini svg{width:13px;height:13px}',
      '.' + NS + '-nf-link{color:var(--' + NS + '-accent);background:none;border:0;font:inherit;cursor:pointer;text-decoration:underline;padding:0}',
      '.' + NS + '-nf-tabs{display:flex;gap:6px;background:#f1f3f7;border:1px solid #e6e9ef;border-radius:10px;padding:4px;margin-bottom:14px}',
      '.' + NS + '-nf-tab{flex:1;font:inherit;font-weight:700;font-size:13px;padding:8px 0;border:0;border-radius:7px;background:transparent;color:#8b93a1;cursor:pointer}',
      '.' + NS + '-nf-tab[aria-selected=true]{background:#fff;color:#1f2430}',
      '.' + NS + '-nf-nav{display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid #eceef2;flex:0 0 auto}',
      '.' + NS + '-nf-sum{flex:1;min-width:0}',
      '.' + NS + '-nf-sumline{font-size:12.5px;color:#8b93a1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.' + NS + '-nf-sumprice{font-size:15px;font-weight:700}',
      '.' + NS + '-nf-load{text-align:center;color:#8b93a1;padding:30px 16px;font-size:14px}',
      '.' + NS + '-nf-confirm{text-align:center;padding:24px 16px}',
      '.' + NS + '-nf-tick{width:58px;height:58px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:rgba(47,125,84,.14);color:#2f7d54}',
      '.' + NS + '-nf-tick svg{width:30px;height:30px}',
      '.' + NS + '-nf-ref{font-family:ui-monospace,Menlo,monospace;font-size:13px;color:var(--' + NS + '-accent);background:#f6f7f9;border:1px dashed #e6e9ef;border-radius:8px;display:inline-block;padding:5px 10px;margin:6px 0 14px}',
      '.' + NS + '-nf-recap{text-align:left;max-width:340px;margin:0 auto 16px;border:1px solid #e6e9ef;border-radius:10px;overflow:hidden}',
      '.' + NS + '-nf-recap>div{display:flex;justify-content:space-between;gap:10px;padding:9px 12px;font-size:13.5px;border-bottom:1px solid #eceef2}',
      '.' + NS + '-nf-recap>div:last-child{border-bottom:0}',
      '.' + NS + '-nf-k{color:#8b93a1}',
      '.' + NS + '-nf-v{font-weight:600;text-align:right}',
      '.' + NS + '-nf-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4em;font:inherit;font-weight:700;font-size:14px;cursor:pointer;border:0;border-radius:10px;padding:.7em 1.1em;background:var(--' + NS + '-accent);color:#fff}',
      '.' + NS + '-nf-btn[disabled]{opacity:.5;cursor:not-allowed}',
      '.' + NS + '-nf-btn-ghost{background:transparent;color:var(--' + NS + '-accent);border:1px solid var(--' + NS + '-accent)}',
      '.' + NS + '-nf-full{width:100%}',

      // Dark mode
      '@media (prefers-color-scheme:dark){',
      '.' + NS + '-nf{background:#161a22;color:#e6e9ef}',
      '.' + NS + '-nf-opt,.' + NS + '-nf-date,.' + NS + '-nf-slot,.' + NS + '-nf input,.' + NS + '-nf textarea{background:#1c2029;border-color:#2b313d;color:#e6e9ef}',
      '.' + NS + '-nf-steps li .n{background:#232936;border-color:#2b313d}',
      '.' + NS + '-nf-av,.' + NS + '-nf-tabs{background:#232936;border-color:#2b313d}',
      '.' + NS + '-nf-tab[aria-selected=true]{background:#161a22;color:#f3f5f8}',
      '.' + NS + '-nf-title,.' + NS + '-nf-oname,.' + NS + '-nf-v,.' + NS + '-nf-sumprice{color:#f3f5f8}',
      '.' + NS + '-nf-ref,.' + NS + '-nf-recap,.' + NS + '-nf-nav,.' + NS + '-nf-acct{border-color:#2b313d}',
      '.' + NS + '-nf-recap>div{border-color:#262c37}',
      '.' + NS + '-nf-ref{background:#12151c}',
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
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>'
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
  // Native API mode — booking + registration driven by hairlist-api.js
  // ---------------------------------------------------------------------------
  function scriptDir() { var i = WIDGET_SRC.lastIndexOf('/'); return i >= 0 ? WIDGET_SRC.slice(0, i + 1) : ''; }
  var _apiLoad = null;
  function ensureApi(cfg) {
    var mk = function () {
      return global.HairlistApi.create({
        shop: cfg.salon || undefined,
        baseUrl: cfg.apiBase || undefined,
        apiKey: cfg.apiKey || cfg.key || undefined,
        authScheme: cfg.apiAuthScheme || 'bearer',
        lang: cfg.lang,
        endpoints: cfg.apiEndpoints || undefined,
        map: cfg.apiMap || undefined,
        onExchange: cfg.onExchange || null,
        transport: cfg.apiTransport || null
      });
    };
    if (global.HairlistApi) return Promise.resolve(mk());
    if (!_apiLoad) {
      _apiLoad = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = cfg.apiSrc || (scriptDir() + 'hairlist-api.js');
        s.onload = function () { res(); };
        s.onerror = function () { rej(new Error('hairlist-api.js could not be loaded')); };
        document.head.appendChild(s);
      });
    }
    return _apiLoad.then(function () {
      if (!global.HairlistApi) throw new Error('HairlistApi not available');
      return mk();
    });
  }

  var NF_DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var NF_MON = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  function nfPad(n) { return n < 10 ? '0' + n : '' + n; }
  function nfISO(d) { return d.getFullYear() + '-' + nfPad(d.getMonth() + 1) + '-' + nfPad(d.getDate()); }
  function nfEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim()); }
  function nfInitials(n) { return (n || '').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }

  function renderNative(cfg) {
    var root = el('div', { class: NS + '-nf' });
    root.appendChild(el('div', { class: NS + '-nf-load' }, [
      el('div', { class: NS + '-spinner', style: 'margin:0 auto 12px' }),
      document.createTextNode(t(cfg, 'loading'))
    ]));

    var api = null, DATA = { services: [], staff: [], salon: null };
    var st = { step: 0, serviceId: null, staffId: null, date: null, time: null, avail: null,
               contact: { name: '', email: '', phone: '', notes: '' },
               createAccount: false, pw: '', pw2: '', ref: null, accountResult: null };
    var user = null;
    var stepsEl, bodyEl, navEl, backBtn, nextBtn, sumLineEl, sumPriceEl;

    function money(s) { return (s.priceFrom ? t(cfg, 'from') + ' ' : '') + (s.currency || 'CHF') + ' ' + s.price; }
    function svcById(id) { for (var i = 0; i < DATA.services.length; i++) if (DATA.services[i].id === id) return DATA.services[i]; return null; }
    function staffName(id) { if (id === 'any') return nt(cfg, 'anyStaff'); for (var i = 0; i < DATA.staff.length; i++) if (DATA.staff[i].id === id) return DATA.staff[i].name; return id; }
    var TICK = ICON.check;

    ensureApi(cfg).then(function (a) {
      api = a;
      return Promise.all([a.getSalon(), a.getServices(), a.getStaff()]);
    }).then(function (r) {
      DATA.salon = r[0]; DATA.services = r[1]; DATA.staff = r[2];
      if (DATA.salon && DATA.salon.name && cfg._onSalon) cfg._onSalon(DATA.salon);
      buildShell(); go(0);
    }).catch(function () {
      root.innerHTML = '';
      root.appendChild(el('div', { class: NS + '-nf-note', text: nt(cfg, 'loadFail') }));
    });

    function buildShell() {
      root.innerHTML = '';
      stepsEl = el('ol', { class: NS + '-nf-steps' });
      [nt(cfg, 'stepService'), nt(cfg, 'stepStaff'), nt(cfg, 'stepDate'), nt(cfg, 'stepContact')].forEach(function (lbl, i) {
        stepsEl.appendChild(el('li', { 'data-step': i }, [el('span', { class: 'n', text: String(i + 1) }), document.createTextNode(lbl)]));
      });
      bodyEl = el('div', { class: NS + '-nf-body' });
      sumLineEl = el('div', { class: NS + '-nf-sumline' });
      sumPriceEl = el('div', { class: NS + '-nf-sumprice' });
      backBtn = el('button', { class: cx(NS + '-nf-btn', NS + '-nf-btn-ghost'), type: 'button', text: nt(cfg, 'back'), onClick: function () { if (st.step > 0) go(st.step - 1); } });
      nextBtn = el('button', { class: NS + '-nf-btn', type: 'button', text: nt(cfg, 'next'), onClick: onNext });
      navEl = el('div', { class: NS + '-nf-nav' }, [
        el('div', { class: NS + '-nf-sum' }, [sumLineEl, sumPriceEl]), backBtn, nextBtn
      ]);
      root.appendChild(stepsEl); root.appendChild(bodyEl); root.appendChild(navEl);
    }

    // ---- Steps ----
    function stepService() {
      var cats = [], seen = {};
      DATA.services.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = []; cats.push(s.category); } seen[s.category].push(s); });
      var h = '<h3 class="' + NS + '-nf-title">' + esc(nt(cfg, 'chooseService')) + '</h3><p class="' + NS + '-nf-hint">' + esc(nt(cfg, 'chooseServiceHint')) + '</p>';
      cats.forEach(function (c) {
        if (c) h += '<div class="' + NS + '-nf-cat">' + esc(c) + '</div>';
        seen[c].forEach(function (s) {
          h += '<button class="' + NS + '-nf-opt" type="button" aria-pressed="' + (st.serviceId === s.id) + '" data-id="' + esc(s.id) + '">' +
            '<span><span class="' + NS + '-nf-oname">' + esc(s.name) + '</span><span class="' + NS + '-nf-ometa">' + s.duration + ' ' + esc(t(cfg, 'duration')) + '</span></span>' +
            '<span class="' + NS + '-nf-price">' + esc(money(s)) + '</span></button>';
        });
      });
      bodyEl.innerHTML = h;
      bodyEl.querySelectorAll('[data-id]').forEach(function (b) {
        b.onclick = function () { if (st.serviceId !== b.getAttribute('data-id')) { st.serviceId = b.getAttribute('data-id'); st.avail = null; st.date = null; st.time = null; } refresh(); };
      });
    }

    function stepStaff() {
      var opts = [{ id: 'any', name: nt(cfg, 'anyStaff'), role: nt(cfg, 'anyStaffHint'), any: true }].concat(DATA.staff);
      var h = '<h3 class="' + NS + '-nf-title">' + esc(nt(cfg, 'chooseStaff')) + '</h3><p class="' + NS + '-nf-hint">' + esc(nt(cfg, 'chooseStaffHint')) + '</p>';
      opts.forEach(function (m) {
        var av = m.any ? '★' : esc(nfInitials(m.name));
        h += '<button class="' + NS + '-nf-opt" type="button" aria-pressed="' + (st.staffId === m.id) + '" data-id="' + esc(m.id) + '">' +
          '<span class="' + NS + '-nf-lead"><span class="' + NS + '-nf-av">' + av + '</span>' +
          '<span><span class="' + NS + '-nf-oname">' + esc(m.name) + '</span><span class="' + NS + '-nf-ometa">' + esc(m.role || '') + '</span></span></span></button>';
      });
      bodyEl.innerHTML = h;
      bodyEl.querySelectorAll('[data-id]').forEach(function (b) {
        b.onclick = function () { if (st.staffId !== b.getAttribute('data-id')) { st.staffId = b.getAttribute('data-id'); st.avail = null; st.date = null; st.time = null; } refresh(); };
      });
    }

    function stepDate() {
      bodyEl.innerHTML = '<h3 class="' + NS + '-nf-title">' + esc(nt(cfg, 'chooseDate')) + '</h3><p class="' + NS + '-nf-hint">' + esc(nt(cfg, 'chooseDateHint')) + '</p><div class="' + NS + '-nf-dw"></div>';
      var dw = bodyEl.querySelector('.' + NS + '-nf-dw');
      var key = st.serviceId + '|' + (st.staffId || 'any');
      if (st.avail && st.avail.key === key) { paintDates(dw); return; }
      dw.innerHTML = '<div class="' + NS + '-nf-load"><div class="' + NS + '-spinner" style="margin:0 auto 10px"></div>' + esc(nt(cfg, 'loadingAvail')) + '</div>';
      var today = new Date(); var to = new Date(); to.setDate(today.getDate() + 13);
      api.getAvailability({ serviceId: st.serviceId, staffId: st.staffId, from: nfISO(today), to: nfISO(to) }).then(function (days) {
        st.avail = { key: key, days: days };
        if (!st.date || !dayFor(st.date)) pickDefault();
        if (st.step === 2) { var dw2 = bodyEl.querySelector('.' + NS + '-nf-dw'); if (dw2) paintDates(dw2); refresh(); }
      }).catch(function () { var dw3 = bodyEl.querySelector('.' + NS + '-nf-dw'); if (dw3) dw3.innerHTML = '<div class="' + NS + '-nf-note">' + esc(nt(cfg, 'loadFail')) + '</div>'; });
    }
    function dayFor(iso) { if (!st.avail) return null; for (var i = 0; i < st.avail.days.length; i++) if (st.avail.days[i].date === iso) return st.avail.days[i]; return null; }
    function pickDefault() {
      var d = st.avail.days, i;
      for (i = 0; i < d.length; i++) if (!d[i].closed && d[i].slots.some(function (s) { return s.free; })) { st.date = d[i].date; return; }
      for (i = 0; i < d.length; i++) if (!d[i].closed) { st.date = d[i].date; return; }
    }
    function paintDates(dw) {
      dw.innerHTML = '<div class="' + NS + '-nf-dates"></div><div class="' + NS + '-nf-sw"></div>';
      var row = dw.querySelector('.' + NS + '-nf-dates');
      st.avail.days.forEach(function (day) {
        var d = new Date(day.date + 'T00:00:00');
        var b = el('button', { class: NS + '-nf-date', type: 'button', 'aria-pressed': st.date === day.date });
        if (day.closed) b.setAttribute('data-closed', '1');
        b.innerHTML = '<div class="' + NS + '-nf-dow">' + NF_DOW[d.getDay()] + '</div><div class="' + NS + '-nf-num">' + d.getDate() + '</div><div class="' + NS + '-nf-mon">' + NF_MON[d.getMonth()] + '</div>';
        if (!day.closed) b.onclick = function () { st.date = day.date; st.time = null; paintDates(dw); refresh(); };
        row.appendChild(b);
      });
      var sw = dw.querySelector('.' + NS + '-nf-sw'); var day = dayFor(st.date);
      if (!day || day.closed) { sw.innerHTML = '<div class="' + NS + '-nf-note">' + esc(nt(cfg, 'closedDay')) + '</div>'; return; }
      var g = el('div', { class: NS + '-nf-slots' });
      day.slots.forEach(function (s) {
        var b = el('button', { class: NS + '-nf-slot', type: 'button', 'aria-pressed': st.time === s.time, text: s.time });
        if (!s.free) b.disabled = true; else b.onclick = function () { st.time = s.time; paintDates(dw); refresh(); };
        g.appendChild(b);
      });
      sw.appendChild(g);
      if (!day.slots.some(function (s) { return s.free; })) sw.insertAdjacentHTML('beforeend', '<div class="' + NS + '-nf-note">' + esc(nt(cfg, 'noSlots')) + '</div>');
    }

    function stepContact() {
      var c = st.contact;
      var banner = user
        ? '<div class="' + NS + '-nf-authbar"><span class="' + NS + '-nf-tickmini">' + TICK + '</span><span class="' + NS + '-nf-who">' + esc(nt(cfg, 'loggedInAs')) + ' <b>' + esc(user.name) + '</b></span><button type="button" class="' + NS + '-nf-link" data-act="signout">' + esc(nt(cfg, 'signOut')) + '</button></div>'
        : '<p class="' + NS + '-nf-hint">' + esc(nt(cfg, 'alreadyCustomer')) + ' <button type="button" class="' + NS + '-nf-link" data-act="login">' + esc(nt(cfg, 'signIn')) + '</button></p>';
      var acct = user ? '' :
        '<div class="' + NS + '-nf-acct"><label class="' + NS + '-nf-check"><input type="checkbox" data-act="makeacct"' + (st.createAccount ? ' checked' : '') + '><span>' + esc(nt(cfg, 'createAccount')) + ' <span style="color:#9aa1ad">' + esc(nt(cfg, 'optional')) + '</span></span></label>' +
        '<div data-acctfields' + (st.createAccount ? '' : ' hidden') + '><div class="' + NS + '-nf-grid" style="margin-top:12px">' +
          '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'password')) + ' *</label><input type="password" data-f="pw" value="' + esc(st.pw) + '"></div>' +
          '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'passwordConfirm')) + ' *</label><input type="password" data-f="pw2" value="' + esc(st.pw2) + '"></div>' +
        '</div><div class="' + NS + '-nf-err" data-err="pw" hidden></div></div></div>';
      bodyEl.innerHTML =
        '<h3 class="' + NS + '-nf-title">' + esc(nt(cfg, 'yourDetails')) + '</h3><p class="' + NS + '-nf-hint">' + esc(nt(cfg, 'yourDetailsHint')) + '</p>' + banner +
        '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'name')) + ' *</label><input type="text" data-f="name" value="' + esc(c.name) + '"><div class="' + NS + '-nf-err" data-err="name" hidden>' + esc(nt(cfg, 'nameErr')) + '</div></div>' +
        '<div class="' + NS + '-nf-grid">' +
          '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'phone')) + ' *</label><input type="tel" data-f="phone" value="' + esc(c.phone) + '"></div>' +
          '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'email')) + '</label><input type="email" data-f="email" value="' + esc(c.email) + '"></div>' +
        '</div>' +
        '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'notes')) + '</label><textarea data-f="notes">' + esc(c.notes) + '</textarea></div>' +
        '<div class="' + NS + '-nf-err" data-err="contact" hidden>' + esc(nt(cfg, 'contactErr')) + '</div>' + acct;
      bodyEl.querySelectorAll('[data-f]').forEach(function (inp) {
        var f = inp.getAttribute('data-f');
        inp.addEventListener('input', function () {
          if (f === 'pw') st.pw = inp.value; else if (f === 'pw2') st.pw2 = inp.value; else st.contact[f] = inp.value;
          nextBtn.disabled = !valid();
        });
      });
      var mk = bodyEl.querySelector('[data-act=makeacct]');
      if (mk) mk.addEventListener('change', function () { st.createAccount = this.checked; var af = bodyEl.querySelector('[data-acctfields]'); if (af) af.hidden = !this.checked; nextBtn.disabled = !valid(); });
      bodyEl.querySelectorAll('[data-act=signout]').forEach(function (b) { b.onclick = function () { user = null; stepContact(); refresh(); }; });
      bodyEl.querySelectorAll('[data-act=login]').forEach(function (b) { b.onclick = function () { authView('login'); }; });
    }

    // ---- Inline auth view (register / login via API) ----
    function authView(view) {
      view = view === 'login' ? 'login' : 'register';
      navEl.style.display = 'none';
      var tabs = '<div class="' + NS + '-nf-tabs"><button class="' + NS + '-nf-tab" type="button" data-tab="register" aria-selected="' + (view === 'register') + '">' + esc(nt(cfg, 'register')) + '</button>' +
        '<button class="' + NS + '-nf-tab" type="button" data-tab="login" aria-selected="' + (view === 'login') + '">' + esc(nt(cfg, 'signIn')) + '</button></div>';
      var form;
      if (view === 'register') {
        form = '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'name')) + ' *</label><input type="text" id="' + NS + '-r-name" value="' + esc(st.contact.name) + '"></div>' +
          '<div class="' + NS + '-nf-grid"><div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'email')) + ' *</label><input type="email" id="' + NS + '-r-email" value="' + esc(st.contact.email) + '"></div>' +
          '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'phone')) + '</label><input type="tel" id="' + NS + '-r-phone" value="' + esc(st.contact.phone) + '"></div></div>' +
          '<div class="' + NS + '-nf-grid"><div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'password')) + ' *</label><input type="password" id="' + NS + '-r-pw"></div>' +
          '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'passwordConfirm')) + ' *</label><input type="password" id="' + NS + '-r-pw2"></div></div>' +
          '<label class="' + NS + '-nf-check"><input type="checkbox" id="' + NS + '-r-agb"><span>' + esc(nt(cfg, 'agb')) + '</span></label>' +
          '<div class="' + NS + '-nf-err" id="' + NS + '-r-err" hidden></div>' +
          '<button class="' + NS + '-nf-btn ' + NS + '-nf-full" type="button" id="' + NS + '-r-submit" style="margin-top:14px">' + esc(nt(cfg, 'confirm')) + '</button>';
      } else {
        form = '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'email')) + ' *</label><input type="email" id="' + NS + '-l-email" value="' + esc(st.contact.email) + '"></div>' +
          '<div class="' + NS + '-nf-field"><label>' + esc(nt(cfg, 'password')) + ' *</label><input type="password" id="' + NS + '-l-pw"></div>' +
          '<div class="' + NS + '-nf-err" id="' + NS + '-l-err" hidden></div>' +
          '<button class="' + NS + '-nf-btn ' + NS + '-nf-full" type="button" id="' + NS + '-l-submit" style="margin-top:14px">' + esc(nt(cfg, 'signIn')) + '</button>';
      }
      bodyEl.innerHTML = '<h3 class="' + NS + '-nf-title">' + esc(nt(cfg, 'account')) + '</h3>' + tabs + form +
        '<button class="' + NS + '-nf-link" type="button" id="' + NS + '-a-back" style="margin-top:14px">← ' + esc(nt(cfg, 'back')) + '</button>';
      bodyEl.querySelectorAll('.' + NS + '-nf-tab').forEach(function (tb) { tb.onclick = function () { authView(tb.getAttribute('data-tab')); }; });
      document.getElementById(NS + '-a-back').onclick = function () { navEl.style.display = ''; go(3); };
      if (view === 'register') {
        document.getElementById(NS + '-r-submit').onclick = function () {
          var name = val('r-name'), email = val('r-email'), phone = val('r-phone'), pw = val('r-pw'), pw2 = val('r-pw2'),
              agb = document.getElementById(NS + '-r-agb').checked, err = document.getElementById(NS + '-r-err');
          var msg = '';
          if (!name.trim()) msg = nt(cfg, 'nameErr'); else if (!nfEmail(email)) msg = nt(cfg, 'emailErr');
          else if (pw.length < 8) msg = nt(cfg, 'pwShort'); else if (pw !== pw2) msg = nt(cfg, 'pwMismatch');
          else if (!agb) msg = nt(cfg, 'agbErr');
          if (msg) { err.textContent = msg; err.hidden = false; return; }
          err.hidden = true; var btn = document.getElementById(NS + '-r-submit'); btn.disabled = true; btn.textContent = '…';
          api.registerCustomer({ name: name, email: email, phone: phone, password: pw }).then(function (cust) {
            user = { id: cust.id, name: cust.name || name, email: cust.email || email, phone: phone };
            st.contact.name = user.name; st.contact.email = user.email; if (phone) st.contact.phone = phone;
            navEl.style.display = ''; go(3);
          }).catch(function () { btn.disabled = false; btn.textContent = nt(cfg, 'confirm'); err.textContent = nt(cfg, 'regFail'); err.hidden = false; });
        };
      } else {
        document.getElementById(NS + '-l-submit').onclick = function () {
          var email = val('l-email'), pw = val('l-pw'), err = document.getElementById(NS + '-l-err');
          if (!nfEmail(email)) { err.textContent = nt(cfg, 'emailErr'); err.hidden = false; return; }
          if (!pw) { err.textContent = nt(cfg, 'pwErr'); err.hidden = false; return; }
          err.hidden = true; var btn = document.getElementById(NS + '-l-submit'); btn.disabled = true; btn.textContent = '…';
          api.loginCustomer({ email: email, password: pw }).then(function (cust) {
            user = { id: cust.id, name: cust.name, email: cust.email || email, phone: cust.phone || '' };
            st.contact.name = user.name; st.contact.email = user.email; if (user.phone) st.contact.phone = user.phone;
            navEl.style.display = ''; go(3);
          }).catch(function (e) { btn.disabled = false; btn.textContent = nt(cfg, 'signIn'); err.textContent = (e && e.status === 401) ? nt(cfg, 'loginErr') : nt(cfg, 'regFail'); err.hidden = false; });
        };
      }
      function val(id) { var e = document.getElementById(NS + '-' + id); return e ? e.value : ''; }
    }

    function renderConfirm() {
      var svc = svcById(st.serviceId), d = new Date(st.date + 'T00:00:00');
      var when = NF_DOW[d.getDay()] + ', ' + d.getDate() + '. ' + NF_MON[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + st.time;
      navEl.style.display = 'none'; stepsEl.style.opacity = '.5';
      bodyEl.innerHTML =
        '<div class="' + NS + '-nf-confirm"><div class="' + NS + '-nf-tick">' + TICK + '</div>' +
        '<h3 class="' + NS + '-nf-title" style="font-size:20px">' + esc(nt(cfg, 'confirmed')) + '</h3>' +
        '<div class="' + NS + '-nf-ref">' + esc(nt(cfg, 'reference')) + ' ' + esc(st.ref) + '</div>' +
        '<div class="' + NS + '-nf-recap">' +
          row(nt(cfg, 'service'), svc.name) + row(nt(cfg, 'staff'), staffName(st.staffId)) +
          row(nt(cfg, 'dateTime'), when) + row(nt(cfg, 'durationL'), svc.duration + ' ' + t(cfg, 'duration')) +
          row(nt(cfg, 'price'), money(svc)) + row(nt(cfg, 'onName'), st.contact.name) +
          (st.accountResult ? row(nt(cfg, 'account'), (st.accountResult === 'created' ? nt(cfg, 'accountCreated') : nt(cfg, 'accountSignedIn')) + ' · ' + st.contact.email) : '') +
        '</div>' +
        '<button class="' + NS + '-nf-btn" type="button" data-act="again">' + esc(nt(cfg, 'newBooking')) + '</button></div>';
      bodyEl.querySelector('[data-act=again]').onclick = reset;
      function row(k, v) { return '<div><span class="' + NS + '-nf-k">' + esc(k) + '</span><span class="' + NS + '-nf-v">' + esc(v) + '</span></div>'; }
    }

    // ---- Flow control ----
    var steps = [stepService, stepStaff, stepDate, stepContact];
    function valid() {
      if (st.step === 0) return st.serviceId != null;
      if (st.step === 1) return st.staffId != null;
      if (st.step === 2) return st.date != null && st.time != null;
      if (st.step === 3) {
        var c = st.contact;
        if (!c.name.trim()) return false;
        if (!(c.phone.trim() || c.email.trim())) return false;
        if (st.createAccount && !user) {
          if (!nfEmail(c.email)) return false;
          if ((st.pw || '').length < 8) return false;
          if (st.pw !== st.pw2) return false;
        }
        return true;
      }
      return false;
    }
    function updateSteps() {
      stepsEl.querySelectorAll('li').forEach(function (li) {
        var s = +li.getAttribute('data-step');
        li.setAttribute('data-state', s < st.step ? 'done' : (s === st.step ? 'current' : ''));
      });
    }
    function summary() {
      var parts = [], svc = svcById(st.serviceId);
      if (svc) parts.push(svc.name);
      if (st.staffId) parts.push(staffName(st.staffId));
      if (st.date && st.time) { var d = new Date(st.date + 'T00:00:00'); parts.push(NF_DOW[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + ' ' + st.time); }
      sumLineEl.textContent = parts.length ? parts.join(' · ') : nt(cfg, 'chooseService');
      sumPriceEl.textContent = svc ? money(svc) : '';
    }
    function refresh() { updateSteps(); summary(); nextBtn.disabled = !valid(); nextBtn.textContent = st.step === 3 ? nt(cfg, 'confirmBtn') : nt(cfg, 'next'); backBtn.hidden = st.step === 0; }
    function go(n) { st.step = n; steps[n](); refresh(); }
    function onNext() {
      if (!valid()) {
        if (st.step === 3) {
          var c = st.contact, q = function (s) { return bodyEl.querySelector(s); };
          if (q('[data-err=name]')) q('[data-err=name]').hidden = !!c.name.trim();
          if (q('[data-err=contact]')) q('[data-err=contact]').hidden = !!(c.phone.trim() || c.email.trim());
          if (st.createAccount && !user && q('[data-err=pw]')) {
            var m = ''; if (!nfEmail(c.email)) m = nt(cfg, 'emailForAccount');
            else if ((st.pw || '').length < 8) m = nt(cfg, 'pwShort'); else if (st.pw !== st.pw2) m = nt(cfg, 'pwMismatch');
            q('[data-err=pw]').textContent = m; q('[data-err=pw]').hidden = !m;
          }
        }
        return;
      }
      if (st.step < 3) { go(st.step + 1); return; }
      nextBtn.disabled = true; nextBtn.textContent = nt(cfg, 'booking'); backBtn.disabled = true;
      var chain = Promise.resolve();
      if (!user && st.createAccount) {
        chain = api.registerCustomer({ name: st.contact.name, email: st.contact.email, phone: st.contact.phone, password: st.pw })
          .then(function (cust) { user = { id: cust.id, name: cust.name || st.contact.name, email: cust.email || st.contact.email, phone: st.contact.phone }; st.accountResult = 'created'; });
      } else if (user) { st.accountResult = 'signedin'; }
      chain.then(function () {
        return api.createBooking({
          serviceId: st.serviceId, staffId: st.staffId, start: st.date + 'T' + st.time + ':00',
          customerId: user && user.id, customer: { name: st.contact.name, email: st.contact.email, phone: st.contact.phone, notes: st.contact.notes }
        });
      }).then(function (res) {
        st.ref = res.reference || res.id || '—'; backBtn.disabled = false; renderConfirm();
      }).catch(function (err) {
        nextBtn.disabled = false; backBtn.disabled = false; nextBtn.textContent = nt(cfg, 'confirmBtn');
        var note = el('div', { class: NS + '-nf-err', text: nt(cfg, 'bookingFail') + (err && err.message ? ' (' + err.message + ')' : '') });
        bodyEl.appendChild(note);
      });
    }
    function reset() {
      st = { step: 0, serviceId: null, staffId: null, date: null, time: null, avail: null,
             contact: { name: '', email: '', phone: '', notes: '' }, createAccount: false, pw: '', pw2: '', ref: null, accountResult: null };
      if (user) { st.contact.name = user.name; st.contact.phone = user.phone || ''; st.contact.email = user.email; }
      navEl.style.display = ''; nextBtn.disabled = false; backBtn.disabled = false; stepsEl.style.opacity = '';
      go(0);
    }

    return root;
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
    if (cfg.native) { body.appendChild(renderNative(cfg)); return body; }
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
        (bookingUrl(cfg) ? el('a', {
          class: NS + '-iconbtn', href: bookingUrl(cfg), target: '_blank',
          rel: 'noopener', title: t(cfg, 'openInNewTab'),
          'aria-label': t(cfg, 'openInNewTab'), html: ICON.external
        }) : null),
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

    if (cfg.native) {
      if (!cfg.apiBase && !cfg.salon && !cfg.url) {
        console.error('[HairlistWidget] native mode requires "apiBase" or "salon"/"shop".');
        return { open: function () {}, close: function () {}, config: cfg };
      }
    } else if (!bookingUrl(cfg)) {
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
            (bookingUrl(cfg) ? el('a', {
              class: NS + '-iconbtn', href: bookingUrl(cfg), target: '_blank',
              rel: 'noopener', title: t(cfg, 'openInNewTab'),
              'aria-label': t(cfg, 'openInNewTab'), html: ICON.external
            }) : null)
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
