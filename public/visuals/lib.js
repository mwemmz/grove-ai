/* Shared helpers for Grove's HyperFrames compositions. Everything is seekable (GSAP timeline). */
(function () {
  /* The app passes its current theme as ?p=<json>; without it the default Grove palette applies. */
  var P = { bg: '#0e1512', panel: '#101a15', surface: '#151f1a', raised: '#1b2b24', lo: '#2f4439', line: '#26352d', tx: '#e5ede7', mu: '#92a59a', dim: '#4b5e54', hi: '#5fc2a2', hibg: '#17382d', warn: '#e0a94a', warnbg: '#3a2f17', ink: '#08140f', dark: 1 };
  try {
    var q = new URLSearchParams(location.search).get('p');
    if (q) Object.assign(P, JSON.parse(q));
  } catch (e) { /* keep defaults */ }
  Object.keys(P).forEach(function (k) { document.documentElement.style.setProperty('--' + k, P[k]); });
  function rgba(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  var HI = P.hi, LO = P.lo, WARN = P.warn;
  var SHADOW = { hi: rgba(P.hi, P.dark ? 0.28 : 0.22), warn: rgba(P.warn, P.dark ? 0.3 : 0.24) };
  var tl = gsap.timeline({ paused: true });
  var G = { HI: HI, LO: LO, WARN: WARN, P: P, tl: tl };

  G.register = function (id) {
    window.__timelines = window.__timelines || {};
    window.__timelines[id] = tl;
  };
  /** ranges: [[start, end], ...] for captions #c1, #c2, ... */
  G.caps = function (ranges) {
    ranges.forEach(function (r, i) {
      var id = '#c' + (i + 1);
      if (i === 0 && r[0] === 0) tl.set(id, { opacity: 1, y: 0 }, 0); // the poster frame already shows step 1
      else tl.fromTo(id, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, r[0]);
      tl.to(id, { opacity: 0, duration: 0.3 }, r[1] - 0.35);
    });
  };
  G.glow = function (sel, at, dur, kind) {
    var col = kind === 'warn' ? WARN : HI;
    tl.to(sel, { borderColor: col, boxShadow: '0 0 0 6px ' + SHADOW[kind || 'hi'], duration: 0.3 }, at);
    tl.to(sel, { borderColor: LO, boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 0.3 }, at + dur);
  };
  G.wire = function (sel, at, dur) {
    /* shafts (inside a fill="none" group) only get a stroke; arrowheads get fill too */
    gsap.utils.toArray(sel).forEach(function (el) {
      var g = el.parentNode, shaft = g && g.getAttribute && g.getAttribute('fill') === 'none';
      var on = shaft ? { stroke: HI } : { stroke: HI, fill: HI };
      var off = shaft ? { stroke: LO } : { stroke: LO, fill: LO };
      tl.to(el, Object.assign({ duration: 0.25 }, on), at);
      tl.to(el, Object.assign({ duration: 0.3 }, off), at + dur);
    });
  };
  /** A chip travels through waypoints [[x,y],...], seg seconds per leg. Returns the time it fades out. */
  G.chip = function (sel, pts, at, seg, hold) {
    tl.set(sel, { x: pts[0][0], y: pts[0][1], xPercent: -50, yPercent: -50 }, at);
    tl.fromTo(sel, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.25 }, at);
    var t = at + 0.2;
    for (var i = 1; i < pts.length; i++) {
      tl.to(sel, { x: pts[i][0], y: pts[i][1], duration: seg, ease: 'power2.inOut' }, t);
      t += seg;
    }
    tl.to(sel, { opacity: 0, scale: 0.6, duration: 0.25 }, t + (hold || 0.1));
    return t;
  };
  G.txt = function (sel, text, at) { tl.set(sel, { innerText: text }, at); };
  G.pop = function (sel, at) { tl.fromTo(sel, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }, at); };
  G.fade = function (sel, at, to) { tl.to(sel, { opacity: to === undefined ? 1 : to, duration: 0.35 }, at); };
  G.end = function (t) { tl.set({}, {}, t); };
  window.G = G;
})();
