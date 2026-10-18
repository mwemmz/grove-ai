/* Shared helpers for Grove's HyperFrames compositions. Everything is seekable (GSAP timeline). */
(function () {
  var HI = '#5fc2a2', LO = '#2f4439', WARN = '#e0a94a';
  var SHADOW = { hi: 'rgba(95,194,162,.28)', warn: 'rgba(224,169,74,.30)' };
  var tl = gsap.timeline({ paused: true });
  var G = { HI: HI, LO: LO, WARN: WARN, tl: tl };

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
