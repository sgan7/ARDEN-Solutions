/* ARDEN Solutions : traduction côté client.
   Le français est la langue source du site. Ce script remplace les textes
   français par leur traduction (dictionnaires /assets/i18n/<langue>.json,
   indexés par le texte français) et ajoute le sélecteur de langue à drapeau
   dans l'en-tête. La langue choisie est mémorisée dans le navigateur ;
   l'adresse ?lang=xx permet aussi de partager une version traduite. */
(function () {
  'use strict';
  if (window.__ardenI18n) { window.__ardenI18n.boot(); return; }

  var SITE = 'https://arden-solutions.net';
  var STORE = 'arden-lang';
  var LANGS = [
    { code: 'fr', name: 'Français', locale: 'fr_FR' },
    { code: 'en', name: 'English', locale: 'en_GB' },
    { code: 'ar', name: 'العربية', locale: 'ar_AR', rtl: true },
    { code: 'ja', name: '日本語', locale: 'ja_JP' },
    { code: 'it', name: 'Italiano', locale: 'it_IT' },
    { code: 'de', name: 'Deutsch', locale: 'de_DE' }
  ];
  var FLAGS = {
    fr: '<svg viewBox="0 0 3 2" preserveAspectRatio="none"><path fill="#002654" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#ED2939" d="M2 0h1v2H2z"/></svg>',
    en: '<svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice"><path fill="#012169" d="M0 0h60v40H0z"/><path stroke="#fff" stroke-width="8" d="M0 0l60 40M60 0L0 40"/><path stroke="#C8102E" stroke-width="3" d="M0 0l30 20M60 0L30 20M0 40l30-20M60 40L30 20" transform="translate(1.5 -1)"/><path stroke="#fff" stroke-width="12" d="M30 0v40M0 20h60"/><path stroke="#C8102E" stroke-width="7" d="M30 0v40M0 20h60"/></svg>',
    ar: '<svg viewBox="0 0 12 8" preserveAspectRatio="none"><path fill="#00732F" d="M0 0h12v2.67H0z"/><path fill="#fff" d="M0 2.67h12v2.66H0z"/><path fill="#000" d="M0 5.33h12V8H0z"/><path fill="#FF0000" d="M0 0h3v8H0z"/></svg>',
    ja: '<svg viewBox="0 0 3 2" preserveAspectRatio="none"><path fill="#fff" d="M0 0h3v2H0z"/><ellipse cx="1.5" cy="1" rx=".6" ry=".6" fill="#BC002D"/></svg>',
    it: '<svg viewBox="0 0 3 2" preserveAspectRatio="none"><path fill="#009246" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#CE2B37" d="M2 0h1v2H2z"/></svg>',
    de: '<svg viewBox="0 0 5 3" preserveAspectRatio="none"><path fill="#000" d="M0 0h5v1H0z"/><path fill="#DD0000" d="M0 1h5v1H0z"/><path fill="#FFCE00" d="M0 2h5v1H0z"/></svg>'
  };
  var FONTS = {
    ar: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap',
    ja: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap'
  };
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  var CHEVRON = '<svg class="al-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  function find(code) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i]; return null; }
  function store(v) { try { if (v === undefined) return localStorage.getItem(STORE); localStorage.setItem(STORE, v); } catch (e) { return null; } }
  function urlLang() { var m = /[?&]lang=([a-z]{2})\b/.exec(location.search); return m && find(m[1]) ? m[1] : null; }

  var lang = urlLang() || (find(store()) ? store() : 'fr');
  if (urlLang()) store(lang);
  var dicts = { fr: {} };
  var patterns = {};
  var origText = new WeakMap();
  var origAttr = new WeakMap();
  var observer = null;

  /* ---------- styles ---------- */
  var CSS =
    'html.al-pending body{visibility:hidden}' +
    '.al-switch{position:relative;display:inline-flex;flex-shrink:0;font-family:inherit}' +
    '.al-btn{display:inline-flex;align-items:center;gap:7px;height:35px;padding:0 8px 0 9px;border-radius:12px;border:1.5px solid #C9D3E3;background:#fff;color:#56628A;cursor:pointer;font:inherit;transition:border-color .2s ease,box-shadow .2s ease}' +
    '.al-btn:hover,.al-btn[aria-expanded=true]{border-color:#13A3BF;box-shadow:0 10px 24px -16px rgba(14,27,77,.45)}' +
    '.al-btn:focus-visible,.al-opt:focus-visible{outline:2px solid #13A3BF;outline-offset:2px}' +
    '.al-flag{display:inline-block;width:28px;height:19px;border-radius:4px;overflow:hidden;box-shadow:0 0 0 1.5px #DCE3EF;flex-shrink:0;line-height:0}' +
    '.al-flag svg{width:100%;height:100%;display:block}' +
    '.al-chev{width:12px;height:12px;transition:transform .2s ease}' +
    '.al-btn[aria-expanded=true] .al-chev{transform:rotate(180deg)}' +
    '.al-menu{position:absolute;top:calc(100% + 8px);right:0;z-index:1000;min-width:200px;margin:0;padding:6px;list-style:none;background:#fff;border:1px solid #E1E8F3;border-radius:16px;box-shadow:0 24px 48px -20px rgba(14,27,77,.4)}' +
    '.al-menu[hidden]{display:none}' +
    '.al-opt{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-radius:10px;background:none;color:#0E1B4D;font:500 15px/1.2 "DM Sans",-apple-system,BlinkMacSystemFont,sans-serif;text-align:start;cursor:pointer}' +
    '.al-opt:hover{background:#F2F6FC}' +
    '.al-opt[aria-selected=true]{background:#E3F5F9;font-weight:600}' +
    '.al-menu .al-flag{width:30px;height:20px;border-radius:4px}' +
    '.al-opt .al-ok{margin-inline-start:auto;color:#0B7F99}' +
    '.al-note{margin:0 0 20px;padding:12px 16px;border-radius:12px;background:#F5F8FC;border:1px solid #E1E8F3;font-size:15px;color:#3A4775}' +
    '[dir=rtl] .al-menu{right:auto;left:0}' +
    /* Tablette : avec le sélecteur, les liens Secteurs/Approche/Valeurs (aussi en pied de page) cèdent la place. */
    '@media (max-width:1000px){header .nav-link:not(.nav-news){display:none!important}header nav a:not(.btn):not(.btn-primary):not(.news):not(.nav-news){display:none!important}}' +
    '@media (max-width:760px){.al-btn{height:28px;gap:4px;padding:0 5px 0 6px;border-radius:9px}.al-btn .al-flag{width:20px;height:13px;border-radius:3px}.al-chev{width:10px;height:10px}}' +
    /* Petits téléphones : on resserre l'en-tête pour garder logo, Actualités, contact et langue sur une ligne. */
    '@media (max-width:420px){.al-btn{height:24px;padding:0 4px;border-radius:8px}.al-chev{display:none}.al-btn .al-flag{width:17px;height:11px}' +
      'header nav{gap:8px!important}header .btn-primary,header nav .btn{padding:0 11px!important;font-size:12.5px!important;white-space:nowrap}header nav .btn{padding:9px 11px!important}' +
      'header .btn-primary svg,header .btn svg{display:none}header .nav-news,header nav .news{font-size:13px!important}' +
      'header img{height:28px!important;width:auto!important}.page>header{padding:0 12px!important}header .wrap{gap:8px!important;padding:0 12px!important}}' +
    /* Arabe : écriture de droite à gauche, police arabe, pas d'espacement de lettres (il casse la liaison des lettres). */
    'html[lang=ar] body,html[lang=ar] body *{letter-spacing:0!important;font-family:"DM Sans","Noto Sans Arabic",sans-serif!important}' +
    'html[lang=ar] h1,html[lang=ar] h2,html[lang=ar] h3,html[lang=ar] [style*=Sora]{font-family:"Sora","Noto Sans Arabic",sans-serif!important}' +
    'html[dir=rtl] [style*="text-align: left"]{text-align:right!important}' +
    'html[dir=rtl] svg:has(path[d^="M5 12h14"]){transform:scaleX(-1)}' +
    'html[dir=rtl] #seo-static ul,html[dir=rtl] #seo-static ol{padding-left:0;padding-right:20px}' +
    /* Japonais : police japonaise en repli, retours à la ligne plus souples. */
    'html[lang=ja] body,html[lang=ja] body *{font-family:"DM Sans","Noto Sans JP",sans-serif!important;line-break:strict}' +
    'html[lang=ja] h1,html[lang=ja] h2,html[lang=ja] h3,html[lang=ja] [style*=Sora]{font-family:"Sora","Noto Sans JP",sans-serif!important;letter-spacing:0!important}';

  function addStyle() {
    if (document.getElementById('al-style')) return;
    var s = document.createElement('style');
    s.id = 'al-style';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function loadFont(code) {
    if (!FONTS[code] || document.getElementById('al-font-' + code)) return;
    var l = document.createElement('link');
    l.id = 'al-font-' + code; l.rel = 'stylesheet'; l.href = FONTS[code];
    document.head.appendChild(l);
  }

  /* ---------- dictionnaires ---------- */
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function loadDict(code) {
    if (dicts[code]) return Promise.resolve(dicts[code]);
    return fetch('/assets/i18n/' + code + '.json?v=1').then(function (r) { return r.json(); }).then(function (d) {
      var plain = {}, pats = [];
      Object.keys(d).forEach(function (k) {
        if (k.indexOf('{') < 0) { plain[norm(k)] = d[k]; return; }
        var src = norm(k).replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{n\}/g, '(\\d+)').replace(/\{x\}/g, '(.+?)');
        pats.push({ re: new RegExp('^' + src + '$'), to: d[k] });
      });
      dicts[code] = plain; patterns[code] = pats;
      return plain;
    });
  }

  function dateLocal(core, code) {
    var m = /^(\d{1,2})(?:er)? (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (\d{4})$/.exec(core);
    if (!m) return null;
    try {
      return new Date(+m[3], MOIS.indexOf(m[2]), +m[1]).toLocaleDateString(code, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return null; }
  }

  function lookup(core, code) {
    var d = dicts[code];
    if (Object.prototype.hasOwnProperty.call(d, core)) return d[core];
    var pats = patterns[code] || [];
    for (var i = 0; i < pats.length; i++) {
      var m = pats[i].re.exec(core);
      if (!m) continue;
      var n = 0;
      return pats[i].to.replace(/\{[nx]\}/g, function () { n++; var v = m[n]; return lookup(v, code) || v; });
    }
    return dateLocal(core, code);
  }

  /* Traduit un texte français en gardant ses espaces et la ponctuation de bord
     (« › » des fils d'Ariane, « : » après un titre, « · » entre coordonnées). */
  function tr(text, code) {
    if (code === 'fr') return text;
    var m = /^(\s*(?:[›·]\s*)?)([\s\S]*?)(\s*(?:[:·]\s*)?)$/.exec(text);
    var core = norm(m[2]);
    if (!core) return text;
    var out = lookup(norm(text), code);
    if (out != null) return lead(text) + out + trail(text);
    out = lookup(core, code);
    if (out == null) return text;
    var pre = m[1], post = m[3];
    if (code === 'ar') pre = pre.replace('›', '‹');
    if (/:/.test(post)) post = (code === 'ja' ? '：' : ': ');
    return pre + out + post;
  }
  function lead(s) { return /^\s/.test(s) ? ' ' : ''; }
  function trail(s) { return /\s$/.test(s) ? ' ' : ''; }

  /* ---------- application au DOM ---------- */
  function skip(el) {
    /* <x-dc> : gabarit de l'accueil pas encore rendu. Il ne faut pas y toucher,
       sinon la traduction serait figée dans le gabarit ; on traduit le rendu. */
    return !el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || el.closest('.al-switch,[data-no-i18n],x-dc');
  }
  function doText(node) {
    var el = node.parentElement;
    if (skip(el) || el.tagName === 'TEXTAREA') return;
    var cur = node.data;
    var known = origText.get(node);
    var src = (known && known.out === cur) ? known.src : cur;
    if (!/[A-Za-zÀ-ÿ0-9]/.test(src)) return;
    if (el.tagName === 'OPTION' && !el.hasAttribute('value')) el.setAttribute('value', norm(src));
    var out = tr(src, lang);
    origText.set(node, { src: src, out: out });
    if (out !== cur) node.data = out;
  }
  function doAttrs(el) {
    if (skip(el)) return;
    var store = origAttr.get(el) || {};
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var cur = el.getAttribute(a);
      if (cur.indexOf('{{') >= 0) return;
      var known = store[a];
      var src = (known && known.out === cur) ? known.src : cur;
      var out = tr(src, lang);
      store[a] = { src: src, out: out };
      if (out !== cur) el.setAttribute(a, out);
    });
    origAttr.set(el, store);
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }

  function headTitle() {
    var t = document.querySelector('title');
    if (!t) return;
    if (!t.__alSrc) t.__alSrc = t.textContent;
    var out = tr(t.__alSrc, lang);
    if (document.title !== out) document.title = out;
  }

  function setMeta() {
    var L = find(lang), html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', L.rtl ? 'rtl' : 'ltr');
    var og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute('content', L.locale);
    var can = document.querySelector('link[rel=canonical]');
    if (can) {
      if (!can.__alSrc) can.__alSrc = can.getAttribute('href');
      can.setAttribute('href', can.__alSrc + (lang === 'fr' ? '' : '?lang=' + lang));
    }
    hreflang();
  }
  /* Balises hreflang : complète celles écrites dans la page si une page n'en a pas. */
  function hreflang() {
    if (document.querySelector('link[rel=alternate][hreflang]')) return;
    var can = document.querySelector('link[rel=canonical]');
    var base = can ? (can.__alSrc || can.getAttribute('href')) : SITE + location.pathname;
    LANGS.concat([{ code: 'x-default' }]).forEach(function (L) {
      var l = document.createElement('link');
      l.rel = 'alternate'; l.hreflang = L.code;
      l.href = base + (L.code === 'fr' || L.code === 'x-default' ? '' : '?lang=' + L.code);
      document.head.appendChild(l);
    });
  }

  function articleNote() {
    var prose = document.querySelector('article.prose');
    var note = document.querySelector('.al-note');
    if (!prose) return;
    if (lang === 'fr') { if (note) note.remove(); return; }
    var txt = dicts[lang]['Cet article est disponible en français uniquement.'];
    if (!txt) return;
    if (!note) { note = document.createElement('p'); note.className = 'al-note'; note.setAttribute('data-no-i18n', ''); prose.parentNode.insertBefore(note, prose); }
    note.textContent = txt;
    note.setAttribute('lang', lang);
  }

  /* ---------- sélecteur de langue ---------- */
  function buildSwitch() {
    var box = document.createElement('div');
    box.className = 'al-switch';
    var opts = LANGS.map(function (L) {
      return '<li><button type="button" class="al-opt" role="option" lang="' + L.code + '" data-lang="' + L.code + '">' +
        '<span class="al-flag">' + FLAGS[L.code] + '</span><span>' + L.name + '</span><span class="al-ok" aria-hidden="true"></span></button></li>';
    }).join('');
    box.innerHTML = '<button type="button" class="al-btn" aria-haspopup="listbox" aria-expanded="false"></button>' +
      '<ul class="al-menu" role="listbox" hidden>' + opts + '</ul>';
    return box;
  }
  /* Un seul écouteur au niveau du document : l'accueil est re-rendu par son
     propre script, les écouteurs posés sur les éléments ne sont pas fiables. */
  function menuOf(box) { return box && box.querySelector('.al-menu'); }
  function openMenu(box) {
    menuOf(box).hidden = false;
    box.querySelector('.al-btn').setAttribute('aria-expanded', 'true');
    var s = box.querySelector('.al-opt[aria-selected=true]'); if (s) s.focus();
  }
  function closeMenu(box) {
    if (!box || menuOf(box).hidden) return;
    menuOf(box).hidden = true;
    box.querySelector('.al-btn').setAttribute('aria-expanded', 'false');
  }
  function listen() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : e.target.parentElement;
      var box = document.querySelector('.al-switch');
      var opt = t && t.closest('.al-opt');
      if (opt) { closeMenu(box); choose(opt.getAttribute('data-lang')); box.querySelector('.al-btn').focus(); return; }
      if (t && t.closest('.al-btn')) { if (menuOf(box).hidden) openMenu(box); else closeMenu(box); return; }
      if (!box || !box.contains(t)) closeMenu(box);
    }, true);
    document.addEventListener('keydown', function (e) {
      var box = document.querySelector('.al-switch');
      if (!box || !box.contains(document.activeElement)) return;
      if (e.key === 'Escape') { closeMenu(box); box.querySelector('.al-btn').focus(); }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !menuOf(box).hidden) {
        e.preventDefault();
        var opts = [].slice.call(box.querySelectorAll('.al-opt'));
        var i = opts.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
        opts[(i + opts.length) % opts.length].focus();
      }
    }, true);
  }
  function refreshSwitch() {
    var box = document.querySelector('.al-switch');
    if (!box) return;
    var L = find(lang);
    var btn = box.querySelector('.al-btn');
    var label = { fr: 'Langue', en: 'Language', ar: 'اللغة', ja: '言語', it: 'Lingua', de: 'Sprache' }[lang];
    btn.innerHTML = '<span class="al-flag">' + FLAGS[lang] + '</span>' + CHEVRON;
    btn.setAttribute('aria-label', label + ' : ' + L.name);
    btn.title = label;
    [].forEach.call(box.querySelectorAll('.al-opt'), function (o) {
      var on = o.dataset.lang === lang;
      o.setAttribute('aria-selected', on ? 'true' : 'false');
      o.querySelector('.al-ok').textContent = on ? '✓' : '';
    });
  }
  function placeSwitch() {
    var nav = document.querySelector('header nav');
    if (!nav || nav.closest('x-dc')) return false;
    var box = document.querySelector('.al-switch');
    if (box && nav.contains(box) && nav.lastElementChild === box) return true;
    if (!box) box = buildSwitch();
    nav.appendChild(box);
    refreshSwitch();
    return true;
  }

  /* ---------- changement de langue ---------- */
  function apply() {
    pause();
    setMeta();
    if (document.body) walk(document.body);
    headTitle();
    articleNote();
    placeSwitch();
    resume();
  }
  function choose(code) {
    if (!find(code)) return;
    store(code);
    var q = location.search.replace(/[?&]lang=[a-z]{2}\b/, '').replace(/^&/, '?');
    if (code !== 'fr') q = (q ? q + '&' : '?') + 'lang=' + code;
    try { history.replaceState(history.state, '', location.pathname + q + location.hash); } catch (e) { /* adresse inchangée */ }
    loadFont(code);
    loadDict(code).then(function () { lang = code; apply(); }, function () { lang = 'fr'; apply(); });
  }

  /* Le contenu de l'accueil est produit et mis à jour par un script : on
     traduit aussi tout ce qui apparaît ou change après le premier passage. */
  function pause() { if (observer) { observer.takeRecords(); observer.disconnect(); } }
  function resume() {
    if (!observer) {
      observer = new MutationObserver(function (list) {
        pause();
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          if (r.type === 'characterData') doText(r.target);
          else if (r.type === 'attributes') doAttrs(r.target);
          else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
        }
        if (lang !== 'fr') headTitle();
        placeSwitch();
        resume();
      });
    }
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function boot() {
    addStyle();
    var html = document.documentElement;
    if (lang !== 'fr') { html.classList.add('al-pending'); loadFont(lang); }
    var reveal = function () { html.classList.remove('al-pending'); };
    setTimeout(reveal, 2500);
    var ready = lang === 'fr' ? Promise.resolve() : loadDict(lang).catch(function () { lang = 'fr'; });
    var go = function () { ready.then(function () { apply(); reveal(); }); };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }

  listen();
  window.__ardenI18n = { boot: boot, choose: choose, lang: function () { return lang; } };
  boot();
})();
