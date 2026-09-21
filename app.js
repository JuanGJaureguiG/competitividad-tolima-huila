/* ------------------------------------------------------------------
   Tablero de control — Competitividad Territorial · Tolima y Huila · IDC 2026
   UNIMINUTO Sede Tolima-Huila

   data.json (generado por build_data.py a partir de la presentación IDC 2026):
   { pillars:[{code,name,short,factor,T,H,nat,top10,subpillars,indicators,hist,bestT,bestH}],
     general:{years,T,H,nat}, externo:{rank_general,lider,escalafon,...} }
------------------------------------------------------------------- */

const COL = { T: '#E2962B', H: '#2F7A6D', nat: '#8A9BAE', top10: '#8A5FBF', ink: '#16324F', grid: '#EDEFEC', muted: '#6B7280' };
const DN = { T: 'Tolima', H: 'Huila' };
const FACTORS = ['Condiciones habilitantes', 'Capital humano', 'Eficiencia de los mercados', 'Ecosistema innovador'];
const TABS = [
  ['panorama', 'Panorama'],
  ['pilares', 'Pilares'],
  ['indicadores', 'Indicadores'],
  ['historico', 'Histórico 2019–2026'],
  ['metodologia', 'Metodología y fuentes'],
];

let DATA = null;
let charts = {};
const state = {
  tab: 'panorama',
  dept: 'both',            // both | T | H
  factors: new Set(),
  pillars: new Set(),      // códigos
  years: new Set(),        // años del dato
  q: '',
  pillarSel: null,
  sort: { key: 'chapter', dir: 1 },
  expanded: new Set(),
};

/* ---------------- utilidades ---------------- */
const fmt = (v, d = 2) => (v == null || isNaN(v)) ? '—' : v.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtS = (v, d = 2) => (v == null || isNaN(v)) ? '—' : (v > 0.0049 ? '+' : v < -0.0049 ? '−' : '') + fmt(Math.abs(v), d);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const rankClass = r => r <= 8 ? 'r-good' : r <= 18 ? 'r-mid' : 'r-bad';
const rankPill = r => `<span class="pill-rank ${rankClass(r)}">#${r}</span>`;
const gapCell = v => `<span class="gap ${v > 0.0049 ? 'pos' : v < -0.0049 ? 'neg' : ''}">${fmtS(v)}</span>`;
const D = () => state.dept === 'both' ? ['T', 'H'] : [state.dept];
const pad2 = n => String(n).padStart(2, '0');
const el = id => document.getElementById(id);

function wrap(s, n = 36) {
  const out = []; let cur = '';
  s.split(' ').forEach(w => {
    if ((cur + ' ' + w).trim().length > n) { out.push(cur.trim()); cur = w; } else cur = cur + ' ' + w;
  });
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function fPillars() {
  return DATA.pillars.filter(p =>
    (!state.factors.size || state.factors.has(p.factor)) &&
    (!state.pillars.size || state.pillars.has(p.code)));
}
function fIndicators() {
  const q = norm(state.q.trim());
  const rows = [];
  fPillars().forEach(p => p.indicators.forEach(i => {
    if (state.years.size && !state.years.has(i.year)) return;
    if (q && !norm(i.name).includes(q)) return;
    rows.push(Object.assign({ pillar: p }, i));
  }));
  return rows;
}
const last = a => a[a.length - 1];
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

/* ---------------- plugin de etiquetas propio (sin CDN externo) ---------------- */
const InlineLabels = {
  id: 'inlineLabels',
  afterDatasetsDraw(chart, _args, o) {
    if (!o || !o.enabled) return;
    const ctx = chart.ctx;
    const horiz = chart.options.indexAxis === 'y';
    ctx.save();
    ctx.font = `500 ${o.size || 10}px 'IBM Plex Sans', sans-serif`;
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((ds, di) => {
      if (ds.labels === false || !chart.isDatasetVisible(di)) return;
      const meta = chart.getDatasetMeta(di);
      meta.data.forEach((pt, i) => {
        const v = ds.data[i];
        if (v == null || isNaN(v)) return;
        const txt = o.fmt ? o.fmt(v, ds, i) : fmt(v);
        ctx.fillStyle = ds.labelColor || o.color || '#3B4B5C';
        if (chart.config.type === 'line') {
          const pos = typeof ds.labelPos === 'function' ? ds.labelPos(i) : (ds.labelPos || 'top');
          ctx.textAlign = 'center';
          ctx.fillText(txt, pt.x, pt.y + (pos === 'top' ? -11 : 11));
        } else if (o.center) {
          const w = Math.abs(pt.x - pt.base);
          if (w < 16) return;
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
          ctx.fillText(txt, (pt.x + pt.base) / 2, pt.y);
        } else if (horiz) {
          const neg = v < 0;
          ctx.textAlign = neg ? 'right' : 'left';
          ctx.fillText(txt, pt.x + (neg ? -4 : 4), pt.y);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(txt, pt.x, pt.y - 8);
        }
      });
    });
    ctx.restore();
  }
};
Chart.register(InlineLabels);
Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
Chart.defaults.color = COL.muted;

function ensureChart(id, config) {
  const c = el(id);
  if (!c) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(c.getContext('2d'), config);
}
function setH(wrapId, h) { el(wrapId).style.height = Math.max(240, h) + 'px'; }

const baseGrid = { color: COL.grid };
const tick = { font: { size: 11 }, color: COL.muted };
function legendOpts(pos = 'bottom') { return { position: pos, labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: COL.ink, padding: 14 } }; }

/* ---------------- arranque ---------------- */
async function boot() {
  DATA = window.__EMBEDDED_DATA__ || await (await fetch('data.json')).json();
  state.pillarSel = DATA.pillars[0].code;
  buildTabs();
  buildSidebar();
  render();
}

function buildTabs() {
  el('tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" data-tab="${k}">${l}</button>`).join('');
  el('tabs').addEventListener('click', e => {
    const b = e.target.closest('.tab'); if (!b) return;
    state.tab = b.dataset.tab; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------- sidebar ---------------- */
function group(title, key, inner, open = true) {
  const d = document.createElement('details');
  d.className = 'filter-group'; d.open = open;
  d.innerHTML = `<summary><span>${title}<span class="count-badge" data-badge="${key}" style="display:none"></span></span><span class="chev">▸</span></summary>`;
  d.appendChild(inner);
  return d;
}

function buildSidebar() {
  const sb = el('sidebar');
  sb.querySelectorAll('.filter-group').forEach(n => n.remove());
  const before = el('clear-all');

  // Departamento
  const dep = document.createElement('div'); dep.className = 'chip-list';
  [['both', 'Ambos', ''], ['T', 'Tolima', 'dot-t'], ['H', 'Huila', 'dot-h']].forEach(([k, l, c]) => {
    const b = document.createElement('button');
    b.className = `chip ${c} ${state.dept === k ? 'active' : ''}`; b.textContent = l;
    b.onclick = () => { state.dept = k; dep.querySelectorAll('.chip').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(); };
    dep.appendChild(b);
  });
  sb.insertBefore(group('Departamento', 'dept', dep), before);

  // Factor
  const fac = document.createElement('div'); fac.className = 'chip-list';
  FACTORS.forEach(f => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.factors.has(f) ? ' active' : ''); b.textContent = f;
    b.onclick = () => { state.factors.has(f) ? state.factors.delete(f) : state.factors.add(f); b.classList.toggle('active'); render(); };
    fac.appendChild(b);
  });
  sb.insertBefore(group('Factor', 'factors', fac), before);

  // Pilar
  const pl = document.createElement('div'); pl.className = 'check-list';
  DATA.pillars.forEach(p => {
    const r = document.createElement('label'); r.className = 'check-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = state.pillars.has(p.code);
    cb.onchange = () => { cb.checked ? state.pillars.add(p.code) : state.pillars.delete(p.code); render(); };
    r.appendChild(cb);
    r.insertAdjacentHTML('beforeend', `<span>${esc(p.short)}</span><span class="n">${p.indicators.length}</span>`);
    pl.appendChild(r);
  });
  sb.insertBefore(group('Pilar', 'pillars', pl, false), before);

  // Año del dato
  const yrs = [...new Set(DATA.pillars.flatMap(p => p.indicators.map(i => i.year)))].sort();
  const yl = document.createElement('div'); yl.className = 'chip-list';
  yrs.forEach(y => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.years.has(y) ? ' active' : ''); b.textContent = y;
    b.onclick = () => { state.years.has(y) ? state.years.delete(y) : state.years.add(y); b.classList.toggle('active'); render(); };
    yl.appendChild(b);
  });
  sb.insertBefore(group('Año del dato (indicadores)', 'years', yl, false), before);

  // Búsqueda
  const sw = document.createElement('div');
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'search-box'; inp.placeholder = 'Buscar indicador…'; inp.value = state.q;
  inp.oninput = () => { state.q = inp.value; render(); };
  sw.appendChild(inp);
  sb.insertBefore(group('Buscar indicador', 'q', sw), before);

  before.onclick = () => {
    state.dept = 'both'; state.factors.clear(); state.pillars.clear(); state.years.clear(); state.q = '';
    buildSidebar(); render();
  };
}

function syncBadges() {
  const set = (k, n) => { const b = document.querySelector(`[data-badge="${k}"]`); if (b) { b.style.display = n ? 'inline-block' : 'none'; b.textContent = n; } };
  set('factors', state.factors.size); set('pillars', state.pillars.size); set('years', state.years.size); set('q', state.q.trim() ? 1 : 0);
}

/* ---------------- render general ---------------- */
function render() {
  syncBadges();
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + state.tab));
  const empty = fPillars().length === 0 && state.tab !== 'metodologia';
  el('empty-state').style.display = empty ? 'block' : 'none';
  if (empty) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); return; }
  ({ panorama: renderPanorama, pilares: renderPilares, indicadores: renderIndicadores, historico: renderHistorico, metodologia: renderMetodologia })[state.tab]();
}

/* ---------------- KPIs ---------------- */
function kpiCard(label, rows, delta) {
  const solo = rows.length === 1 ? ' solo' : '';
  const body = rows.map(r => `<div class="duo${solo}"><span class="who ${r.k === 'T' ? 't' : 'h'}">${r.who}</span><span class="num">${r.val}</span>${r.extra ? `<span class="extra">${r.extra}</span>` : ''}</div>`).join('');
  return `<div class="kpi"><div class="label">${label}</div>${body}${delta ? `<div class="delta">${delta}</div>` : ''}</div>`;
}
function arrowRank(now, prev) {
  const d = prev - now;
  if (d > 0) return `<span class="up">▲ ${d} ${d === 1 ? 'puesto' : 'puestos'}</span>`;
  if (d < 0) return `<span class="down">▼ ${-d} ${-d === 1 ? 'puesto' : 'puestos'}</span>`;
  return `<span class="flat">= sin cambio</span>`;
}

/* ================================================================
   PANORAMA
================================================================ */
function generalScore(k, yearIdx = -1) {
  const a = DATA.general[k]; return yearIdx === -1 ? last(a) : a[yearIdx];
}

function renderPanorama() {
  const ps = fPillars(); const ds = D(); const ex = DATA.externo;

  // KPIs
  const best = k => [...ps].sort((a, b) => a[k].rank - b[k].rank || b[k].score - a[k].score)[0];
  const worst = k => [...ps].sort((a, b) => b[k].rank - a[k].rank || a[k].score - b[k].score)[0];
  const nat = last(DATA.general.nat);
  el('kpi-pan').innerHTML = [
    kpiCard('Puesto general IDC 2026 (de 33)', ds.map(k => ({ k, who: DN[k], val: '#' + ex.rank_general[k]['2026'], extra: `2025: #${ex.rank_general[k]['2025']} · ${arrowRank(ex.rank_general[k]['2026'], ex.rank_general[k]['2025'])}` })), ''),
    kpiCard('Puntaje general (promedio de los 13 pilares)', ds.map(k => { const v = generalScore(k); return { k, who: DN[k], val: fmt(v), extra: `vs Nacional ${fmtS(v - nat)}` }; }), `Nacional ${fmt(nat)} · Líder ${esc(ex.lider.name.replace(', D.C.', ' D.C.'))} ${fmt(ex.lider.score)}`),
    kpiCard('Mejor pilar (puesto)', ds.map(k => { const p = best(k); return { k, who: DN[k], val: '#' + p[k].rank, extra: esc(p.short) }; }), ''),
    kpiCard('Pilar con mayor rezago (puesto)', ds.map(k => { const p = worst(k); return { k, who: DN[k], val: '#' + p[k].rank, extra: esc(p.short) }; }), ''),
  ].join('');

  // Leyenda
  el('legend-pan').innerHTML =
    ds.map(k => `<span><i class="${k.toLowerCase()}"></i>${DN[k]}</span>`).join('') +
    `<span><i class="n"></i>Promedio nacional</span>`;

  // Barras por pilar
  const dsets = ds.map(k => ({ label: DN[k], data: ps.map(p => p[k].score), backgroundColor: COL[k], borderRadius: 2 }));
  dsets.push({ label: 'Promedio nacional', data: ps.map(p => p.nat), backgroundColor: COL.nat, borderRadius: 2 });
  setH('wrap-pilares', ps.length * (dsets.length * 16 + 22) + 40);
  ensureChart('chart-pilares', {
    type: 'bar',
    data: { labels: ps.map(p => [p.short, ds.map(k => `${k === 'T' ? 'Tolima' : 'Huila'} #${p[k].rank}`).join(' · ')]), datasets: dsets },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 34 } },
      plugins: { legend: { display: false }, inlineLabels: { enabled: true, size: 10 }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.x)}` } } },
      scales: { x: { min: 0, max: 10, grid: baseGrid, ticks: tick }, y: { grid: { display: false }, ticks: { font: { size: 11 }, color: COL.ink } } }
    }
  });

  // Radar
  const rd = ds.map(k => ({ label: DN[k], data: ps.map(p => p[k].score), borderColor: COL[k], backgroundColor: COL[k] + '26', pointBackgroundColor: COL[k], borderWidth: 2, pointRadius: 3 }));
  rd.push({ label: 'Promedio nacional', data: ps.map(p => p.nat), borderColor: COL.nat, backgroundColor: 'transparent', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 });
  rd.push({ label: 'Promedio Top 10', data: ps.map(p => p.top10), borderColor: COL.top10, backgroundColor: 'transparent', borderDash: [2, 3], borderWidth: 1.5, pointRadius: 0 });
  ensureChart('chart-radar', {
    type: 'radar', data: { labels: ps.map(p => wrap(p.short, 16)), datasets: rd },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: legendOpts(), tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.r)}` } } },
      scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, backdropColor: 'transparent', font: { size: 9 } }, grid: { color: COL.grid }, angleLines: { color: COL.grid }, pointLabels: { font: { size: 10 }, color: COL.ink } } }
    }
  });

  // Factores
  const facs = FACTORS.filter(f => ps.some(p => p.factor === f));
  const fv = (k, f) => mean(ps.filter(p => p.factor === f).map(p => k === 'nat' ? p.nat : p[k].score));
  const fd = ds.map(k => ({ label: DN[k], data: facs.map(f => fv(k, f)), backgroundColor: COL[k], borderRadius: 2 }));
  fd.push({ label: 'Promedio nacional', data: facs.map(f => fv('nat', f)), backgroundColor: COL.nat, borderRadius: 2 });
  ensureChart('chart-factores', {
    type: 'bar', data: { labels: facs.map(f => wrap(f, 16)), datasets: fd },
    options: {
      responsive: true, maintainAspectRatio: false, layout: { padding: { top: 16 } },
      plugins: { legend: legendOpts(), inlineLabels: { enabled: true, size: 10 }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: COL.ink } }, y: { min: 0, max: 10, grid: baseGrid, ticks: tick } }
    }
  });

  // Mapa de posiciones
  let h = `<thead><tr><th>Pilar</th><th>Factor</th>`;
  ds.forEach(k => { h += `<th class="r">${DN[k]} · puesto y puntaje</th>`; });
  h += `<th class="r">Nacional</th><th class="r">Top 10</th>`;
  ds.forEach(k => { h += `<th class="r">${DN[k]} vs Nac.</th>`; });
  h += `</tr></thead><tbody>`;
  ps.forEach(p => {
    h += `<tr class="row click" data-pillar="${p.code}"><td class="ind">${esc(p.short)}</td><td class="nw">${esc(p.factor)}</td>`;
    ds.forEach(k => { h += `<td class="r nw">${rankPill(p[k].rank)}<span class="cell-sc">${fmt(p[k].score)}</span></td>`; });
    h += `<td class="r">${fmt(p.nat)}</td><td class="r">${fmt(p.top10)}</td>`;
    ds.forEach(k => { h += `<td class="r">${gapCell(p[k].score - p.nat)}</td>`; });
    h += `</tr>`;
  });
  el('tbl-map').innerHTML = h + '</tbody>';
  el('tbl-map').onclick = e => { const tr = e.target.closest('tr[data-pillar]'); if (tr) { state.pillarSel = tr.dataset.pillar; state.tab = 'pilares'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

  // Escalafón
  el('ladder').innerHTML = ex.escalafon.map(r => {
    const isT = r.name === 'Tolima', isH = r.name === 'Huila';
    const sc = isT ? generalScore('T') : isH ? generalScore('H') : r.score;
    return `<div class="lad ${isT ? 't' : isH ? 'h' : ''}"><b>#${r.rank}</b><span>${esc(r.name)}</span>${sc != null ? `<em>${fmt(sc)}</em>` : ''}</div>`;
  }).join('');
  el('ladder-note').innerHTML = 'Escalafón general y puntajes de otros departamentos tomados de fuentes públicas del IDC 2026 (Consejo Privado de Competitividad y Universidad del Rosario, prensa regional y resumen de la Cámara de Comercio de Manizales); solo se muestran los puntajes publicados. El puntaje de Tolima y Huila es el promedio simple de sus 13 pilares, que es como el IDC calcula el puntaje general. Ver <b>Metodología y fuentes</b>.';

  // Insights
  el('insights').innerHTML = ds.map(k => insightBlock(k, ps)).join('');
}

function insightBlock(k, ps) {
  const byRank = [...ps].sort((a, b) => a[k].rank - b[k].rank || b[k].score - a[k].score);
  const delta = p => last(p.hist[k]) - p.hist[k][p.hist[k].length - 2];
  const byDelta = [...ps].sort((a, b) => delta(b) - delta(a));
  const inds = ps.flatMap(p => p.indicators.map(i => Object.assign({ p }, i)));
  const byInd = [...inds].sort((a, b) => a[k].rank - b[k].rank || b[k].score - a[k].score);
  const li = (nm, sub, r, sc) => `<li><span class="nm">${esc(nm)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>${r != null ? rankPill(r) : ''}<span class="cell-sc">${sc}</span></li>`;
  const dli = p => `<li><span class="nm">${esc(p.short)}</span><span class="gap ${delta(p) >= 0 ? 'pos' : 'neg'}">${fmtS(delta(p))}</span><span class="cell-sc">${fmt(last(p.hist[k]))}</span></li>`;
  const nP = Math.min(3, ps.length);
  return `<div class="ins">
    <div class="dept-head ${k === 'H' ? 'h' : ''}">${DN[k]}</div>
    <h4>Pilares con mejor posición</h4><ul>${byRank.slice(0, nP).map(p => li(p.short, p.factor, p[k].rank, fmt(p[k].score))).join('')}</ul>
    <h4>Pilares con mayor rezago</h4><ul>${byRank.slice(-nP).reverse().map(p => li(p.short, p.factor, p[k].rank, fmt(p[k].score))).join('')}</ul>
    <h4>Mayor avance de puntaje vs 2025 (serie recalculada)</h4><ul>${byDelta.slice(0, nP).map(dli).join('')}</ul>
    <h4>Mayor retroceso de puntaje vs 2025</h4><ul>${byDelta.slice(-nP).reverse().map(dli).join('')}</ul>
    <h4>Indicadores mejor posicionados</h4><ul>${byInd.slice(0, 5).map(i => li(i.name, `${i.p.short} · dato ${i.year}`, i[k].rank, fmt(i[k].score))).join('')}</ul>
    <h4>Indicadores más rezagados</h4><ul>${byInd.slice(-5).reverse().map(i => li(i.name, `${i.p.short} · dato ${i.year}`, i[k].rank, fmt(i[k].score))).join('')}</ul>
  </div>`;
}

/* ================================================================
   PILARES
================================================================ */
function renderPilares() {
  const ps = fPillars(); const ds = D();
  if (!ps.find(p => p.code === state.pillarSel)) state.pillarSel = ps[0].code;
  const P = ps.find(p => p.code === state.pillarSel);

  el('pill-nav').innerHTML = ps.map(p => `<button class="pill-btn ${p.code === P.code ? 'active' : ''}" data-code="${p.code}"><small>${pad2(p.chapter)}</small>${esc(p.short)}</button>`).join('');
  el('pill-nav').onclick = e => { const b = e.target.closest('.pill-btn'); if (b) { state.pillarSel = b.dataset.code; render(); } };

  el('pillar-head').innerHTML = `<div class="pillar-title"><h3>${esc(P.full)}</h3><span class="fac">Factor: ${esc(P.factor)} · ${P.subpillars.length ? P.subpillars.length + ' subpilares · ' : 'sin subpilares · '}${P.indicators.length} indicadores</span></div><div style="height:12px"></div>`;

  // KPIs
  const cards = [];
  ds.forEach(k => cards.push(`<div class="kpi" style="border-left-color:${COL[k]}"><div class="label">${DN[k]} · puesto ${P[k].rank} de 33</div><div class="num">${fmt(P[k].score)}</div><div class="delta">vs Nacional <span class="gap ${P[k].score >= P.nat ? 'pos' : 'neg'}">${fmtS(P[k].score - P.nat)}</span> · vs Top 10 <span class="gap ${P[k].score >= P.top10 ? 'pos' : 'neg'}">${fmtS(P[k].score - P.top10)}</span></div></div>`));
  cards.push(`<div class="kpi" style="border-left-color:${COL.nat}"><div class="label">Promedio nacional</div><div class="num">${fmt(P.nat)}</div><div class="delta">Promedio de los 33 territorios</div></div>`);
  cards.push(`<div class="kpi" style="border-left-color:${COL.top10}"><div class="label">Promedio Top 10</div><div class="num">${fmt(P.top10)}</div><div class="delta">Referencia de los mejores desempeños</div></div>`);
  el('kpi-pil').style.gridTemplateColumns = `repeat(${cards.length},1fr)`;
  el('kpi-pil').innerHTML = cards.join('');

  el('best-row').innerHTML = ds.map(k => { const b = P['best' + k]; return `<div class="best ${k.toLowerCase()}"><span class="who">Mejor posición ${DN[k]}</span><b>${esc(b.name)}</b> ${rankPill(b.rank)}</div>`; }).join('');

  // Subpilares
  const hasSub = P.subpillars.length > 0;
  const wsub = el('wrap-sub');
  if (!hasSub) {
    if (charts['chart-sub']) { charts['chart-sub'].destroy(); delete charts['chart-sub']; }
    wsub.style.height = 'auto';
    wsub.innerHTML = `<div class="empty-state" style="padding:40px 10px">Este pilar no está dividido en subpilares en la estructura 2026. Se evalúa directamente con sus ${P.indicators.length} indicadores.</div><canvas id="chart-sub" style="display:none"></canvas>`;
  } else {
    if (!wsub.querySelector('canvas') || wsub.querySelector('.empty-state')) wsub.innerHTML = '<canvas id="chart-sub"></canvas>';
    const sd = ds.map(k => ({ label: DN[k], data: P.subpillars.map(s => s[k].score), backgroundColor: COL[k], borderRadius: 2 }));
    sd.push({ label: 'Promedio Top 10', data: P.subpillars.map(s => s.top10), backgroundColor: COL.top10, borderRadius: 2 });
    setH('wrap-sub', P.subpillars.length * ((sd.length) * 16 + 30) + 70);
    ensureChart('chart-sub', {
      type: 'bar',
      data: { labels: P.subpillars.map(s => [...wrap(s.name, 32), ds.map(k => `${DN[k]} #${s[k].rank}`).join(' · ')]), datasets: sd },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 34 } },
        plugins: { legend: legendOpts('top'), inlineLabels: { enabled: true, size: 10 } },
        scales: { x: { min: 0, max: 10, grid: baseGrid, ticks: tick }, y: { grid: { display: false }, ticks: { font: { size: 11 }, color: COL.ink } } }
      }
    });
  }

  // Histórico del pilar
  const yrs = P.hist.years;
  const both = ds.length === 2;
  const hd = ds.map(k => ({
    label: DN[k], data: P.hist[k], borderColor: COL[k], backgroundColor: COL[k], borderWidth: 2.5, pointRadius: 3.5, tension: .25,
    labelPos: i => both ? ((P.hist[k][i] >= P.hist[k === 'T' ? 'H' : 'T'][i]) ? 'top' : 'bottom') : 'top'
  }));
  hd.push({ label: 'Promedio nacional', data: P.hist.nat, borderColor: COL.nat, backgroundColor: COL.nat, borderDash: [5, 4], borderWidth: 1.5, pointRadius: 2, tension: .25, labels: false });
  hd.push({ label: 'Promedio Top 10', data: P.hist.top10, borderColor: COL.top10, backgroundColor: COL.top10, borderDash: [2, 3], borderWidth: 1.5, pointRadius: 2, tension: .25, labels: false });
  const chg = ds.map(k => `${DN[k]} <span class="gap ${(last(P.hist[k]) - P.hist[k][6]) >= 0 ? 'pos' : 'neg'}">${fmtS(last(P.hist[k]) - P.hist[k][6])}</span>`).join(' · ');
  document.querySelector('#panel-hist-pil .panel-sub').innerHTML = `Cambio 2025 → 2026: ${chg} · serie recalculada bajo la metodología 2026`;
  setH('wrap-hist-pil', 330);
  ensureChart('chart-hist-pil', {
    type: 'line', data: { labels: yrs, datasets: hd },
    options: {
      responsive: true, maintainAspectRatio: false, layout: { padding: { top: 14, bottom: 4 } },
      plugins: { legend: legendOpts(), inlineLabels: { enabled: true, size: 10 }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
      scales: { x: { offset: true, grid: { display: false }, ticks: { font: { size: 11 }, color: COL.ink } }, y: { grid: baseGrid, ticks: tick } }
    }
  });

  // Indicadores del pilar
  const inds = P.indicators;
  const idd = ds.map(k => ({ label: DN[k], data: inds.map(i => i[k].score), backgroundColor: COL[k], borderRadius: 2 }));
  idd.push({ label: 'Promedio nacional', data: inds.map(i => i.nat), backgroundColor: COL.nat, borderRadius: 2 });
  idd.push({ label: 'Promedio Top 10', data: inds.map(i => i.top10), backgroundColor: COL.top10, borderRadius: 2 });
  setH('wrap-ind-pil', inds.reduce((s, i) => s + Math.max((wrap(i.name, 46).length + 1) * 13 + 14, idd.length * 15 + 18), 0) + 90);
  ensureChart('chart-ind-pil', {
    type: 'bar',
    data: { labels: inds.map(i => [...wrap(i.name, 46), ds.map(k => `${DN[k]} #${i[k].rank}`).join(' · ') + ` · dato ${i.year}`]), datasets: idd },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 34 } },
      plugins: { legend: legendOpts('top'), inlineLabels: { enabled: true, size: 10 } },
      scales: { x: { min: 0, max: 10, grid: baseGrid, ticks: tick }, y: { grid: { display: false }, ticks: { font: { size: 10.5 }, color: COL.ink } } }
    }
  });

  indTable(el('tbl-ind-pil'), inds.map(i => Object.assign({ pillar: P }, i)), { showPillar: false, sortable: false });
}

/* ---------------- tabla de indicadores (compartida) ---------------- */
const SORTERS = {
  chapter: r => r.pillar.chapter, name: r => norm(r.name), year: r => r.year,
  Tr: r => r.T.rank, Ts: r => r.T.score, Hr: r => r.H.rank, Hs: r => r.H.score,
  nat: r => r.nat, top10: r => r.top10, Tg: r => r.T.score - r.nat, Hg: r => r.H.score - r.nat,
};

function indTable(tbl, rows, { showPillar = false, sortable = false } = {}) {
  const ds = D();
  const arr = key => sortable && state.sort.key === key ? `<span class="arr">${state.sort.dir > 0 ? '▲' : '▼'}</span>` : (sortable ? '<span class="arr">↕</span>' : '');
  const th = (label, key, cls = '') => `<th class="${cls} ${sortable ? 'sortable' : ''}" ${sortable ? `data-sort="${key}"` : ''}>${label}${arr(key)}</th>`;
  let cols = 1;
  let h = `<thead><tr><th style="width:18px"></th>${th('Indicador', 'name')}`; cols++;
  if (showPillar) { h += th('Pilar', 'chapter'); cols++; }
  h += th('Año dato', 'year', 'r'); cols++;
  ds.forEach(k => { h += th(`${DN[k]} · puesto y puntaje`, k + 'r', 'r'); cols++; });
  h += th('Nacional', 'nat', 'r') + th('Top 10', 'top10', 'r'); cols += 2;
  ds.forEach(k => { h += th(`${DN[k]} vs Nac.`, k + 'g', 'r'); cols++; });
  h += `</tr></thead><tbody>`;
  rows.forEach(r => {
    const id = r.pillar.code + '|' + r.name; const open = state.expanded.has(id);
    h += `<tr class="row click" data-id="${esc(id)}"><td><span class="caret">${open ? '▼' : '▶'}</span></td><td class="ind">${esc(r.name)}${r.inverso ? '<span class="itag inv">Inverso</span>' : ''}</td>`;
    if (showPillar) h += `<td>${esc(r.pillar.short)}</td>`;
    h += `<td class="r">${r.year}</td>`;
    ds.forEach(k => { h += `<td class="r nw">${rankPill(r[k].rank)}<span class="cell-sc">${fmt(r[k].score)}</span></td>`; });
    h += `<td class="r">${fmt(r.nat)}</td><td class="r">${fmt(r.top10)}</td>`;
    ds.forEach(k => { h += `<td class="r">${gapCell(r[k].score - r.nat)}</td>`; });
    h += `</tr>`;
    if (open) h += `<tr class="detail"><td colspan="${cols}"><dl>
        <dt>Cálculo</dt><dd>${esc(r.calc || 'Ver metadata IDC 2026')}</dd>
        <dt>Fuente</dt><dd>${esc(r.fuente || '—')}</dd>
        <dt>Año del dato</dt><dd>${r.year} (año de la fuente, no de publicación del IDC)</dd>
        <dt>Sentido</dt><dd>${r.inverso ? 'Indicador inverso: a menor valor observado, mayor puntaje.' : 'A mayor valor observado, mayor puntaje.'}</dd></dl></td></tr>`;
  });
  if (!rows.length) h += `<tr><td colspan="${cols}" class="empty-state">No hay indicadores para los filtros seleccionados.</td></tr>`;
  tbl.innerHTML = h + '</tbody>';
  tbl.onclick = e => {
    const s = e.target.closest('th[data-sort]');
    if (s) { const k = s.dataset.sort; state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : 1 }; render(); return; }
    const tr = e.target.closest('tr.row'); if (!tr) return;
    const id = tr.dataset.id; state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    render();
  };
}

/* ================================================================
   INDICADORES
================================================================ */
function renderIndicadores() {
  const rows = fIndicators(); const ds = D();
  const total = DATA.n_indicators;
  const cnt = (k, fn) => rows.filter(r => fn(r[k].rank)).length;
  const pct = (n) => rows.length ? ` · ${fmt(n / rows.length * 100, 0)}%` : '';
  const above = k => rows.filter(r => r[k].score > r.nat).length;
  el('kpi-ind').innerHTML = [
    `<div class="kpi"><div class="label">Indicadores en la vista</div><div class="num">${rows.length}</div><div class="delta">de ${total} indicadores · ${new Set(rows.map(r => r.pillar.code)).size} pilares</div></div>`,
    kpiCard('En fortaleza (puesto 1–8)', ds.map(k => { const n = cnt(k, r => r <= 8); return { k, who: DN[k], val: n, extra: pct(n).replace(' · ', '') }; }), ''),
    kpiCard('En brecha (puesto 19–33)', ds.map(k => { const n = cnt(k, r => r >= 19); return { k, who: DN[k], val: n, extra: pct(n).replace(' · ', '') }; }), ''),
    kpiCard('Por encima del promedio nacional', ds.map(k => { const n = above(k); return { k, who: DN[k], val: n, extra: pct(n).replace(' · ', '') }; }), ''),
  ].join('');

  // Distribución
  const bands = [['Fortaleza (1–8)', r => r <= 8, '#2F7A6D'], ['Intermedio (9–18)', r => r >= 9 && r <= 18, '#E2B25F'], ['Brecha (19–33)', r => r >= 19, '#C1432B']];
  ensureChart('chart-dist', {
    type: 'bar',
    data: { labels: ds.map(k => DN[k]), datasets: bands.map(([l, fn, c]) => ({ label: l, data: ds.map(k => cnt(k, fn)), backgroundColor: c, borderRadius: 0 })) },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: legendOpts(), inlineLabels: { enabled: true, center: true, size: 12, fmt: v => String(v) }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.x} indicadores` } } },
      scales: { x: { stacked: true, grid: baseGrid, ticks: { ...tick, precision: 0 } }, y: { stacked: true, grid: { display: false }, ticks: { font: { size: 12 }, color: COL.ink } } }
    }
  });

  // Brechas por pilar
  const ps = fPillars();
  const bd = ds.map(k => ({ label: DN[k], data: ps.map(p => rows.filter(r => r.pillar.code === p.code && r[k].rank >= 19).length), backgroundColor: COL[k], borderRadius: 2 }));
  ensureChart('chart-brechas', {
    type: 'bar', data: { labels: ps.map(p => p.short), datasets: bd },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 22 } },
      plugins: { legend: legendOpts(), inlineLabels: { enabled: true, size: 10, fmt: v => String(v) } },
      scales: { x: { min: 0, grid: baseGrid, ticks: { ...tick, precision: 0 } }, y: { grid: { display: false }, ticks: { font: { size: 10.5 }, color: COL.ink } } }
    }
  });

  el('ind-count-sub').textContent = `${rows.length} de ${total} indicadores · haz clic en un encabezado para ordenar y en una fila para ver el cálculo y la fuente`;
  const f = SORTERS[state.sort.key] || SORTERS.chapter;
  const sorted = [...rows].sort((a, b) => { const x = f(a), y = f(b); return (x > y ? 1 : x < y ? -1 : 0) * state.sort.dir; });
  indTable(el('tbl-ind'), sorted, { showPillar: true, sortable: true });
}

/* ================================================================
   HISTÓRICO
================================================================ */
function renderHistorico() {
  const ps = fPillars(); const ds = D(); const yrs = DATA.general.years; const both = ds.length === 2;
  const all = ps.length === DATA.pillars.length;
  const ser = k => yrs.map((_, i) => mean(ps.map(p => p.hist[k][i])));
  el('hist-title').textContent = all ? 'Puntaje general 2019–2026' : `Promedio de ${ps.length} ${ps.length === 1 ? 'pilar' : 'pilares'} seleccionados, 2019–2026`;
  el('hist-sub').textContent = 'El puntaje general del IDC es el promedio simple de los pilares. Serie 2019–2025 recalculada bajo la metodología 2026: no debe compararse con las cifras publicadas en ediciones anteriores.';
  const sT = ser('T'), sH = ser('H'), sN = ser('nat');
  const gd = ds.map(k => {
    const s = k === 'T' ? sT : sH, o = k === 'T' ? sH : sT;
    return { label: DN[k], data: s, borderColor: COL[k], backgroundColor: COL[k], borderWidth: 3, pointRadius: 4.5, tension: .25, labelPos: i => both ? (s[i] >= o[i] ? 'top' : 'bottom') : 'top' };
  });
  gd.push({ label: 'Promedio nacional', data: sN, borderColor: COL.nat, backgroundColor: COL.nat, borderDash: [5, 4], borderWidth: 2, pointRadius: 3, tension: .25, labelPos: 'bottom' });
  ensureChart('chart-general', {
    type: 'line', data: { labels: yrs, datasets: gd },
    options: {
      responsive: true, maintainAspectRatio: false, layout: { padding: { top: 16, bottom: 10 } },
      plugins: { legend: legendOpts(), inlineLabels: { enabled: true, size: 11 }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
      scales: { x: { offset: true, grid: { display: false }, ticks: { font: { size: 12 }, color: COL.ink } }, y: { grid: baseGrid, ticks: tick } }
    }
  });

  const dchart = (id, wid, from) => {
    const dd = ds.map(k => ({ label: DN[k], data: ps.map(p => last(p.hist[k]) - p.hist[k][from]), backgroundColor: COL[k], borderRadius: 2 }));
    setH(wid, ps.length * (dd.length * 16 + 22) + 50);
    ensureChart(id, {
      type: 'bar', data: { labels: ps.map(p => p.short), datasets: dd },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 40, left: 6 } },
        plugins: { legend: legendOpts(), inlineLabels: { enabled: true, size: 10, fmt: v => fmtS(v) }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmtS(c.parsed.x)}` } } },
        scales: { x: { grid: baseGrid, ticks: tick }, y: { grid: { display: false }, ticks: { font: { size: 10.5 }, color: COL.ink } } }
      }
    });
  };
  dchart('chart-d26', 'wrap-d26', 6);
  dchart('chart-d19', 'wrap-d19', 0);

  // tabla
  let h = `<thead><tr><th>Pilar</th><th>Territorio</th>${yrs.map(y => `<th class="r">${y}</th>`).join('')}<th class="r">Δ 2025→2026</th></tr></thead><tbody>`;
  const rowH = (nm, who, arr, cls) => {
    const d = last(arr) - arr[arr.length - 2];
    return `<tr class="row"><td class="ind">${esc(nm)}</td><td><span class="who ${cls}" style="font-weight:600;color:${cls === 't' ? 'var(--accent-ink)' : cls === 'h' ? 'var(--teal)' : 'var(--muted)'}">${who}</span></td>${arr.map(v => `<td class="r cell-sc">${fmt(v)}</td>`).join('')}<td class="r"><span class="gap ${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '▲' : '▼'} ${fmtS(d)}</span></td></tr>`;
  };
  ds.forEach(k => { h += rowH(all ? 'Puntaje general' : 'Promedio de la selección', DN[k], k === 'T' ? sT : sH, k.toLowerCase()); });
  h += rowH(all ? 'Puntaje general' : 'Promedio de la selección', 'Nacional', sN, 'n');
  ps.forEach(p => { ds.forEach(k => { h += rowH(p.short, DN[k], p.hist[k], k.toLowerCase()); }); });
  el('tbl-hist').innerHTML = h + '</tbody>';
}

/* ================================================================
   METODOLOGÍA Y FUENTES
================================================================ */
function renderMetodologia() {
  const nInv = DATA.pillars.reduce((s, p) => s + p.indicators.filter(i => i.inverso).length, 0);
  el('prose').innerHTML = `
    <h4>¿Qué es el IDC?</h4>
    <p>El Índice Departamental de Competitividad (IDC) lo elaboran el Consejo Privado de Competitividad (CPC) y la Universidad del Rosario. La edición 2026 es la decimotercera y evalúa a los 32 departamentos y a Bogotá D.C. con ${DATA.n_indicators} indicadores de fuentes oficiales, organizados en ${DATA.n_pillars} pilares y ${DATA.n_subpillars} subpilares, agrupados en cuatro factores. Los resultados se expresan en una escala de 0 a 10.</p>
    <div class="factor-grid">
      ${FACTORS.map(f => `<div class="factor-box"><b>${f}</b>${DATA.pillars.filter(p => p.factor === f).map(p => `${pad2(p.chapter)} · ${esc(p.short)}`).join('<br>')}</div>`).join('')}
    </div>

    <h4>Cómo leer este tablero</h4>
    <ul>
      <li><b>Puntaje:</b> valor estandarizado de 0 a 10; a mayor puntaje, mejor desempeño relativo.</li>
      <li><b>Puesto:</b> posición entre 33 territorios; el puesto 1 es el mejor resultado. El tablero clasifica los puestos como fortaleza (1–8), intermedio (9–18) y brecha (19–33).</li>
      <li><b>Promedio nacional y Top 10:</b> referencias que trae la presentación IDC 2026 para cada pilar, subpilar e indicador.</li>
      <li><b>Puntaje general:</b> promedio simple de los 13 pilares. Con esta fórmula se reproduce el promedio nacional publicado (5,07 en 2026) y el puntaje de Tolima en 2025 (5,58). El puntaje de cada factor es el promedio de sus pilares.</li>
      <li><b>Indicadores inversos (${nInv}):</b> aquellos en los que un menor valor observado es mejor (por ejemplo, tasas de homicidio o de extorsión). El puntaje ya viene ajustado, por lo que siempre se lee "mayor es mejor".</li>
      <li><b>Año del dato:</b> corresponde al año de la fuente, no al año de publicación del IDC.</li>
    </ul>

    <h4>Cambios metodológicos del IDC 2026</h4>
    <ul>
      <li>La serie 2019–2025 fue recalculada con la metodología vigente. Las variaciones deben analizarse solo frente a esa serie recalculada, no frente a cifras publicadas en ediciones anteriores.</li>
      <li>Se incorporaron las nuevas proyecciones demográficas del DANE, lo que afecta los indicadores calculados por habitante o con la población como denominador.</li>
      <li>El subpilar de Investigación evalúa ahora tres dimensiones: investigadores activos, producción bibliográfica por investigador y sinergia entre los actores del ecosistema científico.</li>
      <li>Se reorganizó el pilar de Instituciones y se ajustaron los costos de transporte, el personal de salud y la cobertura en educación superior; se actualizaron fuentes de Adopción TIC y Sostenibilidad ambiental.</li>
      <li>Se eliminaron algunos indicadores (como esperanza de vida al nacer y relación estudiantes-docentes) y tres indicadores de educación superior no se actualizaron por falta de información.</li>
    </ul>

    <h4>Qué proviene de la presentación y qué de fuentes externas</h4>
    <ul>
      <li><b>De la presentación IDC 2026 (Tolima y Huila):</b> puntajes y puestos de los 13 pilares, 24 subpilares y ${DATA.n_indicators} indicadores; promedio nacional y Top 10; serie 2019–2026 por pilar; año, fuente y cálculo de cada indicador.</li>
      <li><b>De fuentes públicas del IDC 2026:</b> puestos generales de Tolima (#12; 2025: #11) y Huila (#14; 2025: #15), el escalafón de los 33 territorios y el puntaje de los líderes. Los puestos de Huila coinciden con la prensa regional; el de Tolima y el escalafón provienen del resumen de la Cámara de Comercio de Manizales por Caldas, basado en datos del CPC y la Universidad del Rosario.</li>
      <li><b>Calculado en este tablero:</b> puntaje general de Tolima (${fmt(generalScore('T'))}) y Huila (${fmt(generalScore('H'))}), puntajes por factor y variaciones entre años.</li>
    </ul>

    <h4>Fuentes</h4>
    <ul>
      <li>Presentación <i>Índice Departamental de Competitividad 2026 · Tolima y Huila</i>, con base en la Base de datos IDC 2019-2026 y la Metadata de variables IDC 2026.</li>
      <li><a href="https://urosario.edu.co/periodico-nova-et-vetera/sociedad/el-indice-departamental-de-competitividad-2026-un-insumo-estrategico-para-el-desarrollo-regional" target="_blank" rel="noopener">Universidad del Rosario — IDC 2026: un insumo estratégico para el desarrollo regional</a></li>
      <li><a href="https://compite.com.co/indice-departamental-de-competitividad-idc/" target="_blank" rel="noopener">Consejo Privado de Competitividad — Índice Departamental de Competitividad</a></li>
      <li><a href="https://estudios.ccmpc.org.co/wp-content/uploads/IDC-Caldas-2026.-VF.pdf" target="_blank" rel="noopener">Cámara de Comercio de Manizales por Caldas — IDC 2026 (escalafón general)</a></li>
      <li><a href="https://diariodelhuila.com/huila-mejora-en-el-indice-departamental-de-competitividad-2026-y-gana-una-posicion-en-el-ranking-nacional/" target="_blank" rel="noopener">Diario del Huila — Huila mejora en el IDC 2026</a></li>
      <li><a href="https://www.lanacion.com.co/competitividad-en-el-camino-correcto/" target="_blank" rel="noopener">La Nación — Competitividad, en el camino correcto</a></li>
      <li><a href="https://tolima.gov.co/noticias/8329-tolima-asciende-posicion-en-el-indice-departamental-de-competitividad" target="_blank" rel="noopener">Gobernación del Tolima — posición 11 en el IDC 2025</a></li>
    </ul>
    <p class="note">Las fórmulas de la ficha técnica se muestran en el tablero tal como aparecen en la presentación, en texto plano; para el desarrollo completo consulte la Metadata de variables IDC 2026.</p>`;
}

/* ---------------- pie ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  el('credit').innerHTML = 'Fuente: Consejo Privado de Competitividad y Universidad del Rosario, Índice Departamental de Competitividad 2026 (Base de datos IDC 2019-2026 y Metadata de variables IDC 2026). Los datos se muestran agregados por departamento. Elaborado para UNIMINUTO Sede Tolima-Huila.';
  boot();
});
