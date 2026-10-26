"""Generates Grove's BIT353 (Big Data and Data Warehousing) HyperFrames compositions into public/visuals/<id>/index.html.
   Usage: python3 scripts/gen-bit-visuals.py public/visuals"""
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
<style>
  .box h4 {{ font-size: 16px; }} .box .val {{ font-size: 24px; }}
  .sm {{ font: 500 17px/1.35 "JetBrains Mono", monospace; color: var(--mu); }}
  .row {{ font: 500 18px/1.5 "JetBrains Mono", monospace; color: var(--tx); white-space: nowrap; }}
  table.t {{ border-collapse: collapse; font: 500 19px/1 "JetBrains Mono", monospace; color: var(--tx); }}
  table.t td, table.t th {{ border: 2px solid var(--lo); padding: 9px 12px; text-align: right; }}
  table.t th {{ color: var(--mu); font-weight: 600; text-align: left; }}
  {css}
</style>
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
  var tl = G.tl, s = document.getElementById('plot');
  var wires = E.el('g', {{ fill: 'none' }}, s);
  function wire(id, d) {{ E.el('path', {{ id: id, d: d, stroke: G.LO, 'stroke-width': 4, 'stroke-linecap': 'round' }}, wires); }}
  G.caps({ranges});
{script}
  G.end({dur});
  window.__timelines = window.__timelines || {{}};
  window.__timelines['{id}'] = tl;
</script>
</body>
</html>
'''

def caps(lines):
    return '\n'.join(f'    <div class="step" id="c{i+1}">{i+1} · {t} <small>{s}</small></div>' for i, (t, s) in enumerate(lines))

def box(id, x, y, w, h, title, val='', extra='', style=''):
    v = f'<div class="val" id="{id}-v">{val}</div>' if val else ''
    cls = ' rd' if id in ('r1', 'r2', 'r3', 'r4') else ''
    return f'  <div class="box{cls}" id="{id}" style="left:{x}px; top:{y}px; width:{w}px; height:{h}px;{style}"><h4>{title}</h4>{v}{extra}</div>'

C = {}

# ---------------------------------------------------------------- ETL
C['bit-etl'] = dict(
  title='ETL: getting data into the warehouse', dur=15, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15]]',
  caps=[('Extract', 'Copy data out of the systems that run the business: tills, mobile money, the customer database.'),
        ('Transform', 'Clean it in a staging area: remove duplicates, fix formats, match IDs, add up where needed.'),
        ('Load', 'Write the clean rows into the warehouse’s fact and dimension tables.'),
        ('Use it', 'Reports, dashboards and KPIs now read one consistent copy of the truth.'),
        ('ETL vs ELT', 'ELT loads the raw data first and transforms it <em>inside</em> the warehouse. Common with cloud warehouses.')],
  css='.src{width:250px;height:92px;} .tag{font-size:17px;}',
  body='\n'.join([
    box('s1', 60, 160, 250, 92, 'POS tills', 'CSV files', style='', extra=''),
    box('s2', 60, 300, 250, 92, 'Mobile money', 'API'),
    box('s3', 60, 440, 250, 92, 'Customer DB', 'MySQL'),
    box('stg', 470, 250, 300, 190, 'Staging · transform', 'raw → clean'),
    box('dw', 930, 230, 290, 120, 'Data warehouse', 'fact_sales'),
    box('bi', 930, 470, 290, 100, 'Dashboard', 'KPIs'),
    '  <div class="tag" id="t1" style="left:470px; top:460px;">remove duplicate rows</div>',
    '  <div class="tag" id="t2" style="left:470px; top:500px;">05/03/26 → 2026-03-05</div>',
    '  <div class="tag" id="t3" style="left:470px; top:540px;">"K1,200" → 1200.00</div>',
    '  <div class="tag" id="t4" style="left:470px; top:580px;">match customer IDs</div>',
    '  <div class="tag good" id="t5" style="left:930px; top:370px;">+3,120 rows loaded</div>',
    '  <div class="tag warm" id="t6" style="left:420px; top:620px; white-space:normal; width:470px;">ELT: load raw → transform inside the warehouse (BigQuery, Snowflake)</div>',
    '  <div class="chip warm" id="k1">raw</div><div class="chip warm" id="k2">raw</div><div class="chip warm" id="k3">raw</div>',
    '  <div class="chip" id="k4">clean</div><div class="chip" id="k5">report</div><div class="chip warm" id="k6">raw</div>',
  ]),
  script='''  wire('w1','M310 206 C 390 206, 400 300, 470 320'); wire('w2','M310 346 L 470 346'); wire('w3','M310 486 C 390 486, 400 390, 470 372');
  wire('w4','M770 345 C 850 345, 850 290, 930 290'); wire('w5','M1075 350 L 1075 470');
  G.glow('#s1',0.2,2.4); G.glow('#s2',0.4,2.2); G.glow('#s3',0.6,2.0);
  G.wire('#w1',0.6,2); G.wire('#w2',0.8,2); G.wire('#w3',1.0,2);
  G.chip('#k1',[[310,206],[470,320],[560,330]],0.7,0.8); G.chip('#k2',[[310,346],[560,346]],0.9,0.8); G.chip('#k3',[[310,486],[470,372],[560,360]],1.1,0.8);
  G.glow('#stg',3.2,2.6); ['#t1','#t2','#t3','#t4'].forEach(function(t,i){ G.pop(t,3.4+i*0.5); });
  G.txt('#stg-v','clean ✓',5.0);
  G.wire('#w4',6.2,2.2); G.chip('#k4',[[770,345],[850,320],[930,290]],6.3,0.9); G.glow('#dw',7.0,1.8); G.pop('#t5',7.4);
  G.wire('#w5',9.2,2.2); G.chip('#k5',[[1075,350],[1075,470]],9.3,0.8); G.glow('#bi',9.9,1.8);
  ['#t1','#t2','#t3','#t4'].forEach(function(t){ G.fade(t,11.8,0); });
  G.chip('#k6',[[310,346],[620,180],[930,250]],12.3,1.0,0.3); G.glow('#dw',13.2,1.5,'warn'); G.pop('#t6',12.6);''')

# ---------------------------------------------------------------- star schema
C['bit-star-schema'] = dict(
  title='Star schema and snowflake schema', dur=15, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15]]',
  caps=[('The fact table', 'At the centre: one row per sale, with the <em>measures</em> you add up (quantity, amount) and a key for each dimension.'),
        ('Dimension tables', 'Around it: the who, what, where and when. Customer, product, store, date.'),
        ('A star', 'Each key in the fact table points to one dimension. Fact in the middle, dimensions around it: a star.'),
        ('A query', '“Total sales by province in Q1” joins the fact table to store and date, then adds up amount.'),
        ('Snowflake', 'Split a dimension further (product → category) to cut repetition. Fewer duplicates, but more joins.')],
  css='.dim{width:250px;} .dim .sm{margin-top:4px;} #fact{border-width:3px;}',
  body='\n'.join([
    box('fact', 500, 245, 280, 250, 'FACT_SALES', '', '<div class="sm">date_key<br/>product_key<br/>store_key<br/>customer_key<br/><span style="color:var(--hi)">quantity<br/>amount</span></div>'),
    box('dd', 80, 150, 250, 150, 'DIM_DATE', '', '<div class="sm">date_key<br/>day, month<br/><span id="q1">quarter</span>, year</div>', 'opacity:0;'),
    box('dp', 950, 150, 250, 150, 'DIM_PRODUCT', '', '<div class="sm">product_key<br/>name, brand<br/>category, price</div>', 'opacity:0;'),
    box('ds', 80, 470, 250, 150, 'DIM_STORE', '', '<div class="sm">store_key<br/>town, <span id="pv">province</span><br/>manager</div>', 'opacity:0;'),
    box('dc', 950, 470, 250, 150, 'DIM_CUSTOMER', '', '<div class="sm">customer_key<br/>name, age<br/>segment</div>', 'opacity:0;'),
    box('dcat', 1010, 330, 210, 110, 'DIM_CATEGORY', '', '<div class="sm">category_key<br/>category name</div>', 'opacity:0;'),
    '  <div class="tag good" id="ans" style="left:420px; top:560px;">Lusaka K2.4m · Copperbelt K1.9m · …</div>',
    '  <div class="tag warm" id="sf" style="left:470px; top:620px;">snowflake: product → category</div>',
  ]),
  script='''  wire('a1','M500 300 L 330 230'); wire('a2','M780 300 L 950 230'); wire('a3','M500 440 L 330 540'); wire('a4','M780 440 L 950 540'); wire('a5','M1000 300 L 1060 330');
  tl.set(['#a1','#a2','#a3','#a4','#a5'],{opacity:0},0); tl.to(['#a1','#a2','#a3','#a4'],{opacity:1,duration:0.3},6.0); tl.to('#a2',{attr:{d:'M780 300 L 820 230'},duration:0.6},12.1); tl.to('#a5',{opacity:1,duration:0.3},12.6);
  G.glow('#fact',0.3,2.5);
  ['#dd','#dp','#ds','#dc'].forEach(function(d,i){ G.pop(d,3.2+i*0.45); });
  ['#a1','#a2','#a3','#a4'].forEach(function(w,i){ G.wire(w,6.2+i*0.3,2.2); });
  G.glow('#ds',9.2,2.4); G.glow('#dd',9.4,2.2); G.glow('#fact',9.6,2.0);
  tl.to(['#pv','#q1'],{color:G.HI,duration:0.3},9.3); G.pop('#ans',10.2); G.fade('#ans',11.8,0);
  tl.to('#dp',{x:-130,duration:0.6},12.1); G.pop('#dcat',12.5); G.wire('#a5',12.7,2); G.pop('#sf',12.9);''')

# ---------------------------------------------------------------- OLAP cube
C['bit-olap-cube'] = dict(
  title='OLAP cube operations', dur=18, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15],[15,18]]',
  caps=[('The cube', 'Sales stored by three dimensions at once: <em>region × product × quarter</em>.'),
        ('Slice', 'Fix one dimension to one value (quarter = Q1). You get a flat table: one slice of the cube.'),
        ('Dice', 'Pick a range on several dimensions (Lusaka and Copperbelt, phones and laptops, Q1–Q2): a smaller cube.'),
        ('Roll-up', 'Climb a hierarchy: regions add up to Zambia, quarters add up to the year. Less detail.'),
        ('Drill-down', 'The opposite: open Q1 into January, February and March. More detail.'),
        ('Pivot', 'Rotate the view: products become rows and regions become columns. Same numbers, new angle.')],
  css='#res{position:absolute; left:740px; top:170px; width:520px; opacity:0;} #res .lbl{white-space:normal; line-height:1.3;} .lab{position:absolute; font:600 18px/1 "JetBrains Mono",monospace; color:var(--mu);}',
  body='''  <div id="res"><div class="lbl" id="rt" style="position:relative; margin-bottom:10px;">Result</div><table class="t" id="tbl"></table></div>
  <div class="lab" style="left:190px; top:650px;">product →</div>
  <div class="lab" style="left:40px; top:240px;">region ↑</div>
  <div class="lab" style="left:430px; top:140px;">quarter ↗</div>''',
  script='''  var O = { x: 190, y: 600 }, C = 112, D = [52, -38];
  var prods = ['Phones','Laptops','TVs'], regs = ['Lusaka','Copperbelt','Southern'], qs = ['Q1','Q2','Q3'];
  function P(x, y) { return x + ',' + y; }
  function poly(id, pts) { return E.el('polygon', { id: id, points: pts.map(function (p) { return P(p[0], p[1]); }).join(' '), fill: G.P.surface, stroke: G.P.lo, 'stroke-width': 2 }, s); }
  // front face cells: product i (x), region j (y, 0 = bottom), quarter 0
  for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
    var x = O.x + i * C, y = O.y - (j + 1) * C;
    poly('f' + i + j, [[x, y], [x + C, y], [x + C, y + C], [x, y + C]]);
  }
  // top face cells: product i, quarter k
  for (var i2 = 0; i2 < 3; i2++) for (var k = 0; k < 3; k++) {
    var bx = O.x + i2 * C + k * D[0], by = O.y - 3 * C + k * D[1];
    poly('t' + i2 + k, [[bx, by], [bx + C, by], [bx + C + D[0], by + D[1]], [bx + D[0], by + D[1]]]);
  }
  // right face cells: quarter k, region j
  for (var k2 = 0; k2 < 3; k2++) for (var j2 = 0; j2 < 3; j2++) {
    var rx = O.x + 3 * C + k2 * D[0], ry = O.y - (j2 + 1) * C + k2 * D[1];
    poly('r' + k2 + j2, [[rx, ry], [rx + D[0], ry + D[1]], [rx + D[0], ry + C + D[1]], [rx, ry + C]]);
  }
  prods.forEach(function (p, i) { E.text(O.x + i * C + C / 2, O.y + 28, p, { anchor: 'middle', cls: 'tick' }); });
  regs.forEach(function (r, j) { E.text(O.x - 10, O.y - j * C - C / 2 + 6, r, { anchor: 'end', cls: 'tick' }); });
  qs.forEach(function (q, k) { E.text(O.x + 3 * C + k * D[0] + D[0] / 2 + 8, O.y - 3 * C + k * D[1] + D[1] / 2 - 2, q, { cls: 'tick' }); });
  function cells(pred) { // visible faces whose cell satisfies pred(i, j, k)
    var out = [];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) if (pred(i, j, 0)) out.push('#f' + i + j);
    for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) if (pred(a, 2, b)) out.push('#t' + a + b);
    for (var c = 0; c < 3; c++) for (var d = 0; d < 3; d++) if (pred(2, d, c)) out.push('#r' + c + d);
    return out;
  }
  var all = cells(function () { return true; });
  function light(pred, at, kind) {
    tl.to(all, { attr: { fill: G.P.surface, 'fill-opacity': 0.35 }, duration: 0.3 }, at);
    tl.to(cells(pred), { attr: { fill: kind === 'warn' ? G.P.warnbg : G.P.hibg, 'fill-opacity': 1, stroke: kind === 'warn' ? G.WARN : G.HI }, duration: 0.4 }, at + 0.1);
  }
  function reset(at) { tl.to(all, { attr: { fill: G.P.surface, 'fill-opacity': 1, stroke: G.P.lo }, duration: 0.3 }, at); }
  function table(html, title, at) { G.txt('#rt', title, at); tl.set('#tbl', { innerHTML: html }, at); tl.fromTo('#tbl', { opacity: 0 }, { opacity: 1, duration: 0.4 }, at); }
  var R = function (cols, rows) { return '<tr><th></th>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' + rows.map(function (r) { return '<tr><th>' + r[0] + '</th>' + r.slice(1).map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>'; }).join(''); };
  tl.to(all, { attr: { stroke: G.HI }, duration: 0.4, stagger: 0.01 }, 0.4); tl.to(all, { attr: { stroke: G.P.lo }, duration: 0.4 }, 2.2);
  G.fade('#res', 3.0);
  light(function (i, j, k) { return k === 0; }, 3.1);
  table(R(prods, [['Lusaka', 120, 80, 45], ['Copperbelt', 95, 60, 30], ['Southern', 40, 25, 15]]), 'Slice · quarter = Q1 (K000)', 3.4);
  light(function (i, j, k) { return i < 2 && j > 0 && k < 2; }, 6.1, 'warn');
  table(R(['Q1', 'Q2'], [['Lusaka · Phones', 120, 130], ['Lusaka · Laptops', 80, 85], ['Copperbelt · Phones', 95, 90], ['Copperbelt · Laptops', 60, 70]]), 'Dice · 2 regions × 2 products × Q1–Q2', 6.4);
  reset(9.0);
  table(R(prods, [['Zambia · 2025', 1020, 690, 360]]), 'Roll-up · regions → Zambia, Q1–Q4 → 2025', 9.3);
  tl.to(all, { attr: { 'fill-opacity': 0.6 }, duration: 0.3 }, 9.3);
  light(function (i, j, k) { return k === 0; }, 12.1);
  table(R(['Jan', 'Feb', 'Mar'], [['Phones', 38, 41, 41], ['Laptops', 25, 27, 28], ['TVs', 14, 15, 16]]), 'Drill-down · Q1 → months (Lusaka)', 12.4);
  reset(15.0);
  table(R(regs, [['Phones', 120, 95, 40], ['Laptops', 80, 60, 25], ['TVs', 45, 30, 15]]), 'Pivot · products as rows (Q1)', 15.3);''')

# ---------------------------------------------------------------- HDFS
C['bit-hdfs'] = dict(
  title='How HDFS stores a file', dur=15, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15]]',
  caps=[('Split into blocks', 'A 384 MB file is cut into 128 MB blocks: B1, B2, B3.'),
        ('Replicate', 'Each block is copied to <em>three</em> different DataNodes (replication factor 3).'),
        ('The NameNode keeps the map', 'The NameNode stores only metadata: which blocks make the file, and where each copy lives.'),
        ('A DataNode fails', 'DN2 stops sending heartbeats. Every block it held still has two other copies, so reads carry on.'),
        ('Self-healing', 'The NameNode copies the missing blocks to healthy nodes until each block has three copies again.')],
  css='.dn{width:210px; height:190px;} .slot{position:absolute; width:56px; height:44px; border-radius:8px; display:flex; align-items:center; justify-content:center; font:700 19px/1 "JetBrains Mono",monospace; color:var(--ink); background:var(--hi); opacity:0;} #nn .sm{margin-top:6px;}',
  body='\n'.join([
    box('file', 50, 300, 230, 110, 'sales_2025.csv', '384 MB'),
    box('nn', 420, 140, 400, 150, 'NameNode · metadata', '', '<div class="sm" id="map">B1 → DN1, DN2, DN4<br/>B2 → DN2, DN3, DN1<br/>B3 → DN3, DN4, DN2</div>', 'opacity:0;'),
    box('dn1', 330, 430, 210, 190, 'DataNode 1'), box('dn2', 560, 430, 210, 190, 'DataNode 2'),
    box('dn3', 790, 430, 210, 190, 'DataNode 3'), box('dn4', 1020, 430, 210, 190, 'DataNode 4'),
    '  <div class="tag warm" id="x" style="left:590px; top:630px;">✕ no heartbeat</div>',
    '  <div class="chip" id="b1">B1</div><div class="chip" id="b2">B2</div><div class="chip" id="b3">B3</div>',
  ]),
  script='''  var DN = { 1: 330, 2: 560, 3: 790, 4: 1020 };
  var place = { B1: [1, 2, 4], B2: [2, 3, 1], B3: [3, 4, 2] };
  var used = { 1: 0, 2: 0, 3: 0, 4: 0 };
  var st = document.getElementById('stage');
  function slot(id, blk, n, slotIdx) {
    var d = document.createElement('div'); d.className = 'slot'; d.id = id; d.textContent = blk;
    d.style.left = (DN[n] + 18 + (slotIdx % 3) * 62) + 'px'; d.style.top = (480 + Math.floor(slotIdx / 3) * 54) + 'px'; st.appendChild(d); return '#' + id;
  }
  /* 1 split */
  G.glow('#file', 0.3, 1.2);
  [['#b1', 0.9], ['#b2', 1.2], ['#b3', 1.5]].forEach(function (c, i) { G.chip(c[0], [[165, 355], [165 + 0, 230 + i * 0], [340 + i * 70, 360]], c[1], 0.5, 1.2); });
  /* 2 replicate */
  var t = 3.2;
  ['B1', 'B2', 'B3'].forEach(function (b) {
    place[b].forEach(function (n) { var id = slot('s' + b + n, b, n, used[n]++); tl.fromTo(id, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3 }, t); t += 0.25; });
  });
  /* 3 NameNode */
  G.pop('#nn', 6.2); G.glow('#nn', 6.6, 2.0);
  /* 4 failure */
  tl.to('#dn2', { borderColor: G.WARN, opacity: 0.45, duration: 0.4 }, 9.2); G.pop('#x', 9.4);
  tl.to(['#sB1' + 2, '#sB2' + 2, '#sB3' + 2], { opacity: 0.25, duration: 0.4 }, 9.4);
  G.glow('#dn1', 10.2, 1.4); G.glow('#dn3', 10.4, 1.2);
  /* 5 heal */
  var heal = [['B1', 3], ['B2', 4], ['B3', 1]];
  heal.forEach(function (h, i) { var id = slot('h' + h[0], h[0], h[1], used[h[1]]++); tl.fromTo(id, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35 }, 12.4 + i * 0.5); });
  G.txt('#map', 'B1 → DN1, DN4, DN3\\nB2 → DN3, DN1, DN4\\nB3 → DN3, DN4, DN1', 13.6); tl.set('#map', { whiteSpace: 'pre-line' }, 13.6); G.glow('#nn', 13.6, 1.2);''')

# ---------------------------------------------------------------- MapReduce
C['bit-mapreduce'] = dict(
  title='MapReduce, step by step (and where Spark differs)', dur=15, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15]]',
  caps=[('Input and splitting', 'Daily temperature files are split, and each split goes to its own mapper.'),
        ('Map', 'Each mapper turns its lines into key/value pairs: <em>&lt;city, temperature&gt;</em>.'),
        ('Shuffle and sort', 'All pairs with the same city go to the same reducer.'),
        ('Reduce', 'Each reducer keeps the highest value: Lusaka 38, Harare 27, Cape Town 33, Windhoek 32.'),
        ('Spark instead', 'MapReduce writes to disk between steps. Spark keeps data in memory and rebuilds lost pieces from their lineage, so repeated jobs run much faster.')],
  css='.mp{width:190px;height:150px;} .rd .val{font-size:21px; white-space:nowrap;} .kv{position:absolute; font:600 17px/1 "JetBrains Mono",monospace; color:var(--tx); opacity:0; white-space:nowrap;}',
  body='\n'.join([
    box('in', 40, 290, 190, 140, 'Input files', 'temps/'),
    box('m1', 330, 150, 190, 150, 'Mapper 1'), box('m2', 330, 330, 190, 150, 'Mapper 2'), box('m3', 330, 510, 190, 150, 'Mapper 3'),
    '  <div class="lbl" id="sh" style="left:610px; top:140px; opacity:0;">shuffle &amp; sort</div>',
    box('r1', 880, 140, 330, 84, 'Reducer · Lusaka', '–', style=''), box('r2', 880, 254, 330, 84, 'Reducer · Harare', '–'),
    box('r3', 880, 368, 330, 84, 'Reducer · Cape Town', '–'), box('r4', 880, 482, 330, 84, 'Reducer · Windhoek', '–'),
    '  <div class="tag warm" id="disk" style="left:560px; top:620px;">MapReduce: map → disk → reduce → disk</div>',
    '  <div class="tag good" id="mem" style="left:560px; top:664px;">Spark: kept in memory · lineage rebuilds lost data</div>',
  ]),
  script='''  var kv = [['m1', ['<Lusaka, 18>', '<Harare, 20>', '<Lusaka, 38>']], ['m2', ['<Cape Town, 33>', '<Lusaka, 25>', '<Windhoek, 32>']], ['m3', ['<Harare, 27>', '<Cape Town, 21>', '<Windhoek, 29>']]];
  var st = document.getElementById('stage'), ys = { m1: 150, m2: 330, m3: 510 };
  kv.forEach(function (m) { m[1].forEach(function (p, i) { var d = document.createElement('div'); d.className = 'kv'; d.id = m[0] + 'k' + i; d.textContent = p; d.style.left = '342px'; d.style.top = (ys[m[0]] + 48 + i * 30) + 'px'; st.appendChild(d); }); });
  wire('i1', 'M230 330 L 330 225'); wire('i2', 'M230 360 L 330 405'); wire('i3', 'M230 390 L 330 585');
  G.glow('#in', 0.3, 1.5); G.wire('#i1', 0.9, 1.8); G.wire('#i2', 1.1, 1.8); G.wire('#i3', 1.3, 1.8);
  ['#m1', '#m2', '#m3'].forEach(function (m, i) { G.glow(m, 1.2 + i * 0.25, 1.5); });
  kv.forEach(function (m, a) { m[1].forEach(function (p, i) { tl.fromTo('#' + m[0] + 'k' + i, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3 }, 3.2 + a * 0.5 + i * 0.25); }); });
  G.fade('#sh', 6.0);
  var dest = { Lusaka: 182, Harare: 296, 'Cape Town': 410, Windhoek: 524 };
  var t = 6.3;
  kv.forEach(function (m) { m[1].forEach(function (p, i) { var city = p.slice(1, p.indexOf(',')); var el = '#' + m[0] + 'k' + i; tl.to(el, { x: 560 - 0, y: dest[city] - (ys[m[0]] + 48 + i * 30), duration: 0.8, ease: 'power2.inOut' }, t); tl.to(el, { opacity: 0, duration: 0.2 }, t + 0.8); t += 0.24; }); });
  ['#r1', '#r2', '#r3', '#r4'].forEach(function (r, i) { G.glow(r, 7.3 + i * 0.3, 1.2); });
  [['#r1-v', '38'], ['#r2-v', '27'], ['#r3-v', '33'], ['#r4-v', '32']].forEach(function (r, i) { G.txt(r[0], '<' + ['Lusaka', 'Harare', 'Cape Town', 'Windhoek'][i] + ', ' + r[1] + '>', 9.4 + i * 0.4); });
  G.pop('#disk', 12.3); G.pop('#mem', 13.1);''')

# ---------------------------------------------------------------- batch vs stream
C['bit-batch-stream'] = dict(
  title='Batch processing vs real-time (stream) processing', dur=15, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15]]',
  caps=[('Sales happen all day', 'SmartMart tills record a sale every few seconds.'),
        ('Batch: collect', 'In batch processing the sales pile up in a transaction file until the scheduled run.'),
        ('Batch: run at night', 'At midnight the whole batch updates the master file. All day, stock records were out of date.'),
        ('Real time: stream', 'Each sale is published to a Kafka topic and processed within seconds. Stock is always current.'),
        ('Choosing', 'Batch: high throughput, cheap, but delayed (payroll, daily reports). Stream: low latency, more complex (stock, fraud alerts).')],
  css='.lane{position:absolute; left:40px; width:1200px; height:4px; background:var(--lo);}',
  body='\n'.join([
    '  <div class="lbl" style="left:40px; top:150px;">Batch</div>', '  <div class="lbl" style="left:40px; top:430px;">Real time</div>',
    box('till', 40, 250, 170, 100, 'Tills', 'sales'),
    box('tf', 380, 200, 260, 150, 'Transaction file', '0 sales'),
    box('mf', 830, 200, 380, 150, 'Master file · stock', 'updated 00:00'),
    box('till2', 40, 500, 170, 100, 'Tills', 'sales'),
    box('kf', 380, 480, 260, 140, 'Kafka topic “sales”', 'stream'),
    box('st', 830, 480, 380, 140, 'Stock · live', 'updated now'),
    '  <div class="tag warm" id="late" style="left:830px; top:362px;">stock wrong until midnight</div>',
    '  <div class="tag good" id="now" style="left:830px; top:632px;">current within seconds</div>',
    '  <div class="tag" id="clock" style="left:390px; top:362px;">08:00</div>',
    *[f'  <div class="chip" id="e{i}">K{v}</div>' for i, v in enumerate([45, 120, 18, 260, 75, 32])],
    *[f'  <div class="chip" id="f{i}">K{v}</div>' for i, v in enumerate([45, 120, 18, 260])],
    '  <div class="chip warm" id="bat">batch · 1,240 sales</div>',
  ]),
  script='''  G.glow('#till', 0.3, 2.4); G.glow('#till2', 0.5, 2.2);
  var n = 0;
  for (var i = 0; i < 6; i++) { G.chip('#e' + i, [[210, 300], [510, 275]], 3.1 + i * 0.4, 0.5, 0.05); n += 200; G.txt('#tf-v', (i + 1) * 205 + ' sales', 3.7 + i * 0.4); }
  G.txt('#clock', '14:00', 4.6); G.txt('#clock', '23:59', 5.6);
  G.txt('#clock', '00:00', 6.2); G.chip('#bat', [[510, 275], [1020, 275]], 6.4, 1.2, 0.3); G.glow('#mf', 7.6, 1.2); G.pop('#late', 7.8); G.txt('#tf-v', '0 sales', 7.8);
  for (var j = 0; j < 4; j++) { G.chip('#f' + j, [[210, 550], [510, 550], [1020, 550]], 9.1 + j * 0.65, 0.55, 0.05); G.glow('#st', 9.8 + j * 0.65, 0.4); }
  G.pop('#now', 10.4);
  G.glow('#mf', 12.4, 2.2, 'warn'); G.glow('#st', 12.6, 2.0);''')

# ---------------------------------------------------------------- data mining / association rules
C['bit-data-mining'] = dict(
  title='Data mining: association rules and choosing a task', dur=15, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15]]',
  caps=[('Six baskets', 'Market basket analysis looks at what is bought together. Rule to test: <em>bread → butter</em>.'),
        ('Support', 'Bread and butter appear together in 3 of 6 baskets: support = 3 ÷ 6 = <em>50%</em>.'),
        ('Confidence', 'Of the 4 baskets with bread, 3 have butter: confidence = 3 ÷ 4 = <em>75%</em>.'),
        ('Lift', 'Butter is in 50% of all baskets. 75% ÷ 50% = <em>1.5</em>, so bread buyers take butter more than by chance.'),
        ('Which task?', 'Match the question to the task: patterns bought together, groups, labels, oddities, sequences.')],
  css='.bk{position:absolute; left:60px; width:520px; height:52px; border-radius:10px; background:var(--surface); border:2.5px solid var(--lo); display:flex; align-items:center; padding:0 14px; gap:10px; font:600 19px/1 "JetBrains Mono",monospace; color:var(--tx);} .bk b{color:var(--mu); font-weight:600; width:40px;} .it{padding:6px 10px; border-radius:6px; background:var(--raised);} .tk{position:absolute; left:660px; width:570px; font:500 18px/1.35 "Figtree",sans-serif; color:var(--tx); opacity:0;} .tk b{font-family:"JetBrains Mono",monospace; color:var(--hi);}',
  body='\n'.join(
    [f'  <div class="bk" id="bk{i}" style="top:{150 + i * 64}px;"><b>T{i + 1}</b>' + ''.join(f'<span class="it {"br" if x == "bread" else "bu" if x == "butter" else ""}">{x}</span>' for x in items) + '</div>'
     for i, items in enumerate([['bread', 'milk', 'butter'], ['bread', 'butter'], ['mealie meal', 'kapenta'], ['bread', 'milk'], ['bread', 'butter', 'eggs'], ['milk', 'eggs']])]
    + [box('m1', 660, 150, 260, 100, 'Support', '–', style='opacity:0;'), box('m2', 960, 150, 260, 100, 'Confidence', '–', style='opacity:0;'),
       box('m3', 660, 280, 260, 100, 'Lift', '–', style='opacity:0;')]
    + [f'  <div class="tk" id="k{i}" style="top:{160 + i * 78}px;"><b>{a}</b> · {b}</div>' for i, (a, b) in enumerate([
        ('Association', 'what is bought together (market basket)'), ('Clustering', 'find customer groups, no labels given'),
        ('Classification', 'learn from labelled cases: churn yes/no, spam'), ('Anomaly detection', 'unusual transactions → possible fraud'),
        ('Sequential patterns', 'savings account first, then a loan'), ('Regression', 'predict a number, e.g. next month’s spend')])]),
  script='''  var rows = ['#bk0', '#bk1', '#bk2', '#bk3', '#bk4', '#bk5'];
  rows.forEach(function (r, i) { tl.fromTo(r, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3 }, 0.2 + i * 0.2); });
  function mark(sel, at, kind) { tl.to(sel, { borderColor: kind === 'warn' ? G.WARN : G.HI, background: kind === 'warn' ? G.P.warnbg : G.P.hibg, duration: 0.3 }, at); }
  function unmark(at) { tl.to(rows, { borderColor: G.LO, background: G.P.surface, duration: 0.3 }, at); }
  G.pop('#m1', 3.2); mark(['#bk0', '#bk1', '#bk4'], 3.6); G.txt('#m1-v', '3/6 = 50%', 4.4);
  unmark(6.0); G.pop('#m2', 6.2); mark(['#bk0', '#bk1', '#bk3', '#bk4'], 6.4, 'warn'); mark(['#bk0', '#bk1', '#bk4'], 7.3); G.txt('#m2-v', '3/4 = 75%', 7.6);
  unmark(9.0); G.pop('#m3', 9.2); G.txt('#m3-v', '0.75/0.5 = 1.5', 10.2);
  tl.to(['#m1', '#m2', '#m3'], { opacity: 0, duration: 0.3 }, 12.0);
  ['#k0', '#k1', '#k2', '#k3', '#k4', '#k5'].forEach(function (k, i) { tl.fromTo(k, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 }, 12.2 + i * 0.3); });''')

# ---------------------------------------------------------------- big data stack
C['bit-big-data-stack'] = dict(
  title='The Big Data technology stack', dur=15, ranges='[[0,3],[3,6],[6,9],[9,12],[12,15]]',
  caps=[('Why “big” data', 'Too much (<em>volume</em>), too fast (<em>velocity</em>) and too mixed (<em>variety</em>) for one ordinary database.'),
        ('Sources and ingestion', 'Data arrives from apps, sensors, logs and social media. Kafka, Flume and Sqoop bring it in.'),
        ('Storage', 'HDFS, a data lake or a NoSQL store keeps it across many machines.'),
        ('Processing', 'MapReduce or Spark do the work in parallel. YARN decides which job gets which machines.'),
        ('Analysis and visualisation', 'Hive, Spark SQL and dashboards turn the results into answers people can use.')],
  css='.ly{left:300px; width:620px; height:84px;} .ly .val{font-size:19px; color:var(--mu);} .v{position:absolute; left:960px; width:270px; font:600 19px/1 "JetBrains Mono",monospace; opacity:0;} .v small{display:block; font:500 15px/1.3 Figtree,sans-serif; color:var(--mu); margin-top:4px;}',
  body='\n'.join([
    box('l5', 300, 140, 620, 84, '5 · Analysis & visualisation', 'Hive · Spark SQL · Power BI', style='opacity:0;'),
    box('l4', 300, 244, 620, 84, '4 · Processing', 'MapReduce · Spark · YARN', style='opacity:0;'),
    box('l3', 300, 348, 620, 84, '3 · Storage', 'HDFS · data lake · HBase / NoSQL', style='opacity:0;'),
    box('l2', 300, 452, 620, 84, '2 · Ingestion', 'Kafka · Flume · Sqoop', style='opacity:0;'),
    box('l1', 300, 556, 620, 84, '1 · Sources', 'apps · sensors · logs · social media', style='opacity:0;'),
    '  <div class="v" id="v1" style="top:160px; color:var(--hi);">Volume<small>terabytes and more</small></div>',
    '  <div class="v" id="v2" style="top:240px; color:var(--hi);">Velocity<small>arriving every second</small></div>',
    '  <div class="v" id="v3" style="top:320px; color:var(--hi);">Variety<small>tables, text, images, logs</small></div>',
    '  <div class="v" id="v4" style="top:400px; color:var(--warn);">Veracity<small>can we trust it?</small></div>',
    '  <div class="v" id="v5" style="top:480px; color:var(--warn);">Value<small>is it worth anything?</small></div>',
    '  <div class="chip" id="d">data</div>',
  ]),
  script='''  ['#v1', '#v2', '#v3', '#v4', '#v5'].forEach(function (v, i) { tl.fromTo(v, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 }, 0.3 + i * 0.4); });
  G.pop('#l1', 3.1); G.pop('#l2', 3.7); G.glow('#l1', 3.3, 1.2); G.glow('#l2', 4.1, 1.6);
  G.pop('#l3', 6.1); G.glow('#l3', 6.4, 2.0);
  G.pop('#l4', 9.1); G.glow('#l4', 9.4, 2.0);
  G.pop('#l5', 12.1); G.glow('#l5', 12.4, 1.8);
  G.chip('#d', [[610, 598], [610, 494], [610, 390], [610, 286], [610, 182]], 12.5, 0.45, 0.3);''')

for cid, c in C.items():
    d = os.path.join(OUT, cid)
    os.makedirs(d, exist_ok=True)
    fx = lambda x: x
    html = (HEAD.replace('{css}', c['css']).replace('{{', '{').replace('}}', '}')
            .replace('{caps}', caps(c['caps'])).replace('{body}', c['body']).replace('{script}', c['script'])
            .replace('{ranges}', c['ranges']).replace('{dur}', str(c['dur'])).replace('{id}', cid).replace('{title}', c['title']))
    open(os.path.join(d, 'index.html'), 'w').write(html)
    print('wrote', cid)
