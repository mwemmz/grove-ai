"""Generates Grove's economics HyperFrames compositions into public/visuals/<id>/index.html.
   Usage: python3 scripts/gen-econ-visuals.py public/visuals"""
import os, re, sys
OUT = sys.argv[1]

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1280, height=720" />
<meta name="hyperframes" data-width="1280" data-height="720" />
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@500;600;700&family=Young+Serif&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
<link rel="stylesheet" href="../base.css" />
<script src="../gsap.min.js"></script>
<style>{css}</style>
</head>
<body>
<div id="stage" data-composition-id="{id}" data-width="1280" data-height="720" data-duration="{dur}">
  <div id="cap">
{caps}
  </div>
  <svg id="plot" viewBox="0 0 1280 720"></svg>
{body}
</div>
<script src="../lib.js"></script>
<script src="../econ.js"></script>
<script>
  var tl = G.tl;
{script}
  window.__timelines = window.__timelines || {};
  window.__timelines['{id}'] = tl;
</script>
</body>
</html>
'''

def caps(lines):
    return '\n'.join(f'    <div class="step" id="c{i+1}">{i+1} · {t} <small>{s}</small></div>' for i, (t, s) in enumerate(lines))

def even(n, each):
    return '[' + ', '.join(f'[{i*each}, {(i+1)*each}]' for i in range(n)) + ']'

C = {}

# ---------------------------------------------------------------- circular flow
C['econ-circular-flow'] = dict(
  title='The circular flow of income',
  caps=[('Two sectors', 'Households own the land, labour and capital. Firms use them to produce.'),
        ('The real flow', 'Factor services go to firms. Goods and services come back to households.'),
        ('The money flow', 'Firms pay incomes. Households spend them. <em>Output = income = expenditure.</em>'),
        ('Leakages', 'Saving, taxes and imports leave the flow, so spending on local firms falls.'),
        ('Injections', 'Investment, government spending and exports come back in. Balance: <em>S + T + M = I + G + X</em>.')],
  css='''#hh { left: 90px; top: 300px; width: 270px; height: 120px; }
  #fm { left: 920px; top: 300px; width: 270px; height: 120px; }
  .sm { width: 190px; height: 76px; top: 618px; opacity: 0; padding: 8px 14px; }
  .sm h4 { margin-bottom: 4px; } .sm .val { font-size: 22px; }''',
  body='''  <div class="box" id="hh"><h4>Households</h4><div class="val">own factors</div></div>
  <div class="box" id="fm"><h4>Firms</h4><div class="val">produce</div></div>
  <div class="box sm" id="bk" style="left:330px;"><h4>Banks</h4><div class="val">S → I</div></div>
  <div class="box sm" id="gv" style="left:545px;"><h4>Government</h4><div class="val">T → G</div></div>
  <div class="box sm" id="ab" style="left:760px;"><h4>Abroad</h4><div class="val">M → X</div></div>
  <div class="lbl" id="l-goods" style="left:520px; top:132px; opacity:0;">← goods &amp; services</div>
  <div class="lbl" id="l-spend" style="left:540px; top:256px; opacity:0;">spending (C) →</div>
  <div class="lbl" id="l-fact" style="left:500px; top:440px; opacity:0;">land, labour, capital →</div>
  <div class="lbl" id="l-inc" style="left:460px; top:572px; opacity:0;">← wages, rent, interest, profit</div>
  <div class="chip" id="k1">labour</div><div class="chip" id="k2">goods</div>
  <div class="chip" id="k3">K wages</div><div class="chip" id="k4">K spending</div>
  <div class="chip warm" id="k5">S</div><div class="chip warm" id="k6">T</div><div class="chip warm" id="k7">M</div>
  <div class="chip" id="k8">I</div><div class="chip" id="k9">G</div><div class="chip" id="k10">X</div>
  <div class="tag good" id="t-eq" style="left:455px; top:342px;">output = income = expenditure</div>
  <div class="tag warm" id="t-bal" style="left:515px; top:342px;">S + T + M = I + G + X</div>''',
  script='''  G.caps(%s);
  var s = document.getElementById('plot');
  var wires = E.el('g', { fill: 'none' }, s);
  function arc(d, id) { E.el('path', { d: d, id: id, stroke: G.LO, 'stroke-width': 5, 'stroke-linecap': 'round' }, wires); }
  arc('M 1010 300 C 1000 127, 280 127, 270 300', 'w-goods');
  arc('M 310 300 C 320 227, 960 227, 970 300', 'w-spend');
  arc('M 310 420 C 320 513, 960 513, 970 420', 'w-fact');
  arc('M 1010 420 C 1000 620, 280 620, 270 420', 'w-inc');

  /* 1 */
  G.glow('#hh', 0.3, 2.4); G.glow('#fm', 0.8, 2.0);
  /* 2 real flow */
  G.fade('#l-fact', 3.2); G.fade('#l-goods', 4.4);
  G.wire('#w-fact', 3.2, 1.8); G.chip('#k1', [[310, 420], [640, 490], [970, 420]], 3.3, 0.6);
  G.wire('#w-goods', 4.5, 1.8); G.chip('#k2', [[1010, 300], [640, 170], [270, 300]], 4.6, 0.6);
  /* 3 money flow */
  G.fade('#l-inc', 6.2); G.fade('#l-spend', 7.2);
  G.wire('#w-inc', 6.2, 1.8); G.chip('#k3', [[1010, 420], [640, 570], [270, 420]], 6.3, 0.6);
  G.wire('#w-spend', 7.3, 1.8); G.chip('#k4', [[310, 300], [640, 245], [970, 300]], 7.4, 0.6);
  G.pop('#t-eq', 8.0); G.fade('#t-eq', 8.9, 0);
  /* 4 leakages */
  G.fade('#bk', 9.1); G.fade('#gv', 9.1); G.fade('#ab', 9.1);
  G.chip('#k5', [[225, 420], [425, 655]], 9.4, 0.7, 0.3);
  G.chip('#k6', [[225, 420], [640, 655]], 9.8, 0.8, 0.3);
  G.chip('#k7', [[225, 420], [855, 655]], 10.2, 0.9, 0.3);
  G.glow('#bk', 10.0, 1.4, 'warn'); G.glow('#gv', 10.4, 1.4, 'warn'); G.glow('#ab', 10.8, 1.4, 'warn');
  /* 5 injections */
  G.chip('#k8', [[425, 620], [1055, 420]], 12.3, 0.9, 0.2);
  G.chip('#k9', [[640, 620], [1055, 420]], 12.7, 0.8, 0.2);
  G.chip('#k10', [[855, 620], [1055, 420]], 13.1, 0.7, 0.2);
  G.glow('#fm', 12.6, 1.8);
  G.pop('#t-bal', 14.0);
  G.end(15);''', R=even(5, 3))

# ---------------------------------------------------------------- keynesian cross
C['econ-keynesian-cross'] = dict(
  title='The Keynesian cross and the multiplier',
  caps=[('The 45° line', 'Every point on it is where planned spending equals income: <em>AE = Y</em>.'),
        ('Planned spending', 'C = 250 + 0.75(Y − 200), I = 80, G = 150, so <em>AE = 330 + 0.75Y</em>.'),
        ('Equilibrium', 'Output settles where AE meets the 45° line: Y = 330 ÷ 0.25 = <em>1,320</em>.'),
        ('Government spends 50 more', 'G rises from 150 to 200, so the AE line shifts up by 50.'),
        ('The multiplier', 'Income rises by <em>200</em>, not 50: ΔY = ΔG × 1 ÷ (1 − 0.75) = 50 × 4.')],
  css='',
  body='''  <div class="panel">
    <div class="box" id="b1" style="opacity:0;"><h4>Planned spending</h4><div class="eq" id="e1">AE = 330 + 0.75Y</div><div class="sub">slope = MPC = 0.75</div></div>
    <div class="box" id="b2" style="opacity:0;"><h4>Equilibrium income</h4><div class="eq" id="e2">Y = 330 ÷ (1 − 0.75) = <b>1,320</b></div></div>
    <div class="box" id="b3" style="opacity:0;"><h4>Multiplier</h4><div class="eq">1 ÷ (1 − MPC) = <b>4</b></div><div class="sub" id="rounds">50 + 37.5 + 28.1 + 21.1 + … = 200</div></div>
  </div>''',
  script='''  G.caps(%s);
  var g = E.graph({ left: 170, top: 180, width: 440, height: 440, xmax: 2000, ymax: 2000, xlabel: 'Income, Y', ylabel: 'Planned spending, AE' });
  E.line(g, 'l45', [0, 0], [2000, 2000], 'mu', { w: 4, hidden: true });
  E.text(g.X(2000) + 14, g.Y(2000) + 4, '45°', { cls: 'cl', hidden: true, id: 't45' });
  E.line(g, 'ae1', [0, 330], [2000, 1830], 'hi', { hidden: true });
  E.text(g.X(2000) + 14, g.Y(1830) + 26, 'AE₁', { id: 'tae1', hidden: true, fill: G.HI });
  E.line(g, 'ae2', [0, 330], [2000, 1830], 'warn', { hidden: true });
  E.text(g.X(2000) + 14, g.Y(1880) - 2, 'AE₂', { id: 'tae2', hidden: true, fill: G.WARN });
  E.point(g, 'p', 1320, 1320);
  E.text(g.X(1320) - 8, g.Y(0) + 30, '1,320', { anchor: 'end', cls: 'tick', id: 'x1', hidden: true });
  E.text(g.X(1520) + 8, g.Y(0) + 30, '1,520', { anchor: 'start', cls: 'tick', id: 'x2', hidden: true });
  E.text(g.X(30), g.Y(330), '330', { cls: 'tick', id: 'y330', hidden: true });

  /* 1 */ E.draw('#l45', 0.4, 1.2); E.show('#t45', 1.4);
  /* 2 */ E.draw('#ae1', 3.8, 1.2); E.show('#tae1', 4.8); E.show('#b1', 4.2); E.show('#y330', 4.4);
  /* 3 */ E.showPoint('p', 7.4); E.show('#x1', 7.6); E.show('#b2', 7.8);
  /* 4 */ E.show('#ae2', 10.8); E.moveLine(g, '#ae2', [0, 380], [2000, 1880], 11.0, 1.2); E.show('#tae2', 12.0);
          tl.to('#t45', { attr: { y: g.Y(2000) - 18 }, duration: 0.4 }, 11.0); tl.to('#ae1', { attr: { stroke: G.LO }, duration: 0.4 }, 11.4);
          G.txt('#e1', 'AE = 380 + 0.75Y', 11.5);
  /* 5 */ E.movePoint(g, 'p', 1520, 1520, 14.4, 1.4); E.show('#x2', 15.2); E.show('#b3', 14.6);
          G.txt('#e2', 'ΔY = 50 × 4 = 200  →  1,520', 15.0);
  G.end(18.5);''', R='[[0, 3.5], [3.5, 7], [7, 10.5], [10.5, 14], [14, 18.5]]')

# ---------------------------------------------------------------- AD/AS three ranges
C['econ-ad-as'] = dict(
  title='Aggregate demand and the three ranges of supply',
  caps=[('Why AD slopes down', 'A lower price level raises real wealth, cuts interest rates and makes exports cheaper.'),
        ('Three ranges of AS', 'Flat with spare capacity (Keynesian), rising (intermediate), vertical at full employment (classical).'),
        ('AD rises, Keynesian range', 'Idle resources are put to work: <em>output rises, prices stay put</em>.'),
        ('AD rises, intermediate range', 'Bottlenecks appear: <em>output and prices both rise</em>.'),
        ('AD rises, classical range', 'The economy is at full employment: <em>only prices rise</em>. That is inflation.')],
  css='',
  body='''  <div class="panel">
    <div class="box" id="b1" style="opacity:0;"><h4>AD slopes down because</h4><div class="sub" style="font-size:20px;color:var(--tx);">① real balance (wealth) effect<br/>② interest rate effect<br/>③ foreign trade effect</div></div>
    <div class="box" id="b2" style="opacity:0;"><h4>What changed</h4><div class="eq" id="e2">–</div></div>
  </div>''',
  script='''  G.caps(%s);
  var g = E.graph({ left: 150, top: 180, width: 560, height: 430, xmax: 1000, ymax: 120, xlabel: 'Real output, Y', ylabel: 'Price level, P' });
  var AS = [];
  for (var y = 40; y <= 420; y += 20) AS.push([y, 30]);
  for (var y2 = 440; y2 <= 760; y2 += 20) AS.push([y2, 30 + 52 * Math.pow((y2 - 420) / 340, 2.4)]);
  AS.push([780, 95]); AS.push([785, 116]);
  E.curve(g, 'as', AS, 'tx', { hidden: true, w: 5 });
  E.text(g.X(20), g.Y(30) - 16, 'Keynesian', { cls: 'tick', id: 'r1', hidden: true });
  E.text(g.X(560), g.Y(48) - 4, 'intermediate', { cls: 'tick', id: 'r2', hidden: true, anchor: 'end' });
  E.text(g.X(800), g.Y(110), 'classical', { cls: 'tick', id: 'r3', hidden: true });
  E.text(g.X(785), g.Y(0) + 30, 'Yf', { anchor: 'middle', cls: 'cl', id: 'yf', hidden: true });
  E.text(g.X(940), g.Y(118), 'AS', { cls: 'cl', id: 'tas', hidden: true });
  function asP(y) { for (var i = 1; i < AS.length; i++) if (AS[i][0] >= y) { var a = AS[i - 1], b = AS[i]; return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]); } return 200; }
  function cross(c) { var lo = 0, hi = 784; for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2; if (c - 0.12 * m > asP(m)) lo = m; else hi = m; } return [lo, c - 0.12 * lo]; }
  function adEnds(c) { return [[Math.max(0, (c - 115) / 0.12), Math.min(115, c)], [(c - 4) / 0.12 > 1000 ? 1000 : (c - 4) / 0.12, c - 0.12 * Math.min(1000, (c - 4) / 0.12)]]; }
  var cs = [62, 78, 108, 148];
  var e0 = adEnds(cs[0]);
  E.line(g, 'ad', e0[0], e0[1], 'hi', { hidden: true });
  E.text(g.X(e0[1][0]) - 46, g.Y(e0[1][1]) - 12, 'AD', { id: 'tad', hidden: true, fill: G.HI });
  var p0 = cross(cs[0]);
  E.point(g, 'p', p0[0], p0[1]);

  /* 1 */ E.draw('#ad', 0.4, 1.1); E.show('#tad', 1.3); E.show('#b1', 0.8);
  /* 2 */ E.draw('#as', 3.6, 1.6); E.show('#r1', 4.3); E.show('#r2', 4.9); E.show('#r3', 5.4); E.show('#tas', 5.2); E.show('#yf', 5.6);
          E.showPoint('p', 6.0); tl.to('#b1', { opacity: 0, duration: 0.3 }, 6.6); E.show('#b2', 6.8);
  [1, 2, 3].forEach(function (k) {
    var at = 3.5 * (k + 1) + 0.4, e = adEnds(cs[k]), p = cross(cs[k]);
    E.moveLine(g, '#ad', e[0], e[1], at, 1.2);
    E.moveText(g, '#tad', 0, 0, at, 0.01);
    tl.to('#tad', { attr: { x: g.X(e[1][0]) - 46, y: g.Y(e[1][1]) - 12 }, duration: 1.2 }, at);
    E.movePoint(g, 'p', p[0], p[1], at, 1.2);
    G.txt('#e2', ['', 'Y ↑   P same', 'Y ↑   P ↑', 'Y same   P ↑'][k], at + 0.8);
  });
  G.end(18);''', R='[[0, 3.5], [3.5, 7.4], [7.4, 10.9], [10.9, 14.4], [14.4, 18]]')

# ---------------------------------------------------------------- inflation
C['econ-inflation'] = dict(
  title='Demand-pull and cost-push inflation',
  caps=[('Starting point', 'AD meets short-run AS at price level <em>P₁</em> and output <em>Y₁</em>.'),
        ('Demand-pull', 'Too much spending chasing too few goods: AD shifts right, <em>prices and output rise</em>.'),
        ('Cost-push', 'Back to the start. Costs rise instead (wages, fuel, imported inputs): AS shifts left.'),
        ('Stagflation', 'Prices rise <em>and</em> output falls at the same time.'),
        ('The policy dilemma', 'Boosting AD restores output, but pushes prices higher still.')],
  css='',
  body='''  <div class="panel">
    <div class="box" id="b1" style="opacity:0;"><h4>Result</h4><div class="eq" id="e1">P = 50, Y = 50</div></div>
    <div class="tag warm" id="causes" style="position:relative;opacity:0;white-space:normal;line-height:1.35;">higher wages · dearer fuel · weaker kwacha raises import costs</div>
  </div>''',
  script='''  G.caps(%s);
  var g = E.graph({ left: 150, top: 180, width: 560, height: 430, xmax: 100, ymax: 100, xlabel: 'Real output, Y', ylabel: 'Price level, P' });
  function ad(c) { return [[(c - 95) / 0.8, 95], [(c - 8) / 0.8, 8]]; }
  function as(c) { return [[Math.max(4, (8 - c) / 0.8), Math.max(8, c + 3.2)], [(95 - c) / 0.8, 95]]; }
  var a1 = ad(90), s1 = as(10);
  E.line(g, 'ad', a1[0], a1[1], 'hi', { hidden: true });
  E.line(g, 'as', s1[0], s1[1], 'tx', { hidden: true });
  function lab(ends) { return E.clip(g, ends[0], ends[1]); }
  E.text(g.X(lab(a1)[1][0]) - 6, g.Y(lab(a1)[1][1]) - 16, 'AD', { id: 'tad', hidden: true, fill: G.HI, anchor: 'end' });
  E.text(g.X(lab(s1)[1][0]) - 6, g.Y(lab(s1)[1][1]) - 4, 'SRAS', { id: 'tas', hidden: true, anchor: 'end' });
  E.point(g, 'p', 50, 50);
  /* 1 */ E.draw('#ad', 0.3, 1); E.draw('#as', 0.6, 1); E.show('#tad', 1.2); E.show('#tas', 1.4); E.showPoint('p', 1.8); E.show('#b1', 2.0);
  /* 2 demand-pull: AD to 110 */
  var a2 = ad(110); E.moveLine(g, '#ad', a2[0], a2[1], 3.3, 1.2); tl.to('#tad', { attr: { x: g.X(lab(a2)[1][0]) - 6, y: g.Y(lab(a2)[1][1]) - 16 }, duration: 1.2 }, 3.3);
  E.movePoint(g, 'p', 62.5, 60, 3.3, 1.2); G.txt('#e1', 'P 50 → 60   Y 50 → 62.5', 4.0);
  /* 3 cost-push: reset AD, AS left */
  E.moveLine(g, '#ad', a1[0], a1[1], 6.2, 0.6); tl.to('#tad', { attr: { x: g.X(lab(a1)[1][0]) - 6, y: g.Y(lab(a1)[1][1]) - 16 }, duration: 0.6 }, 6.2);
  E.movePoint(g, 'p', 50, 50, 6.2, 0.6); G.txt('#e1', 'P = 50, Y = 50', 6.3);
  var s2 = as(30); E.moveLine(g, '#as', s2[0], s2[1], 7.0, 1.2); tl.to('#tas', { attr: { x: g.X(lab(s2)[1][0]) - 6, y: g.Y(lab(s2)[1][1]) - 4 }, duration: 1.2 }, 7.0);
  E.movePoint(g, 'p', 37.5, 60, 7.0, 1.2); E.show('#causes', 6.6);
  G.txt('#e1', 'P 50 → 60   Y 50 → 37.5', 7.8);
  /* 4 */ G.glow('#b1', 9.3, 2.0, 'warn');
  /* 5 dilemma */ E.moveLine(g, '#ad', a2[0], a2[1], 12.3, 1.2); tl.to('#tad', { attr: { x: g.X(lab(a2)[1][0]) - 6, y: g.Y(lab(a2)[1][1]) - 16 }, duration: 1.2 }, 12.3);
  E.movePoint(g, 'p', 50, 70, 12.3, 1.2); G.txt('#e1', 'Y back to 50, P now 70', 13.0);
  G.end(15);''', R=even(5, 3))

# ---------------------------------------------------------------- money market
C['econ-money-market'] = dict(
  title='The money market and liquidity preference',
  caps=[('Money demand', 'People hold less money when interest rates are high: <em>(M/P)ᵈ = 1,000 − 100r</em>.'),
        ('Money supply', 'The Bank of Zambia fixes M = 1,000. With P = 2, real balances M/P = <em>500</em>.'),
        ('Equilibrium', '500 = 1,000 − 100r, so the interest rate settles at <em>r = 5%%</em>.'),
        ('BoZ raises M to 1,200', 'M/P rises to 600: 600 = 1,000 − 100r, so <em>r falls to 4%%</em>. Borrowing gets cheaper.'),
        ('Income rises', 'More transactions raise money demand. The curve shifts right and <em>r rises again</em>.')],
  css='',
  body='''  <div class="panel">
    <div class="box" id="b1" style="opacity:0;"><h4>Money demand</h4><div class="eq">(M/P)ᵈ = L(<i>−r</i>, <b>+Y</b>)</div><div class="sub">r ↑ → hold less money · Y ↑ → hold more</div></div>
    <div class="box" id="b2" style="opacity:0;"><h4>Interest rate</h4><div class="eq" id="e2">r = <b>5%%</b></div></div>
    <div class="tag good" id="chain" style="position:relative;opacity:0;white-space:normal;line-height:1.35;">lower r → more investment → AD rises</div>
  </div>''',
  script='''  G.caps(%s);
  var g = E.graph({ left: 150, top: 180, width: 560, height: 430, xmax: 1100, ymax: 10, xlabel: 'Real money balances, M/P', ylabel: 'Interest rate, r (%%)' });
  E.line(g, 'md', [100, 9], [950, 0.5], 'hi', { hidden: true });
  E.text(g.X(100) + 22, g.Y(9) - 4, 'L(r, Y₁)', { id: 'tmd', hidden: true, fill: G.HI });
  E.line(g, 'ms', [500, 0], [500, 9.6], 'tx', { hidden: true });
  E.text(g.X(500) + 10, g.Y(9.6), 'M/P', { id: 'tms', hidden: true });
  E.point(g, 'p', 500, 5);
  E.text(g.X(500), g.Y(0) + 30, '500', { anchor: 'middle', cls: 'tick', id: 'x500', hidden: true });
  E.text(g.X(600), g.Y(0) + 56, '600', { anchor: 'middle', cls: 'tick', id: 'x600', hidden: true });
  E.text(g.X(0) - 12, g.Y(5) + 7, '5', { anchor: 'end', cls: 'tick', id: 'y5', hidden: true });
  E.text(g.X(0) - 12, g.Y(4) + 7, '4', { anchor: 'end', cls: 'tick', id: 'y4', hidden: true });
  /* 1 */ E.draw('#md', 0.4, 1.1); E.show('#tmd', 1.3); E.show('#b1', 0.8);
  /* 2 */ E.draw('#ms', 3.8, 1.0); E.show('#tms', 4.6); E.show('#x500', 4.6);
  /* 3 */ E.showPoint('p', 7.3); E.show('#y5', 7.5); E.show('#b2', 7.6);
  /* 4 */ E.moveLine(g, '#ms', [600, 0], [600, 9.6], 10.8, 1.2); tl.to('#tms', { attr: { x: g.X(600) + 10 }, duration: 1.2 }, 10.8);
          E.movePoint(g, 'p', 600, 4, 10.8, 1.2); E.show('#x600', 11.4); E.show('#y4', 11.6); G.txt('#e2', 'r = 5% → 4%', 11.6); E.show('#chain', 12.2);
  /* 5 */ E.moveLine(g, '#md', [200, 9], [1050, 0.5], 14.4, 1.2); tl.to('#tmd', { attr: { x: g.X(200) + 22 }, duration: 1.2 }, 14.4);
          G.txt('#tmd', 'L(r, Y₂)', 14.4); E.movePoint(g, 'p', 600, 5, 14.4, 1.2); G.txt('#e2', 'r = 4% → 5%', 15.2);
  G.end(18);''', R='[[0, 3.5], [3.5, 7], [7, 10.5], [10.5, 14], [14, 18]]')

# ---------------------------------------------------------------- credit creation
C['econ-credit-creation'] = dict(
  title='How banks create money',
  caps=[('A deposit', 'A farmer deposits <em>K100,000</em> at ZANACO. With a 10%% reserve ratio, it keeps K10,000.'),
        ('A loan becomes a deposit', 'ZANACO lends <em>K90,000</em>. The borrower pays someone who banks at Stanbic.'),
        ('Round after round', 'Stanbic keeps K9,000 and lends K81,000. Each round is 90%% of the last.'),
        ('The total', 'Deposits add up to K100,000 × 1 ÷ 0.10 = <em>K1,000,000</em>. Money multiplier = 10.'),
        ('The limits', 'Cash held outside banks, extra reserves and few good borrowers make the real multiplier <em>smaller</em>.')],
  css='''.bk { position:absolute; font: 600 15px/1.1 "JetBrains Mono", monospace; color: var(--mu); text-align:center; width: 74px; opacity: 0; }''',
  body='''  <div class="panel" style="left:880px; width:360px;">
    <div class="box"><h4>Total deposits</h4><div class="val" id="tot">K0</div></div>
    <div class="box"><h4>Money multiplier</h4><div class="eq">1 ÷ reserve ratio = 1 ÷ 0.10 = <b>10</b></div></div>
    <div class="tag warm" id="lim" style="position:relative;opacity:0;white-space:normal;line-height:1.35;">cash leakages · excess reserves · weak loan demand</div>
  </div>
  <div class="chip" id="loan">K90,000 loan</div>''',
  script='''  G.caps(%s);
  var s = document.getElementById('plot');
  var vals = [100000, 90000, 81000, 72900, 65610, 59049, 53144, 47830, 43047];
  var names = ['ZANACO', 'Stanbic', 'FNB', 'Atlas Mara', 'Indo Zambia', '…', '…', '…', '…'];
  var base = 610, maxH = 400, x0 = 110, step = 82, w = 60;
  E.el('line', { x1: 90, y1: base, x2: 860, y2: base, stroke: G.P.mu, 'stroke-width': 3 }, s);
  vals.forEach(function (v, i) {
    var h = v / 100000 * maxH, r = h * 0.1, x = x0 + i * step;
    E.el('rect', { id: 'loan' + i, x: x, y: base - h, width: w, height: h - r, rx: 6, fill: G.HI, opacity: 0 }, s);
    E.el('rect', { id: 'res' + i, x: x, y: base - h, width: w, height: r, rx: 4, fill: G.WARN, opacity: 0 }, s);
    var t = E.text(x + w / 2, base - h - 14, 'K' + Math.round(v / 1000) + 'k', { anchor: 'middle', cls: 'tick', id: 'v' + i, hidden: true });
    var lab = document.createElement('div'); lab.className = 'bk'; lab.id = 'n' + i; lab.textContent = names[i];
    lab.style.left = (x - 7) + 'px'; lab.style.top = (base + 12) + 'px'; document.getElementById('stage').appendChild(lab);
  });
  function bar(i, at) {
    tl.fromTo(['#loan' + i, '#res' + i], { opacity: 0, scaleY: 0, transformOrigin: '50%% 100%%' }, { opacity: 1, scaleY: 1, duration: 0.5, ease: 'power2.out' }, at);
    E.show('#v' + i, at + 0.3); E.show('#n' + i, at);
  }
  var running = 0;
  function total(i, at) { running += vals[i]; G.txt('#tot', 'K' + running.toLocaleString('en-US'), at); }
  /* 1 */ bar(0, 0.5); total(0, 0.8);
  tl.fromTo('#res0', { attr: { 'stroke-width': 0 } }, { attr: { stroke: G.WARN, 'stroke-width': 6 }, duration: 0.3 }, 1.6);
  /* 2 */ G.chip('#loan', [[140, 300], [420, 160], [222, 330]], 3.3, 0.7, 0.2); bar(1, 4.8); total(1, 5.0);
  /* 3 */ [2, 3, 4, 5, 6, 7, 8].forEach(function (i, k) { bar(i, 6.3 + k * 0.38); total(i, 6.5 + k * 0.38); });
  /* 4 */ G.txt('#tot', 'K1,000,000', 9.4); tl.fromTo('#tot', { scale: 1 }, { scale: 1.12, duration: 0.3, yoyo: true, repeat: 1 }, 9.4);
  /* 5 */ E.show('#lim', 12.3);
  G.end(15);''', R=even(5, 3))

# ---------------------------------------------------------------- Phillips curve
C['econ-phillips'] = dict(
  title='The Phillips curve and stagflation',
  caps=[('The trade-off', 'Phillips (1958): when unemployment is low, wage inflation is high, and the reverse.'),
        ('Moving along the curve', 'Government boosts demand: unemployment falls from 6%% to 4%%, inflation rises from 2%% to 5%%.'),
        ('Expectations catch up', 'Workers expect 5%% inflation and ask for higher wages. The curve <em>shifts up</em>.'),
        ('Back to the natural rate', 'Unemployment returns to 6%% but inflation stays at 5%%. In the long run the curve is <em>vertical</em>.'),
        ('Stagflation', 'A supply shock shifts the curve up again: <em>high inflation and high unemployment together</em>.')],
  css='',
  body='''  <div class="panel">
    <div class="box"><h4>Unemployment</h4><div class="val" id="u">6%%</div></div>
    <div class="box"><h4>Inflation</h4><div class="val" id="pi">2%%</div></div>
  </div>''',
  script='''  G.caps(%s);
  var g = E.graph({ left: 150, top: 180, width: 560, height: 430, xmax: 10, ymax: 10, xlabel: 'Unemployment, %%', ylabel: 'Inflation, %%' });
  function pc(shift) { var pts = []; for (var u = 3.2; u <= 9.6; u += 0.2) { var v = 36 / u - 4 + shift; if (v <= 9.8) pts.push([u, v]); } return pts; }
  E.curve(g, 'pc1', pc(0), 'hi', { hidden: true });
  E.curve(g, 'pc2', pc(3), 'warn', { hidden: true });
  E.curve(g, 'pc3', pc(6), 'warn', { hidden: true, dash: '12 10' });
  E.text(g.X(9.6) - 4, g.Y(36 / 9.6 - 4) - 14, 'SRPC₁', { id: 't1', hidden: true, fill: G.HI, anchor: 'end' });
  E.text(g.X(9.6) - 4, g.Y(36 / 9.6 - 1) - 14, 'SRPC₂', { id: 't2', hidden: true, fill: G.WARN, anchor: 'end' });
  E.text(g.X(9.6) - 4, g.Y(36 / 9.6 + 2) - 14, 'SRPC₃', { id: 't3', hidden: true, fill: G.WARN, anchor: 'end' });
  E.line(g, 'lr', [6, 0], [6, 9.8], 'tx', { hidden: true, w: 4, dash: '4 10' });
  E.text(g.X(6) + 10, g.Y(9.7), 'LRPC', { id: 'tlr', hidden: true });
  E.text(g.X(6), g.Y(0) + 30, '6', { anchor: 'middle', cls: 'tick', id: 'x6', hidden: true });
  E.point(g, 'p', 6, 2);
  /* 1 */ E.draw('#pc1', 0.4, 1.4); E.show('#t1', 1.6); E.showPoint('p', 2.0); E.show('#x6', 2.0);
  /* 2 */ var path = [[5.5, 36 / 5.5 - 4], [5, 36 / 5 - 4], [4.5, 36 / 4.5 - 4], [4, 5]];
          path.forEach(function (q, k) { E.movePoint(g, 'p', q[0], q[1], 3.3 + k * 0.35, 0.35); });
          G.txt('#u', '4%', 4.4); G.txt('#pi', '5%', 4.4);
  /* 3 */ E.draw('#pc2', 6.3, 1.4); E.show('#t2', 7.6); tl.to('#pc1 path', { attr: { stroke: G.LO }, duration: 0.4 }, 7.2);
  /* 4 */ E.movePoint(g, 'p', 6, 5, 9.3, 1.2); G.txt('#u', '6%', 10.0); E.draw('#lr', 10.2, 0.8); E.show('#tlr', 10.8);
  /* 5 */ E.draw('#pc3', 12.3, 1.2); E.show('#t3', 13.2); E.movePoint(g, 'p', 8, 36 / 8 + 2, 13.0, 1.0); G.txt('#u', '8%', 13.6); G.txt('#pi', '6.5%', 13.6);
          G.glow('.panel .box', 13.6, 1.2, 'warn');
  G.end(15);''', R=even(5, 3))

# ---------------------------------------------------------------- exchange rate
C['econ-exchange-rate'] = dict(
  title='How the kwacha exchange rate is set',
  caps=[('Demand for kwacha', 'Foreigners need kwacha to pay for Zambian exports like copper, and to invest in Zambia.'),
        ('Supply of kwacha', 'Zambians sell kwacha to buy foreign currency for imports and to invest abroad.'),
        ('The exchange rate', 'The value of the kwacha settles where demand meets supply.'),
        ('Copper prices rise', 'More export earnings raise demand for kwacha: the curve shifts right and the <em>kwacha appreciates</em>.'),
        ('Fuel imports rise', 'Back to the start. More kwacha is sold to buy dollars: supply shifts right and the <em>kwacha depreciates</em>.')],
  css='',
  body='''  <div class="panel">
    <div class="box"><h4>Value of K1</h4><div class="val" id="rate">5.0 US cents</div><div class="sub" id="dir">&nbsp;</div></div>
    <div class="tag good" id="ex" style="position:relative;opacity:0;white-space:normal;line-height:1.35;">stronger kwacha: imports cheaper, exports dearer abroad</div>
    <div class="tag warm" id="im" style="position:relative;opacity:0;white-space:normal;line-height:1.35;">weaker kwacha: imports dearer (cost-push), exports cheaper abroad</div>
  </div>''',
  script='''  G.caps(%s);
  var g = E.graph({ left: 150, top: 180, width: 560, height: 430, xmax: 100, ymax: 8, xlabel: 'Quantity of kwacha', ylabel: 'US cents per kwacha' });
  function D(c) { return [[(c - 7.6) / 0.06, 7.6], [(c - 0.6) / 0.06, 0.6]]; }
  function S(c) { return [[(0.6 - c) / 0.06 < 4 ? 4 : (0.6 - c) / 0.06, Math.max(0.6, c + 0.24)], [(7.6 - c) / 0.06, 7.6]]; }
  var d1 = D(8), s1 = S(2);
  E.line(g, 'd', d1[0], d1[1], 'hi', { hidden: true });
  E.line(g, 's', s1[0], s1[1], 'warn', { hidden: true });
  function lab(e) { return E.clip(g, e[0], e[1])[1]; }
  E.text(g.X(lab(d1)[0]) - 8, g.Y(lab(d1)[1]) - 14, 'D', { id: 'td', hidden: true, fill: G.HI, anchor: 'end' });
  E.text(g.X(lab(s1)[0]) - 8, g.Y(lab(s1)[1]) + 6, 'S', { id: 'ts', hidden: true, fill: G.WARN, anchor: 'end' });
  E.point(g, 'p', 50, 5);
  /* 1 */ E.draw('#d', 0.4, 1.1); E.show('#td', 1.3);
  /* 2 */ E.draw('#s', 3.4, 1.1); E.show('#ts', 4.3);
  /* 3 */ E.showPoint('p', 6.4);
  /* 4 */ var d2 = D(9.2); E.moveLine(g, '#d', d2[0], d2[1], 9.3, 1.2); tl.to('#td', { attr: { x: g.X(lab(d2)[0]) - 8, y: g.Y(lab(d2)[1]) - 14 }, duration: 1.2 }, 9.3);
          E.movePoint(g, 'p', 60, 5.6, 9.3, 1.2); G.txt('#rate', '5.6 US cents', 10.0); G.txt('#dir', 'kwacha appreciates', 10.0); E.show('#ex', 10.2);
  /* 5 */ E.moveLine(g, '#d', d1[0], d1[1], 12.2, 0.6); tl.to('#td', { attr: { x: g.X(lab(d1)[0]) - 8, y: g.Y(lab(d1)[1]) - 14 }, duration: 0.6 }, 12.2); E.movePoint(g, 'p', 50, 5, 12.2, 0.6);
          var s2 = S(0.8); E.moveLine(g, '#s', s2[0], s2[1], 12.9, 1.1); tl.to('#ts', { attr: { x: g.X(lab(s2)[0]) - 8, y: g.Y(lab(s2)[1]) + 6 }, duration: 1.1 }, 12.9);
          E.movePoint(g, 'p', 60, 4.4, 12.9, 1.1); G.txt('#rate', '4.4 US cents', 13.6); G.txt('#dir', 'kwacha depreciates', 13.6);
          tl.to('#ex', { opacity: 0, duration: 0.3 }, 12.4); E.show('#im', 13.8);
  G.end(15.5);''', R='[[0, 3], [3, 6], [6, 9], [9, 12], [12, 15.5]]')

# ---------------------------------------------------------------- Laffer
C['econ-laffer'] = dict(
  title='The Laffer curve',
  caps=[('A 0%% tax rate', 'Nothing is taxed, so government revenue is <em>zero</em>.'),
        ('A 100%% tax rate', 'Nobody would work for nothing, so revenue is <em>zero</em> again.'),
        ('Revenue peaks in between', 'Somewhere between them is the rate <em>Tx</em> that raises the most revenue.'),
        ('Two rates, same revenue', 'A low rate (25%%) and a high rate (75%%) can raise the same revenue.'),
        ('Cutting rates', 'Above Tx, a cut can <em>raise</em> revenue. Below Tx, a cut <em>lowers</em> it.')],
  css='',
  body='''  <div class="panel">
    <div class="box"><h4>Tax rate</h4><div class="val" id="tr">0%%</div></div>
    <div class="box"><h4>Revenue</h4><div class="val" id="rv">0</div></div>
  </div>''',
  script='''  G.caps(%s);
  var g = E.graph({ left: 150, top: 180, width: 560, height: 430, xmax: 100, ymax: 110, xlabel: 'Tax rate, %%', ylabel: 'Tax revenue' });
  function R(t) { return t * (100 - t) / 25; }
  var pts = []; for (var t = 0; t <= 100; t += 2) pts.push([t, R(t)]);
  E.curve(g, 'lc', pts, 'hi', { hidden: true });
  E.text(g.X(50), g.Y(0) + 30, 'Tx', { anchor: 'middle', cls: 'cl', id: 'tx', hidden: true });
  E.text(g.X(25), g.Y(0) + 30, '25', { anchor: 'middle', cls: 'tick', id: 't25', hidden: true });
  E.text(g.X(75), g.Y(0) + 30, '75', { anchor: 'middle', cls: 'tick', id: 't75', hidden: true });
  E.text(g.X(100), g.Y(0) + 30, '100', { anchor: 'middle', cls: 'tick', id: 't100', hidden: true });
  E.line(g, 'same', [25, 75], [75, 75], 'warn', { hidden: true, w: 3, dash: '8 8' });
  E.point(g, 'p', 0, 0);
  E.el('circle', { id: 'q', cx: g.X(25), cy: g.Y(75), r: 11, fill: G.WARN, stroke: G.P.bg, 'stroke-width': 4, opacity: 0 });
  /* 1 */ E.showPoint('p', 0.5);
  /* 2 */ E.movePoint(g, 'p', 100, 0, 3.3, 1.0); E.show('#t100', 3.6); G.txt('#tr', '100%', 3.8);
  /* 3 */ E.draw('#lc', 6.2, 1.6); E.movePoint(g, 'p', 50, 100, 7.0, 1.0); E.show('#tx', 7.6); G.txt('#tr', 'Tx', 7.6); G.txt('#rv', 'maximum', 7.6);
  /* 4 */ E.movePoint(g, 'p', 75, 75, 9.3, 0.8); G.pop('#q', 9.6); E.draw('#same', 9.8, 0.6); E.show('#t25', 9.8); E.show('#t75', 9.8);
          G.txt('#tr', '25% or 75%', 10.0); G.txt('#rv', '75 at both', 10.0);
  /* 5 */ tl.to('#q', { opacity: 0, duration: 0.3 }, 12.1);
          [[70, R(70)], [65, R(65)], [60, R(60)]].forEach(function (q, k) { E.movePoint(g, 'p', q[0], q[1], 12.3 + k * 0.4, 0.4); });
          G.txt('#tr', '75% → 60%', 13.2); G.txt('#rv', '75 → 96', 13.2);
  G.end(15);''', R=even(5, 3))

for cid, c in C.items():
    d = os.path.join(OUT, cid)
    os.makedirs(d, exist_ok=True)
    fx=lambda x: x.replace('%%','%')
    html = HEAD.replace('{css}', fx(c['css'])).replace('{caps}', fx(caps(c['caps']))).replace('{body}', fx(c['body'])).replace('{script}', fx(c['script'].replace('%s', c['R']))).replace('{id}', cid).replace('{title}', c['title']).replace('{dur}', re.search(r'G\.end\(([\d.]+)\)', c['script']).group(1))
    open(os.path.join(d, 'index.html'), 'w').write(html)
    print('wrote', cid)
