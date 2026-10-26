/* Graph helpers for Grove's economics compositions. Loaded after lib.js.
   Everything is drawn in data coordinates on one SVG and animated on G.tl, so every frame is seekable. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var tl = G.tl, P = G.P;
  var svg = document.getElementById('plot');

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }

  /** A pair of axes. Returns a graph object that maps data values to stage pixels. */
  function graph(o) {
    var g = {
      o: o,
      X: function (v) { return o.left + (v - (o.xmin || 0)) / (o.xmax - (o.xmin || 0)) * o.width; },
      Y: function (v) { return o.top + o.height - (v - (o.ymin || 0)) / (o.ymax - (o.ymin || 0)) * o.height; },
    };
    var ax = el('g', { stroke: P.mu, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' });
    el('path', { d: 'M' + o.left + ' ' + (o.top - 14) + ' V' + (o.top + o.height) + ' H' + (o.left + o.width + 14) }, ax);
    el('path', { d: 'M' + (o.left - 8) + ' ' + (o.top - 4) + ' L' + o.left + ' ' + (o.top - 16) + ' L' + (o.left + 8) + ' ' + (o.top - 4), 'stroke-linejoin': 'round' }, ax);
    el('path', { d: 'M' + (o.left + o.width + 4) + ' ' + (o.top + o.height - 8) + ' L' + (o.left + o.width + 16) + ' ' + (o.top + o.height) + ' L' + (o.left + o.width + 4) + ' ' + (o.top + o.height + 8), 'stroke-linejoin': 'round' }, ax);
    text(o.left + o.width + 4, o.top + o.height + 66, o.xlabel, { anchor: 'end', cls: 'axl' });
    text(o.left - 16, o.top - 30, o.ylabel, { anchor: 'start', cls: 'axl' });
    return g;
  }

  function text(x, y, s, opt) {
    opt = opt || {};
    var t = el('text', { x: x, y: y, 'text-anchor': opt.anchor || 'start', class: opt.cls || 'cl' });
    if (opt.id) t.id = opt.id;
    if (opt.fill) t.setAttribute('fill', opt.fill);
    if (opt.hidden) t.setAttribute('opacity', 0);
    t.textContent = s;
    return t;
  }

  /** Clip a segment to the plot box so shifted curves never run past the axes. */
  function clip(g, a, b) {
    var o = g.o, x0 = o.xmin || 0, y0 = o.ymin || 0, t0 = 0, t1 = 1, dx = b[0] - a[0], dy = b[1] - a[1];
    var pp = [-dx, dx, -dy, dy], qq = [a[0] - x0, o.xmax - a[0], a[1] - y0, o.ymax - a[1]];
    for (var i = 0; i < 4; i++) {
      if (pp[i] === 0) { if (qq[i] < 0) return [a, a]; continue; }
      var r = qq[i] / pp[i];
      if (pp[i] < 0) { if (r > t0) t0 = r; } else if (r < t1) t1 = r;
    }
    return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
  }

  /** A straight curve between two data points. kind: 'hi' | 'warn' | 'lo' | 'tx' */
  function line(g, id, a, b, kind, opt) {
    opt = opt || {};
    var c = clip(g, a, b); a = c[0]; b = c[1];
    var col = { hi: G.HI, warn: G.WARN, lo: G.LO, tx: P.tx, mu: P.mu }[kind || 'hi'];
    var l = el('line', { id: id, x1: g.X(a[0]), y1: g.Y(a[1]), x2: g.X(b[0]), y2: g.Y(b[1]), stroke: col, 'stroke-width': opt.w || 5, 'stroke-linecap': 'round' });
    if (opt.dash) { l.setAttribute('stroke-dasharray', opt.dash); l.setAttribute('data-dash', opt.dash); }
    if (opt.hidden) l.setAttribute('opacity', 0);
    return l;
  }

  /** A curve through data points, smoothed. Wrapped in a <g> so it can be shifted with transforms. */
  function curve(g, id, pts, kind, opt) {
    opt = opt || {};
    var col = { hi: G.HI, warn: G.WARN, lo: G.LO, tx: P.tx, mu: P.mu }[kind || 'hi'];
    var d = 'M' + g.X(pts[0][0]) + ' ' + g.Y(pts[0][1]);
    for (var i = 1; i < pts.length; i++) d += ' L' + g.X(pts[i][0]) + ' ' + g.Y(pts[i][1]);
    var grp = el('g', { id: id });
    if (opt.hidden) grp.setAttribute('opacity', 0);
    var p = el('path', { d: d, stroke: col, 'stroke-width': opt.w || 5, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, grp);
    if (opt.dash) { p.setAttribute('stroke-dasharray', opt.dash); p.setAttribute('data-dash', opt.dash); }
    return grp;
  }

  /** Draw a line or path on, from start to end, at time `at`. */
  function draw(sel, at, dur) {
    gsap.utils.toArray(sel).forEach(function (n) {
      var paths = n.tagName === 'g' ? n.querySelectorAll('path,line') : [n];
      tl.set(n, { opacity: 1 }, at);
      paths.forEach(function (p) {
        var len = p.getTotalLength ? p.getTotalLength() : 1000;
        tl.fromTo(p, { attr: { 'stroke-dasharray': len + ' ' + len, 'stroke-dashoffset': len } }, { attr: { 'stroke-dashoffset': 0 }, duration: dur || 0.9, ease: 'power2.inOut' }, at);
        tl.set(p, { attr: { 'stroke-dasharray': p.getAttribute('data-dash') || 'none' } }, at + (dur || 0.9) + 0.01);
      });
    });
  }

  /** Move a straight line to new data endpoints. */
  function moveLine(g, sel, a, b, at, dur) {
    var c = clip(g, a, b); a = c[0]; b = c[1];
    tl.to(sel, { attr: { x1: g.X(a[0]), y1: g.Y(a[1]), x2: g.X(b[0]), y2: g.Y(b[1]) }, duration: dur || 1, ease: 'power2.inOut' }, at);
  }

  /** An equilibrium dot with dashed guides to both axes. Returns ids to move later. */
  function point(g, id, x, y, kind) {
    var col = kind === 'warn' ? G.WARN : G.HI;
    el('line', { id: id + '-gx', x1: g.X(x), y1: g.Y(y), x2: g.X(x), y2: g.Y(g.o.ymin || 0), stroke: P.mu, 'stroke-width': 2, 'stroke-dasharray': '7 7', opacity: 0 });
    el('line', { id: id + '-gy', x1: g.X(x), y1: g.Y(y), x2: g.X(g.o.xmin || 0), y2: g.Y(y), stroke: P.mu, 'stroke-width': 2, 'stroke-dasharray': '7 7', opacity: 0 });
    el('circle', { id: id, cx: g.X(x), cy: g.Y(y), r: 11, fill: col, stroke: P.bg, 'stroke-width': 4, opacity: 0 });
  }
  function showPoint(id, at) {
    tl.to(['#' + id + '-gx', '#' + id + '-gy'], { opacity: 1, duration: 0.4 }, at);
    G.pop('#' + id, at);
  }
  function movePoint(g, id, x, y, at, dur) {
    dur = dur || 1;
    tl.to('#' + id, { attr: { cx: g.X(x), cy: g.Y(y) }, duration: dur, ease: 'power2.inOut' }, at);
    tl.to('#' + id + '-gx', { attr: { x1: g.X(x), y1: g.Y(y), x2: g.X(x) }, duration: dur, ease: 'power2.inOut' }, at);
    tl.to('#' + id + '-gy', { attr: { x1: g.X(x), y1: g.Y(y), y2: g.Y(y) }, duration: dur, ease: 'power2.inOut' }, at);
  }
  /** Shift a curve group by data amounts. */
  function shift(g, sel, dx, dy, at, dur) {
    var px = g.X(dx) - g.X(0), py = g.Y(dy) - g.Y(0);
    tl.to(sel, { x: px, y: py, duration: dur || 1, ease: 'power2.inOut' }, at);
  }
  function moveText(g, sel, x, y, at, dur) {
    tl.to(sel, { attr: { x: g.X(x), y: g.Y(y) }, duration: dur || 1, ease: 'power2.inOut' }, at);
  }
  function show(sel, at, to) { tl.to(sel, { opacity: to === undefined ? 1 : to, duration: 0.35 }, at); }

  window.E = { clip: clip, el: el, graph: graph, text: text, line: line, curve: curve, draw: draw, moveLine: moveLine, point: point, showPoint: showPoint, movePoint: movePoint, shift: shift, moveText: moveText, show: show };
})();
