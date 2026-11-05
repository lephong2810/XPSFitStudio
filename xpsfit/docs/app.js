/* XPS Fit Studio — user interface. © 2026 Phong Hoai Le — MIT License. */
(() => {
  const $ = id => document.getElementById(id);
  const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
  const t = I18N.t;
  XPS.t = I18N.t;
  const REPO = 'https://github.com/lephong2810/XPSFitStudio';
  // Pastel fills with matching strokes (paper style)
  const PAL = ['#5b8fd0', '#e8875a', '#4fae84', '#b07cc6', '#d9a520', '#3aa8b8', '#d4677e', '#8f9a3c', '#7d87d6', '#c08457'];
  const DOUBLETS = [['', 'Đơn', null], ['p', 'p (2:1)', 0.5], ['d', 'd (3:2)', 0.667], ['f', 'f (4:3)', 0.75]];
  const SPLITS = [['Ti 2p', 'p', 5.7], ['V 2p', 'p', 7.4], ['Cr 2p', 'p', 9.3], ['Mn 2p', 'p', 11.6], ['Fe 2p', 'p', 13.1], ['Co 2p', 'p', 15.0],
    ['Ni 2p', 'p', 17.3], ['Cu 2p', 'p', 19.8], ['Zn 2p', 'p', 23.0], ['Si 2p', 'p', 0.6], ['P 2p', 'p', 0.84], ['S 2p', 'p', 1.18], ['Cl 2p', 'p', 1.6],
    ['Mo 3d', 'd', 3.13], ['Ru 3d', 'd', 4.17], ['Pd 3d', 'd', 5.26], ['Ag 3d', 'd', 6.0], ['Sn 3d', 'd', 8.41], ['Ce 3d', 'd', 18.6],
    ['W 4f', 'f', 2.18], ['Ir 4f', 'f', 2.98], ['Pt 4f', 'f', 3.33], ['Au 4f', 'f', 3.67], ['Bi 4f', 'f', 5.31]];
  const TABS = ['calib', 'bg', 'peaks', 'quant', 'results'];

  let spectra = [], cur = -1, curTab = 'peaks';
  let addMode = false, selectMode = false, anchorMode = false, showHandles = true, knotMeta = [];
  let quantOpts = { imfp: 0, src: '' }, defShape = 'gl';
  const S = () => spectra[cur];
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };

  // ======================================================================
  // Sample data (simulated)
  // ======================================================================
  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function gauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const mk = (name, shape, center, fwhm, height, mix, extra = {}) => XPS.normComp(Object.assign({
    name, shape, center, fwhm, height, mix, fix: { mix: shape !== 'la' }, doublet: null, dkind: '', asym: { a: 1, b: 2, g: 0.6 }
  }, extra));
  function synth(name, lo, hi, step, comps, base, slope, jump, seed, acq) {
    const r = rng(seed), be = [], y = [];
    const xs = []; for (let x = lo; x <= hi + 1e-9; x += step) xs.push(+x.toFixed(3));
    const sig = xs.map(x => comps.reduce((a, c) => a + XPS.compCurve(c, x), 0));
    const tot = sig.reduce((a, v) => a + v, 0); let cum = 0;
    xs.forEach((x, i) => {
      cum += sig[i];
      const mean = base + slope * (x - lo) + jump * cum / tot + sig[i];
      be.push(x); y.push(Math.max(0, Math.round(mean + gauss(r) * Math.sqrt(mean))));
    });
    const s = XPS.makeSpectrum({ name, source: t('Dữ liệu mẫu (mô phỏng)'), be, y, unit: 'counts', acq, hv: 1486.6, meta: { 'Ghi chú': t('Phổ mô phỏng có nhiễu Poisson') } });
    s.sample = true;
    return s;
  }
  function sampleSet() {
    const off = 0.35;
    const c = synth('C 1s', 279, 294, 0.05, [mk('', 'gl', 284.8 + off, 1.15, 9000, 0.3), mk('', 'gl', 286.3 + off, 1.25, 2400, 0.3), mk('', 'gl', 288.7 + off, 1.3, 1200, 0.3)], 2600, 6, 500, 7, 3);
    c.region = [281, 292.5];
    c.comps = [mk('C–C/C–H', 'gl', 285.1, 1.1, 8000, 0.3), mk('C–O', 'gl', 286.7, 1.2, 2000, 0.3), mk('O–C=O', 'gl', 289, 1.2, 1000, 0.3)];
    const o = synth('O 1s', 524, 540, 0.05, [mk('', 'gl', 529.6 + off, 1.05, 7000, 0.3), mk('', 'gl', 531.3 + off, 1.6, 3600, 0.3), mk('', 'gl', 533.0 + off, 1.7, 900, 0.3)], 5200, 10, 900, 11, 3);
    o.region = [526, 537];
    o.comps = [mk(t('O lưới (M–O)'), 'gl', 530, 1.0, 6500, 0.3), mk(t('OH / O hấp phụ'), 'gl', 531.7, 1.5, 3000, 0.3), mk(t('H₂O hấp phụ'), 'gl', 533.3, 1.6, 800, 0.3)];
    const D = 19.8;
    const cuTruth = [
      mk('', 'la', 932.6 + off, 0.95, 2600, 0, { asym: { a: 0.95, b: 2, g: 0.7 }, doublet: { split: D, ratio: 0.5 } }),
      mk('', 'gl', 934.0 + off, 2.9, 3000, 0.3, { doublet: { split: D, ratio: 0.5 } }),
      mk('', 'gl', 941.3 + off, 2.6, 900, 0.3), mk('', 'gl', 943.9 + off, 2.6, 1100, 0.3), mk('', 'gl', 962.4 + off, 3.4, 850, 0.3)];
    const cu = synth('Cu 2p', 926, 968, 0.1, cuTruth, 21000, 55, 3200, 5, 1.5);
    cu.region = [927, 967];
    cu.anchors = [{ x: 947.8, y: null }];
    cu.comps = [
      mk('Cu⁰/Cu⁺ 2p₃/₂', 'la', 932.9, 1.0, 2400, 0, { asym: { a: 0.95, b: 2, g: 0.7 }, fix: { a: true, b: true, g: true }, doublet: { split: D, ratio: 0.5 }, dkind: 'p' }),
      mk('Cu²⁺ 2p₃/₂', 'gl', 934.4, 2.8, 2800, 0.3, { doublet: { split: D, ratio: 0.5 }, dkind: 'p' }),
      mk(t('Vệ tinh 1'), 'gl', 941.6, 2.5, 800, 0.3), mk(t('Vệ tinh 2'), 'gl', 944.2, 2.5, 1000, 0.3), mk(t('Vệ tinh 2p₁/₂'), 'gl', 962.7, 3.2, 800, 0.3)];
    cu.comps.forEach(cp => { if (cp.doublet) { cp.fix.center = false; } });
    [c, o, cu].forEach(s => { s.bgAvg = 10; s.shift = -off; s.calib = { ref: 284.8, line: 'C 1s' }; s.region = s.region.map(v => XPS.round(v - off, 2)); s.anchors.forEach(a => a.x -= off); s.comps.forEach(cp => cp.center -= off); try { XPS.fit(s, 100); } catch (e) { } });
    return [c, o, cu];
  }

  // ======================================================================
  // History (undo/redo) and autosave
  // ======================================================================
  const dataStore = new Map();
  const strip = s => { dataStore.set(s.id, { be: s.be, y: s.y }); const o = Object.assign({}, s); delete o.be; delete o.y; return o; };
  const snapshot = () => JSON.stringify({ cur, spectra: spectra.map(strip) });
  let undoStack = [], redoStack = [], lastSnap = null, commitTimer = null, saveTimer = null;
  function commit(now) {
    clearTimeout(commitTimer);
    const run = () => {
      const snap = snapshot();
      if (snap === lastSnap) return;
      if (lastSnap !== null) { undoStack.push(lastSnap); if (undoStack.length > 60) undoStack.shift(); }
      lastSnap = snap; redoStack = []; syncUndo(); scheduleSave();
    };
    if (now) run(); else commitTimer = setTimeout(run, 250);
  }
  function restore(snap) {
    const o = JSON.parse(snap);
    spectra = o.spectra.map(s => { Object.assign(s, dataStore.get(s.id)); s.comps.forEach(XPS.normComp); return s; });
    cur = Math.min(o.cur, spectra.length - 1);
    lastSnap = snap; renderAll(); syncUndo(); scheduleSave();
  }
  function undo() { if (!undoStack.length) return toast(t('Không còn gì để hoàn tác')); redoStack.push(lastSnap); restore(undoStack.pop()); toast(t('Đã hoàn tác')); }
  function redo() { if (!redoStack.length) return; undoStack.push(lastSnap); restore(redoStack.pop()); toast(t('Đã làm lại')); }
  function syncUndo() { $('mUndo').disabled = !undoStack.length; $('mRedo').disabled = !redoStack.length; }
  function projectJson() { return JSON.stringify({ app: 'XPS Fit Studio', version: XPS.VERSION, saved: new Date().toISOString(), quantOpts, cur, spectra }, (k, v) => k.startsWith('_') ? undefined : v); }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { const j = projectJson(); if (j.length < 4.5e6) ls.set('xpsfit-session', j); }, 800); }
  function loadProject(text, fromFile) {
    const o = JSON.parse(text);
    if (!o || o.app !== 'XPS Fit Studio' || !Array.isArray(o.spectra)) throw new Error(t('File không phải project XPS Fit Studio.'));
    spectra = o.spectra.map(XPS.reviveSpectrum);
    quantOpts = Object.assign({ imfp: 0, src: '' }, o.quantOpts || {});
    cur = spectra.length ? Math.max(0, Math.min(o.cur || 0, spectra.length - 1)) : -1;
    if (fromFile) { undoStack = []; redoStack = []; lastSnap = null; }
    renderAll(); commit(true);
  }

  // ======================================================================
  // Files
  // ======================================================================
  async function loadFiles(files) {
    let added = 0; const errs = [];
    for (const f of files) {
      try {
        if (/\.(xlsx|xlsm|xls|ods)$/i.test(f.name)) {
          const res = await readWorkbook(f);
          if (res.ask) { openPaste(res.ask, f.name); continue; }
          if (!added) spectra = spectra.filter(s => !s.sample);
          res.spectra.forEach(s => spectra.push(s)); added += res.spectra.length;
          continue;
        }
        const text = await f.text();
        if (/\.json$|\.xpsfit$/i.test(f.name) && /"app"\s*:\s*"XPS Fit Studio"/.test(text.slice(0, 200))) { loadProject(text, true); toast(t('Đã mở project {0}', f.name)); continue; }
        const res = XPS.parseAny(text, f.name);
        res.warnings.forEach(w => errs.push(w));
        if (!added) spectra = spectra.filter(s => !s.sample);
        res.spectra.forEach(s => spectra.push(s));
        added += res.spectra.length;
      } catch (e) { errs.push(f.name + ': ' + e.message); }
    }
    if (added) { cur = spectra.length - added; afterStructure(); toast(t('Đã đọc {0} phổ', added) + (errs.length ? t(' (có cảnh báo)') : '')); }
    if (errs.length) setMsg(errs.join('\n'), true);
  }
  // Spreadsheet files: every sheet with a BE column and at least one intensity column becomes spectra.
  // When a sheet has no header and several numeric columns, the paste workbook opens so the columns can be checked.
  async function readWorkbook(f) {
    if (!window.XLSX) throw new Error(t('Thư viện Excel chưa tải xong, thử lại sau giây lát'));
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    const base = f.name.replace(/\.[^.]+$/, ''), out = [];
    let ask = null;
    wb.SheetNames.forEach(sn => {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, blankrows: false, defval: null });
      if (!aoa.length) return;
      try {
        const T = XPS.detectTable(aoa);
        const nY = T.cols.filter(c => c.role === 'y').length;
        if (!T.headerRows && nY > 1 && wb.SheetNames.length === 1) { ask = aoa; return; }
        const nm = wb.SheetNames.length > 1 && !/^(sheet|trang tính)\s*\d*$/i.test(sn) ? sn : base;
        out.push(...XPS.tableToSpectra(T, { name: nm, source: f.name + (wb.SheetNames.length > 1 ? ' · ' + sn : '') }).spectra);
      } catch (e) { if (!ask && wb.SheetNames.length === 1) ask = aoa; }
    });
    return out.length ? { spectra: out } : { ask: ask || [] };
  }

  // ======================================================================
  // Paste workbook
  // ======================================================================
  let pasteAoa = [], pasteT = null, pasteFlip = false, pasteSrc = '';
  const ROLES = [['be', 'BE (eV)'], ['ke', 'KE (eV)'], ['y', 'Cường độ'], ['skip', 'Bỏ qua']];
  function openPaste(aoa, src) {
    pasteAoa = aoa || []; pasteFlip = false; pasteSrc = src || t('Dán từ bảng tính');
    $('pasteText').value = aoa && aoa.length ? aoa.slice(0, 2000).map(r => r.map(c => c === null || c === undefined ? '' : c).join('\t')).join('\n') : '';
    if (src && !$('pName').value) $('pName').value = src.replace(/\.[^.]+$/, '');
    detectPaste(); openDlg('dlgPaste');
    setTimeout(() => { if (!aoa || !aoa.length) $('pasteText').focus(); }, 50);
  }
  function detectPaste(keepRoles) {
    const old = keepRoles && pasteT ? pasteT.cols.map(c => c.role) : null;
    try { pasteT = pasteAoa.length ? XPS.detectTable(pasteAoa, { transpose: pasteFlip ? !XPS.detectTable(pasteAoa).transposed : undefined }) : null; } catch (e) { pasteT = null; }
    if (pasteT && old && old.length === pasteT.cols.length) pasteT.cols.forEach((c, i) => c.role = old[i]);
    renderPaste();
  }
  function renderPaste() {
    const g = $('pasteGrid'); g.innerHTML = '';
    const T = pasteT;
    if (!T || !T.cols.length) { $('pasteInfo').textContent = pasteAoa.length ? t('Không đọc được số liệu.') : ''; $('pasteAdd').disabled = true; Plotly.purge('pastePlot'); $('pastePlot').hidden = true; $('pHv').closest('.field').hidden = true; return; }
    const nRows = Math.max(0, ...T.cols.map(c => c.data.length));
    $('pasteInfo').textContent = t('{0} cột × {1} dòng', T.cols.length, nRows) + (T.transposed ? ' · ' + t('đã đổi hàng thành cột') : '');
    const thead = document.createElement('thead'), r1 = document.createElement('tr'), r2 = document.createElement('tr');
    r1.appendChild(document.createElement('th')); r2.appendChild(document.createElement('th'));
    T.cols.forEach((c, j) => {
      const th = document.createElement('th'), sel = document.createElement('select'); sel.id = 'pc' + j;
      ROLES.forEach(([k, l]) => sel.add(new Option(t(l), k))); sel.value = c.role;
      sel.onchange = () => { c.role = sel.value; renderPaste(); };
      th.appendChild(sel); if (c.role === 'skip') th.className = 'off'; r1.appendChild(th);
      const th2 = document.createElement('th'), inp = document.createElement('input'); inp.type = 'text'; inp.id = 'pl' + j; inp.value = c.label; inp.placeholder = t('cột {0}', j + 1);
      inp.onchange = () => { c.label = inp.value.trim(); renderPaste(); };
      th2.appendChild(inp); if (c.role === 'skip') th2.className = 'off'; r2.appendChild(th2);
    });
    thead.append(r1, r2); g.appendChild(thead);
    const tb = document.createElement('tbody'), show = Math.min(nRows, 6);
    for (let i = 0; i < show; i++) {
      const tr = document.createElement('tr'), rh = document.createElement('td'); rh.className = 'rh'; rh.textContent = i + 1; tr.appendChild(rh);
      T.cols.forEach(c => { const td = document.createElement('td'); td.textContent = c.data[i] ?? ''; if (c.role === 'skip') td.className = 'off'; tr.appendChild(td); });
      tb.appendChild(tr);
    }
    if (nRows > show) { const tr = document.createElement('tr'); tr.className = 'more'; const td = document.createElement('td'); td.colSpan = T.cols.length + 1; td.textContent = t('… và {0} dòng nữa', nRows - show); tr.appendChild(td); tb.appendChild(tr); }
    g.appendChild(tb);
    const hasKE = T.cols.some(c => c.role === 'ke');
    $('pHv').closest('.field').hidden = !hasKE;
    let res = null;
    try { res = XPS.tableToSpectra(T, pasteOpts()); } catch (e) { }
    $('pasteAdd').disabled = !res;
    $('pasteAdd').textContent = res && res.spectra.length > 1 ? t('Thêm {0} phổ vào danh sách', res.spectra.length) : t('Thêm vào danh sách phổ');
    $('pastePlot').hidden = !res;
    if (res) {
      const tr = res.spectra.map((s, k) => ({ x: s.be, y: s.y, name: s.name, mode: 'lines', line: { width: 1.4, color: PAL[k % PAL.length] } }));
      const ink = css('--plot-ink'), grid = css('--plot-grid');
      Plotly.react('pastePlot', tr, { margin: { l: 56, r: 10, t: 8, b: 36 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: css('--plot-bg'), font: { family: css('--f-ui'), size: 11, color: ink },
        xaxis: { autorange: 'reversed', title: { text: 'Binding energy (eV)' }, gridcolor: grid, showline: true, mirror: true, linecolor: ink }, yaxis: { gridcolor: grid, showline: true, mirror: true, linecolor: ink, exponentformat: 'power' },
        showlegend: res.spectra.length > 1, legend: { orientation: 'h', y: 1.02, yanchor: 'bottom' } }, { displayModeBar: false, responsive: true });
    } else Plotly.purge('pastePlot');
  }
  function pasteOpts() {
    const a = parseFloat($('pAcq').value);
    return { name: $('pName').value.trim() || pasteSrc.replace(/\.[^.]+$/, '') || 'Spectrum', source: pasteSrc, unit: $('pUnit').value || null, acq: a > 0 ? a : null, hv: parseFloat($('pHv').value) || 1486.6 };
  }
  let pasteTimer = null;
  on('pasteText', 'input', () => { clearTimeout(pasteTimer); pasteTimer = setTimeout(() => { pasteAoa = XPS.textToAoa($('pasteText').value); if (pasteSrc === t('Dán từ bảng tính') || !pasteSrc) pasteSrc = t('Dán từ bảng tính'); detectPaste(); }, 200); });
  on('pasteFlip', 'click', () => { pasteFlip = !pasteFlip; detectPaste(); });
  on('pasteClear', 'click', () => { $('pasteText').value = ''; pasteAoa = []; pasteT = null; renderPaste(); $('pasteText').focus(); });
  ['pName', 'pUnit', 'pAcq', 'pHv'].forEach(id => on(id, 'change', renderPaste));
  on('pasteOpenFile', 'click', () => $('pasteFile').click());
  on('pasteFile', 'change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      let aoa;
      if (/\.(xlsx|xlsm|xls|ods)$/i.test(f.name)) { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, blankrows: false, defval: null }); }
      else aoa = XPS.textToAoa(await f.text());
      pasteSrc = f.name; if (!$('pName').value) $('pName').value = f.name.replace(/\.[^.]+$/, '');
      pasteAoa = aoa; $('pasteText').value = aoa.slice(0, 2000).map(r => r.map(c => c ?? '').join('\t')).join('\n'); pasteFlip = false; detectPaste();
    } catch (err) { $('pasteInfo').textContent = err.message; }
  });
  on('pasteAdd', 'click', () => {
    try {
      const res = XPS.tableToSpectra(pasteT, pasteOpts());
      spectra = spectra.filter(s => !s.sample);
      res.spectra.forEach(s => spectra.push(s));
      cur = spectra.length - res.spectra.length; afterStructure();
      $('dlgPaste').close(); toast(t('Đã đọc {0} phổ', res.spectra.length));
      $('pName').value = ''; $('pasteText').value = ''; pasteAoa = []; pasteT = null;
    } catch (e) { $('pasteInfo').textContent = e.message; }
  });
  on('mPaste', 'click', () => openPaste(null)); on('openPaste', 'click', () => openPaste(null));

  async function saveFile(filename, data, mime) {
    if (window.claude && typeof window.claude.use === 'function') {
      let dl = null;
      try { dl = await window.claude.use('downloads'); } catch (e) { }
      if (dl) {
        try { await dl.save({ filename, data }); toast(t('Đã lưu {0}', filename)); }
        catch (e) { if (e && e.code !== 'declined') toast(t('Không lưu được file: {0}', e.message || e.code)); }
        return;
      }
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(t('Đã lưu {0}', filename));
  }
  const safeName = s => (s || 'XPS').replace(/[^\w\-.]+/g, '_').replace(/_+/g, '_');

  // ======================================================================
  // Rendering
  // ======================================================================
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  const fx = (v, d) => Number.isFinite(v) ? +v.toFixed(d) : '';
  function fmt(v) { if (!Number.isFinite(v)) return '—'; return Math.abs(v) >= 1e5 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(3) : (+v.toPrecision(5)).toString(); }
  function fmtErr(v, ref) { if (!Number.isFinite(v)) return ''; const d = v > 0 ? Math.max(0, Math.min(4, 1 - Math.floor(Math.log10(v)))) : 2; return '± ' + v.toFixed(d); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const unitLabel = s => s.unit === 'cps' ? 'Intensity (counts s⁻¹)' : s.unit === 'counts' ? 'Intensity (counts)' : 'Intensity (a.u.)';

  function renderAll() { renderList(); renderControls(); renderChart(); renderResults(); renderQuant(); syncModes(); $('specCount').textContent = spectra.length; }
  function afterEdit() { renderChart(); renderResults(); renderQuant(); renderPeakErrors(); commit(); }
  function afterStructure() { renderAll(); commit(true); }

  function renderList() {
    const ul = $('speclist'); ul.innerHTML = '';
    spectra.forEach((s, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.className = 'item'; b.setAttribute('aria-current', i === cur ? 'true' : 'false');
      const nm = document.createElement('span'); nm.className = 'nm';
      const dot = document.createElement('span'); dot.className = 'dot' + (s.comps.length ? ' fit' : ''); dot.title = s.comps.length ? t('Đã có peak') : t('Chưa có peak');
      nm.append(dot, document.createTextNode(s.name));
      if (s.sample) { const tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = t('mẫu'); nm.appendChild(tg); }
      const src = document.createElement('span'); src.className = 'src';
      src.textContent = s.source + ' · ' + XPS.round(s.be[0] + s.shift, 1) + '–' + XPS.round(s.be[s.be.length - 1] + s.shift, 1) + ' eV';
      b.append(nm, src); b.onclick = () => select(i);
      const del = document.createElement('button'); del.className = 'del'; del.textContent = '×'; del.title = t('Xoá phổ này');
      del.onclick = e => { e.stopPropagation(); spectra.splice(i, 1); cur = Math.min(cur, spectra.length - 1); afterStructure(); };
      li.append(b, del); ul.appendChild(li);
    });
    if (!spectra.length) { const li = document.createElement('li'); li.className = 'hint'; li.textContent = t('Chưa có phổ. Mở file hoặc thêm dữ liệu mẫu.'); ul.appendChild(li); }
    const dl = $('meta'); dl.innerHTML = '';
    if (S()) for (const [k, v] of Object.entries(S().meta || {})) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = t(k); dd.textContent = v; dl.append(dt, dd);
    }
  }
  function select(i) { cur = i; setMsg(''); renderAll(); commit(); }

  function renderControls() {
    const s = S(), has = !!s;
    document.querySelectorAll('.toolsp input, .toolsp select, .toolsp button:not(.tab), .tools-row button').forEach(el => { if (!['methodsAll', 'imfp', 'rsfSrc', 'expFmt', 'expScope', 'doExport', 'defShape'].includes(el.id)) el.disabled = !has; });
    if (!has) { $('specTitle').textContent = t('Chưa có phổ'); $('peaks').innerHTML = ''; $('anchorList').innerHTML = ''; return; }
    $('specTitle').innerHTML = esc(s.name) + '<small>' + esc(s.source) + '</small>';
    $('sName').value = s.name; $('sHv').value = s.hv ?? 1486.6; $('sUnit').value = s.unit; $('sAcq').value = s.acq ?? '';
    $('sAcq').disabled = s.unit === 'au';
    $('shift').value = XPS.round(s.shift, 3);
    if (s.calib) { $('cRef').value = s.calib.ref; $('cLine').value = s.calib.line || 'C 1s'; }
    $('rLo').value = Math.min(...s.region); $('rHi').value = Math.max(...s.region);
    $('bgType').value = s.bgType; $('bgAvg').value = s.bgAvg; $('shareFwhm').checked = s.shareFwhm;
    $('imfp').value = String(quantOpts.imfp); $('rsfSrc').value = quantOpts.src || ''; $('defShape').value = defShape;
    renderAnchors(); renderPeaks();
  }

  function renderAnchors() {
    const box = $('anchorList'), s = S(); box.innerHTML = '';
    const list = (s.anchors || []).map((a, i) => ({ a, i })).sort((p, q) => q.a.x - p.a.x);
    if (!list.length) { const h = document.createElement('span'); h.className = 'hint'; h.textContent = t('Chưa có điểm neo: nền tính một đoạn cho cả vùng.'); box.appendChild(h); }
    list.forEach(({ a, i }) => {
      const manual = a.y !== null && a.y !== undefined;
      const b = document.createElement('button'); b.className = 'chip' + (manual ? ' manual' : ''); b.title = t('Xoá điểm neo này');
      b.textContent = a.x.toFixed(2) + ' eV' + (manual ? ' · ' + t('mức tay') : '') + ' ×';
      b.onclick = () => { s.anchors.splice(i, 1); renderAnchors(); afterEdit(); };
      box.appendChild(b);
    });
    const me = (s.endY || []).filter(v => v !== null && v !== undefined).length;
    if (me) { const h = document.createElement('span'); h.className = 'hint'; h.textContent = t('{0} điểm mút đang dùng mức tay', me); box.appendChild(h); }
  }

  // ---------- peak cards ----------
  function renderPeaks() {
    const s = S(), box = $('peaks'); box.innerHTML = '';
    s.comps.forEach((cp, i) => {
      XPS.normComp(cp);
      const card = document.createElement('div'); card.className = 'pcard'; card.style.setProperty('--pc', PAL[i % PAL.length]);
      const head = document.createElement('div'); head.className = 'phead';
      const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = PAL[i % PAL.length];
      const inp = (type, val, step, onch, key) => {
        const e = document.createElement('input'); e.type = type; e.value = val; e.id = 'pk' + i + '_' + key; if (step) e.step = step;
        e.addEventListener('change', () => { onch(e.value); afterEdit(); }); return e;
      };
      const nm = inp('text', cp.name, null, v => { cp.name = v; renderResults(); }, 'name'); nm.className = 'pname'; nm.setAttribute('aria-label', t('Tên peak'));
      const shp = document.createElement('select'); shp.id = 'pk' + i + '_shape'; shp.setAttribute('aria-label', t('Dạng peak'));
      [['gl', t('GL tích')], ['sgl', t('GL tổng')], ['la', t('LA bất đối xứng')]].forEach(([k, l]) => shp.add(new Option(l, k)));
      shp.value = cp.shape;
      shp.onchange = () => { cp.shape = shp.value; if (cp.shape === 'la') cp.fix.mix = false; afterEdit(); renderPeaks(); };
      const dsel = document.createElement('select'); dsel.id = 'pk' + i + '_d'; dsel.setAttribute('aria-label', 'Doublet');
      DOUBLETS.forEach(([k, l]) => dsel.add(new Option(k ? l : t(l), k)));
      const og = document.createElement('optgroup'); og.label = t('Mẫu sẵn');
      SPLITS.forEach(([el, k, sp]) => og.appendChild(new Option(el + ' (Δ ' + sp + ')', 'preset:' + el)));
      dsel.appendChild(og); dsel.value = cp.dkind || (cp.doublet ? 'p' : '');
      dsel.onchange = () => {
        let k = dsel.value, split = cp.doublet ? cp.doublet.split : 1.0;
        if (k.startsWith('preset:')) { const p = SPLITS.find(q => q[0] === k.slice(7)); k = p[1]; split = p[2]; }
        const d = DOUBLETS.find(q => q[0] === k);
        cp.dkind = k; cp.doublet = d[2] === null ? null : { split, ratio: d[2] };
        afterEdit(); renderPeaks();
      };
      const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = t('Xoá peak');
      x.onclick = () => { s.comps.splice(i, 1); afterEdit(); renderPeaks(); renderList(); };
      const r2 = document.createElement('div'); r2.className = 'phead2'; r2.append(shp, dsel); head.append(sw, nm, x);
      const grid = document.createElement('div'); grid.className = 'pgrid';
      const field = (label, input, lockKey, errKey) => {
        const f = document.createElement('div'); f.className = 'pf';
        const top = document.createElement('div'); top.className = 'pfl';
        const l = document.createElement('label'); l.htmlFor = input.id; l.textContent = label; top.appendChild(l);
        if (lockKey) {
          const lk = document.createElement('label'); lk.className = 'lock'; lk.title = t('Giữ cố định khi khớp');
          const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!cp.fix[lockKey]; c.id = 'pk' + i + '_f' + lockKey;
          c.onchange = () => { cp.fix[lockKey] = c.checked; afterEdit(); };
          lk.append(c, document.createTextNode(t('khoá'))); top.appendChild(lk);
        }
        const er = document.createElement('div'); er.className = 'err'; if (errKey) er.dataset.err = i + '.' + errKey;
        f.append(top, input, er); grid.appendChild(f);
      };
      field('BE (eV)', inp('number', fx(cp.center, 3), '0.05', v => cp.center = +v, 'c'), 'center', 'center');
      const fw = inp('number', fx(cp.fwhm, 3), '0.05', v => { cp.fwhm = Math.max(0.05, +v); if (s.shareFwhm) s.comps.forEach(c => c.fwhm = cp.fwhm); }, 'w');
      if (s.shareFwhm && i > 0) fw.disabled = true;
      field(cp.shape === 'la' ? t('Độ rộng L (eV)') : 'FWHM (eV)', fw, 'fwhm', 'fwhm');
      field(t('Chiều cao'), inp('number', fx(cp.height, 1), '10', v => cp.height = Math.max(0, +v), 'h'), 'height', 'height');
      if (cp.shape === 'la') {
        field('α ' + t('(đuôi BE cao)'), inp('number', fx(cp.asym.a, 3), '0.05', v => cp.asym.a = Math.max(0.51, +v), 'a'), 'a', 'a');
        field('β ' + t('(phía BE thấp)'), inp('number', fx(cp.asym.b, 3), '0.05', v => cp.asym.b = Math.max(0.51, +v), 'b'), 'b', 'b');
        field('G ' + t('Gauss (eV)'), inp('number', fx(cp.asym.g, 3), '0.05', v => cp.asym.g = Math.max(0.01, +v), 'g'), 'g', 'g');
      } else field('L (%)', inp('number', fx(cp.mix * 100, 1), '5', v => cp.mix = Math.min(1, Math.max(0, +v / 100)), 'm'), 'mix', 'mix');
      if (cp.doublet) {
        field('ΔE doublet (eV)', inp('number', cp.doublet.split, '0.01', v => cp.doublet.split = +v, 'ds'));
        field(t('Tỉ lệ diện tích'), inp('number', cp.doublet.ratio, '0.01', v => cp.doublet.ratio = Math.max(0, +v), 'dr'));
      }
      card.append(head, r2, grid); box.appendChild(card);
    });
    if (!s.comps.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = t('Chưa có peak. Bấm "+ Thêm peak" hoặc bật "+ Peak bằng cú bấm" rồi bấm lên đỉnh phổ.'); box.appendChild(p); }
    renderPeakErrors();
  }
  function renderPeakErrors() {
    const s = S(); if (!s) return;
    const fe = XPS.fitErrors(s);
    document.querySelectorAll('#peaks [data-err]').forEach(el => {
      const v = fe ? fe.sig[el.dataset.err] : undefined;
      const key = el.dataset.err.split('.')[1];
      el.textContent = Number.isFinite(v) ? fmtErr(key === 'mix' ? v * 100 : v) : '';
    });
  }

  // ---------- chart ----------
  function bgAt(xs, bg, v) {
    if (v <= xs[0]) return bg[0];
    if (v >= xs[xs.length - 1]) return bg[bg.length - 1];
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= v) lo = m; else hi = m; }
    return bg[lo] + (v - xs[lo]) / (xs[hi] - xs[lo]) * (bg[hi] - bg[lo]);
  }
  function buildFigure(s, print) {
    const x = XPS.xOf(s), B = XPS.background(s, x);
    const C = print
      ? { ink: '#000000', grid: 'rgba(0,0,0,0)', bg: '#ffffff', data: '#222222', bgl: '#555555', env: '#c0304a', muted: '#555555', font: 'Arial, Helvetica, sans-serif' }
      : { ink: css('--plot-ink'), grid: css('--plot-grid'), bg: css('--plot-bg'), data: css('--data'), bgl: css('--bgline'), env: css('--env'), muted: css('--muted'), font: css('--f-ui') };
    const loR = Math.min(...s.region), hiR = Math.max(...s.region);
    const tr = [{
      x, y: s.y, name: print ? 'Data' : t('Dữ liệu'), mode: 'markers', type: 'scatter',
      marker: print ? { size: 5, color: 'rgba(0,0,0,0)', line: { color: C.data, width: 0.9 }, symbol: 'circle' } : { size: 3.6, color: x.map(v => v >= loR && v <= hiR ? C.data : C.bgl), opacity: 0.9 },
      hovertemplate: '%{x:.2f} eV<br>%{y:.0f}<extra></extra>'
    }];
    let st = null;
    if (B) {
      const xs = x.slice(B.i0, B.i1 + 1);
      if (s.comps.length) {
        const env = B.bg.slice();
        s.comps.forEach((cp, ci) => {
          const yc = xs.map(xx => XPS.compCurve(cp, xx));
          yc.forEach((v, i) => env[i] += v);
          const col = PAL[ci % PAL.length];
          tr.push({ x: xs.concat(xs.slice().reverse()), y: yc.map((v, i) => v + B.bg[i]).concat(B.bg.slice().reverse()),
            name: cp.name || ('Peak ' + (ci + 1)), mode: 'lines', fill: 'toself', fillcolor: col + (print ? '55' : '40'), line: { color: col, width: 1.3 }, hoverinfo: 'skip' });
        });
        tr.push({ x: xs, y: B.bg, name: print ? 'Background' : t('Nền'), mode: 'lines', line: { color: C.bgl, dash: 'dash', width: 1.3 }, hoverinfo: 'skip' });
        tr.push({ x: xs, y: env, name: print ? 'Envelope' : t('Tổng (envelope)'), mode: 'lines', line: { color: C.env, width: 2 }, hoverinfo: 'skip' });
        st = XPS.stats(s);
        if (st && !print) tr.push({ x: xs, y: st.residuals, name: t('Phần dư'), mode: 'lines', line: { color: C.muted, width: 1 }, yaxis: 'y2', hoverinfo: 'skip', showlegend: false });
      } else tr.push({ x: xs, y: B.bg, name: print ? 'Background' : t('Nền'), mode: 'lines', line: { color: C.bgl, dash: 'dash', width: 1.3 }, hoverinfo: 'skip' });
    }
    const showRes = !!st && !print;
    const ax = { showline: true, mirror: 'ticks', linecolor: C.ink, linewidth: print ? 1.4 : 1, ticks: 'inside', ticklen: 5, tickcolor: C.ink, zeroline: false, gridcolor: C.grid, showgrid: !print,
      minor: { ticks: 'inside', ticklen: 3, tickcolor: C.ink, showgrid: false } };
    const layout = {
      margin: print ? { l: 96, r: 24, t: 20, b: 70 } : { l: 64, r: 14, t: 6, b: 46 },
      paper_bgcolor: print ? '#ffffff' : 'rgba(0,0,0,0)', plot_bgcolor: C.bg,
      font: { family: C.font, color: C.ink, size: print ? 17 : 12 },
      xaxis: Object.assign({}, ax, { title: { text: 'Binding energy (eV)', standoff: print ? 12 : 4 }, autorange: 'reversed', anchor: showRes ? 'y2' : 'y' }),
      yaxis: Object.assign({}, ax, { title: { text: unitLabel(s), standoff: print ? 14 : 6 }, domain: showRes ? [0.22, 1] : [0, 1], exponentformat: print ? 'none' : 'power', separatethousands: !!print, automargin: true }),
      yaxis2: Object.assign({}, ax, { domain: [0, 0.16], title: { text: t('Dư'), font: { size: 11 } }, visible: showRes, zeroline: true, zerolinecolor: C.muted, nticks: 3 }),
      legend: print ? { x: 1.02, y: 1, xanchor: 'left', yanchor: 'top', bgcolor: 'rgba(255,255,255,0)', font: { size: 15 }, tracegroupgap: 2 } : { orientation: 'h', y: 1.0, yanchor: 'bottom', x: 0, font: { size: 11 } },
      hovermode: 'closest', showlegend: true
    };
    return { tr, layout, B, x };
  }
  function renderChart() {
    const s = S(); if (!window.Plotly) return;
    if (!s) { Plotly.purge('chart'); hooked = false; return; }
    const { tr, layout, B, x } = buildFigure(s, false);
    knotMeta = B && s.bgType !== 'none' && curTab === 'bg' ? B.knots.slice() : [];
    const acc = css('--accent'), pan = css('--panel');
    const shapes = knotMeta.map(k => ({ type: 'circle', xref: 'x', yref: 'y', xsizemode: 'pixel', ysizemode: 'pixel', xanchor: k.x, yanchor: k.y, x0: -7, x1: 7, y0: -7, y1: 7, fillcolor: k.manual ? acc : pan, line: { color: acc, width: 2 }, layer: 'above' }));
    if (B && showHandles && curTab === 'peaks' && s.comps.length) {
      const xsB = x.slice(B.i0, B.i1 + 1);
      s.comps.forEach((cp, ci) => {
        const col = PAL[ci % PAL.length], xh = cp.center - cp.fwhm / 2;
        knotMeta.push({ kind: 'apex', ci }); knotMeta.push({ kind: 'fwhm', ci });
        shapes.push({ type: 'circle', xref: 'x', yref: 'y', xsizemode: 'pixel', ysizemode: 'pixel', xanchor: cp.center, yanchor: bgAt(xsB, B.bg, cp.center) + XPS.mainLineAt(cp, cp.center), x0: -7, x1: 7, y0: -7, y1: 7, fillcolor: col, line: { color: pan, width: 2 }, layer: 'above' });
        shapes.push({ type: 'rect', xref: 'x', yref: 'y', xsizemode: 'pixel', ysizemode: 'pixel', xanchor: xh, yanchor: bgAt(xsB, B.bg, xh) + XPS.mainLineAt(cp, xh), x0: -4, x1: 4, y0: -9, y1: 9, fillcolor: pan, line: { color: col, width: 2 }, layer: 'above' });
      });
    }
    layout.shapes = shapes;
    layout.dragmode = selectMode ? 'select' : 'zoom'; layout.selectdirection = 'h'; layout.uirevision = s.id;
    Plotly.react('chart', tr, layout, { responsive: true, displaylogo: false, edits: { shapePosition: true }, modeBarButtonsToRemove: ['lasso2d', 'autoScale2d', 'toImage'] });
    if (!hooked && typeof $('chart').on === 'function') { hooked = true; hookChart(); }
  }
  let hooked = false;

  // ---------- results ----------
  function renderResults() {
    const s = S(), box = $('stats'), tb = $('resTable');
    box.innerHTML = ''; tb.innerHTML = '';
    $('methods').value = methods();
    if (!s) return;
    const st = s.comps.length ? XPS.stats(s) : null;
    if (!st) { box.innerHTML = '<div class="hint">' + esc(t('Thêm peak và bấm "Khớp phổ" để có χ², sai số và diện tích.')) + '</div>'; return; }
    const cls = st.redChi2 < 0.8 ? 'warn' : st.redChi2 <= 2 ? 'good' : st.redChi2 <= 5 ? 'warn' : 'bad';
    [['χ² ' + t('rút gọn'), st.redChi2.toFixed(3), cls], ['χ²', fmt(st.chi2), ''], ['R²', st.r2.toFixed(5), ''], ['RMSE', fmt(st.rmse), ''], ['N / p', st.n + ' / ' + st.nFree, '']]
      .forEach(([k, v, c]) => { const d = document.createElement('div'); d.className = 'stat ' + c; d.innerHTML = '<div class="k"></div><div class="v"></div>'; d.children[0].textContent = k; d.children[1].textContent = v; box.appendChild(d); });
    const fe = XPS.fitErrors(s);
    const areas = s.comps.map(cp => XPS.compArea(s, cp)), tot = areas.reduce((a, v) => a + v, 0);
    let h = '<thead><tr><th>Peak</th><th>BE (eV)</th><th>' + esc(t('FWHM đo (eV)')) + '</th><th>' + esc(t('Diện tích')) + '</th><th>%</th></tr></thead><tbody>';
    s.comps.forEach((cp, i) => {
      const eb = fe ? fe.sig[i + '.center'] : NaN, ea = fe ? fe.areaSig[i] : NaN;
      h += '<tr><td><span class="sw" style="background:' + PAL[i % PAL.length] + '"></span> ' + esc(cp.name || 'Peak ' + (i + 1)) + '<br><span class="pm num">' + esc(XPS.shapeLabel(cp)) + (cp.doublet ? ' · + ' + (cp.center + cp.doublet.split).toFixed(2) + ' eV' : '') + '</span>' +
        '</td><td class="num">' + cp.center.toFixed(2) + (Number.isFinite(eb) ? ' <span class="pm">' + fmtErr(eb) + '</span>' : '') +
        '</td><td class="num">' + XPS.measuredFwhm(cp).toFixed(2) + '</td><td class="num">' + fmt(areas[i]) + (Number.isFinite(ea) ? ' <span class="pm">± ' + fmt(ea) + '</span>' : '') +
        '</td><td class="num">' + (100 * areas[i] / tot).toFixed(1) + '</td></tr>';
    });
    tb.innerHTML = h + '</tbody>';
    if (!fe) { const tr = document.createElement('caption'); tr.className = 'hint'; tr.style.captionSide = 'bottom'; tr.style.textAlign = 'left'; tr.style.paddingTop = '6px'; tr.textContent = t('Sai số sẽ hiện sau khi bấm "Khớp phổ" (thông số đã đổi sau lần khớp gần nhất).'); tb.appendChild(tr); }
  }
  function methods() {
    const list = $('methodsAll').checked ? spectra.filter(s => s.comps.length) : (S() ? [S()] : []);
    if (!list.length) return t('Chưa có phổ nào được khớp.');
    const qn = spectra.filter(s => s.quantOn).length;
    return XPS.methodsText(list, { quant: qn >= 2, imfpExp: quantOpts.imfp, rsfSource: quantOpts.src ? quantOpts.src + ' sensitivity factors' : null });
  }

  // ---------- quantification ----------
  function renderQuant() {
    const tb = $('quantTable'), tc = $('quantComps'), note = $('quantNote');
    tb.innerHTML = ''; tc.innerHTML = ''; note.innerHTML = '';
    if (!spectra.length) return;
    const on = spectra.filter(s => s.quantOn);
    const rows = XPS.quantify(on, { imfpExp: quantOpts.imfp });
    const byId = new Map(rows.map(r => [r.s.id, r]));
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th></th><th class="l">' + esc(t('Vùng')) + '</th><th class="l">' + esc(t('Mức lõi (RSF)')) + '</th><th>RSF</th><th>' + esc(t('Diện tích (cps·eV)')) + '</th><th>at.%</th></tr>';
    tb.appendChild(thead);
    const body = document.createElement('tbody');
    const keys = Object.keys(XPS.RSF);
    spectra.forEach((s, i) => {
      const r = byId.get(s.id), tr = document.createElement('tr');
      const c0 = document.createElement('td'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = s.quantOn !== false; cb.id = 'q' + i + '_on';
      cb.onchange = () => { s.quantOn = cb.checked; renderQuant(); renderResults(); commit(); }; c0.appendChild(cb);
      const c1 = document.createElement('td'); c1.className = 'l'; c1.textContent = s.name;
      const c2 = document.createElement('td'); c2.className = 'l';
      const sel = document.createElement('select'); sel.id = 'q' + i + '_k';
      const g = XPS.guessRsfKey(s);
      sel.add(new Option(t('Tự động') + (g ? ': ' + g : ''), ''));
      keys.forEach(k => sel.add(new Option(k, k)));
      sel.add(new Option(t('Tự nhập'), 'custom'));
      sel.value = s.rsfKey || '';
      sel.onchange = () => { s.rsfKey = sel.value || null; if (s.rsfKey !== 'custom') s.rsf = null; renderQuant(); renderResults(); commit(); };
      c2.appendChild(sel);
      const c3 = document.createElement('td'), ni = document.createElement('input'); ni.type = 'number'; ni.step = '0.01'; ni.id = 'q' + i + '_r';
      ni.value = r && r.rsf ? r.rsf : (s.rsf ?? '');
      ni.onchange = () => { const v = parseFloat(ni.value); s.rsf = v > 0 ? v : null; s.rsfKey = v > 0 ? 'custom' : null; renderQuant(); renderResults(); commit(); };
      c3.appendChild(ni);
      const c4 = document.createElement('td'); c4.className = 'num'; c4.textContent = r && r.ok ? fmt(r.I) : '—';
      const c5 = document.createElement('td'); c5.className = 'num'; c5.style.fontWeight = '600'; c5.textContent = r && r.at !== null && r.at !== undefined ? r.at.toFixed(1) : '—';
      tr.append(c0, c1, c2, c3, c4, c5); body.appendChild(tr);
    });
    tb.appendChild(body);
    const warns = [];
    if (on.some(s => s.unit === 'au')) warns.push(t('Có vùng ở đơn vị a.u.: chỉ so sánh được khi mọi vùng đo cùng điều kiện.'));
    if (on.some(s => s.unit === 'counts' && !(s.acq > 0))) warns.push(t('Có vùng ở đơn vị counts nhưng chưa có thời gian thu; diện tích chưa quy về cps.'));
    if (on.some(s => !s.comps.length)) warns.push(t('Vùng chưa có peak dùng tích phân dữ liệu sau trừ nền.'));
    if (rows.some(r => !r.rsf)) warns.push(t('Có vùng chưa có RSF; hãy chọn mức lõi hoặc tự nhập.'));
    if (on.length < 2) warns.push(t('Cần ít nhất hai vùng để tính % nguyên tử.'));
    warns.forEach(w => { const d = document.createElement('div'); d.className = 'note warn'; d.textContent = w; note.appendChild(d); });
    const comps = rows.filter(r => r.comps.length);
    if (comps.length && on.length >= 2) {
      let h = '<thead><tr><th class="l">' + esc(t('Thành phần')) + '</th><th class="l">' + esc(t('Vùng')) + '</th><th>at.%</th><th>' + esc(t('% trong vùng')) + '</th></tr></thead><tbody>';
      comps.forEach(r => r.comps.forEach((c, i) => { h += '<tr><td class="l"><span class="sw" style="background:' + PAL[i % PAL.length] + '"></span> ' + esc(c.name || 'Peak ' + (i + 1)) + '</td><td class="l">' + esc(r.s.name) + '</td><td class="num">' + c.at.toFixed(2) + '</td><td class="num">' + (100 * r.R.areas[i] / r.R.total).toFixed(1) + '</td></tr>'; }));
      tc.innerHTML = h + '</tbody>';
    }
  }

  // ======================================================================
  // Controls
  // ======================================================================
  on('sName', 'change', e => { S().name = e.target.value.trim() || S().name; renderList(); renderControls(); afterEdit(); });
  on('sHv', 'change', e => { S().hv = +e.target.value || 1486.6; afterEdit(); });
  on('sUnit', 'change', e => { S().unit = e.target.value; $('sAcq').disabled = S().unit === 'au'; if (S().fit) S().fit = null; afterEdit(); renderPeakErrors(); });
  on('sAcq', 'change', e => { const v = parseFloat(e.target.value); S().acq = v > 0 ? v : null; afterEdit(); });
  function moveShift(s, d) {
    s.region = s.region.map(v => XPS.round(v + d, 3));
    s.anchors = (s.anchors || []).map(a => ({ x: XPS.round((a.x ?? a) + d, 3), y: a.y ?? null }));
    s.comps.forEach(c => c.center += d);
  }
  on('shift', 'change', e => { const s = S(), nv = +e.target.value || 0; moveShift(s, nv - s.shift); s.shift = nv; s.calib = null; renderList(); renderControls(); afterEdit(); });
  on('shiftAll', 'click', () => {
    const src = S();
    spectra.forEach(s => { if (s !== src) { moveShift(s, src.shift - s.shift); s.shift = src.shift; s.calib = src.calib ? Object.assign({}, src.calib) : null; } });
    renderList(); afterEdit(); toast(t('Đã dùng độ dịch {0} eV cho {1} phổ', src.shift, spectra.length));
  });
  on('calib', 'click', () => {
    const m = parseFloat($('cMeas').value), r = parseFloat($('cRef').value);
    if (!isFinite(m) || !isFinite(r)) return toast(t('Nhập vị trí đỉnh đo được và giá trị chuẩn'));
    const s = S(), nv = XPS.round(r - (m - s.shift), 3);
    moveShift(s, nv - s.shift); s.shift = nv; s.calib = { ref: r, line: $('cLine').value.trim() || 'C 1s' };
    renderList(); renderControls(); afterEdit(); toast(t('Độ dịch = {0} eV', nv));
  });
  on('fromPeak', 'click', () => { const s = S(); if (!s.comps.length) return toast(t('Phổ này chưa có peak')); $('cMeas').value = s.comps[0].center.toFixed(3); });
  ['rLo', 'rHi'].forEach(id => on(id, 'change', () => { S().region = [+$('rLo').value, +$('rHi').value]; afterEdit(); }));
  on('bgType', 'change', e => { S().bgType = e.target.value; afterEdit(); });
  on('bgAvg', 'change', e => { S().bgAvg = Math.max(1, Math.min(30, +e.target.value || 1)); afterEdit(); });
  on('shareFwhm', 'change', e => { const s = S(); s.shareFwhm = e.target.checked; if (s.shareFwhm && s.comps.length) s.comps.forEach(c => c.fwhm = s.comps[0].fwhm); afterEdit(); renderPeaks(); });
  on('defShape', 'change', e => { defShape = e.target.value; ls.set('xpsfit-shape', defShape); });
  on('imfp', 'change', e => { quantOpts.imfp = +e.target.value; renderQuant(); renderResults(); commit(); });
  on('rsfSrc', 'change', e => { quantOpts.src = e.target.value.trim(); renderResults(); commit(); });
  on('methodsAll', 'change', () => { $('methods').value = methods(); });

  function addPeakAt(center) {
    const s = S(), x = XPS.xOf(s), B = XPS.background(s, x);
    let h = 1000;
    if (B) {
      let best = B.i0; for (let i = B.i0; i <= B.i1; i++) if (Math.abs(x[i] - center) < Math.abs(x[best] - center)) best = i;
      const existing = s.comps.reduce((a, cp) => a + XPS.compCurve(cp, x[best]), 0);
      h = Math.max(1, (s.y[best] - B.bg[best - B.i0] - existing) * 0.9);
    }
    const w = s.shareFwhm && s.comps.length ? s.comps[0].fwhm : (defShape === 'la' ? 0.9 : 1.4);
    s.comps.push(mk('Peak ' + (s.comps.length + 1), defShape, XPS.round(center, 2), w, XPS.round(h, 0), 0.3));
    afterEdit(); renderPeaks(); renderList();
  }
  on('addPeak', 'click', () => {
    const s = S(), x = XPS.xOf(s), B = XPS.background(s, x);
    if (!B) return toast(t('Chọn vùng phân tích trước'));
    let best = B.i0, bv = -Infinity;
    for (let i = B.i0; i <= B.i1; i++) { const v = s.y[i] - B.bg[i - B.i0] - s.comps.reduce((a, cp) => a + XPS.compCurve(cp, x[i]), 0); if (v > bv) { bv = v; best = i; } }
    addPeakAt(x[best]);
  });
  on('clearPeaks', 'click', () => { S().comps = []; S().fit = null; afterEdit(); renderPeaks(); renderList(); });
  function doFit() {
    const s = S(); if (!s) return;
    try {
      const t0 = performance.now(), st = XPS.fit(s);
      setMsg(t('Đã khớp sau {0} vòng lặp ({1} ms). χ² rút gọn = {2}', s.fit.iterations, Math.round(performance.now() - t0), st.redChi2.toFixed(3)) + (s.fit.converged ? '' : t(' — chưa hội tụ hẳn, bấm Khớp lại.')));
      renderPeaks(); renderChart(); renderResults(); renderQuant(); renderList(); commit(true);
    } catch (e) { setMsg(e.message, true); }
  }
  on('doFit', 'click', doFit);

  // modes
  on('btnAddMode', 'click', () => { addMode = !addMode; selectMode = anchorMode = false; syncModes(); });
  on('btnSelect', 'click', () => { selectMode = !selectMode; addMode = anchorMode = false; syncModes(); renderChart(); });
  const toggleAnchor = () => { anchorMode = !anchorMode; addMode = selectMode = false; syncModes(); renderChart(); };
  on('btnAnchor', 'click', toggleAnchor); on('btnAnchor2', 'click', toggleAnchor);
  on('btnHandles', 'click', () => { showHandles = !showHandles; syncModes(); renderChart(); });
  on('clearAnchors', 'click', () => { S().anchors = []; renderAnchors(); afterEdit(); });
  on('autoLevels', 'click', () => { const s = S(); s.anchors = s.anchors.map(a => ({ x: a.x, y: null })); s.endY = [null, null]; renderAnchors(); afterEdit(); toast(t('Mức nền đã về trung bình dữ liệu')); });
  function addAnchor(be) {
    const s = S(), lo = Math.min(...s.region), hi = Math.max(...s.region);
    if (be <= lo || be >= hi) return toast(t('Điểm neo phải nằm trong vùng phân tích'));
    s.anchors.push({ x: XPS.round(be, 2), y: null }); renderAnchors(); afterEdit();
  }
  function syncModes() {
    $('btnAddMode').classList.toggle('on', addMode); $('btnSelect').classList.toggle('on', selectMode);
    $('btnAnchor').classList.toggle('on', anchorMode); $('btnAnchor2').classList.toggle('on', anchorMode);
    $('btnHandles').classList.toggle('on', showHandles);
    $('btnSelect').hidden = $('btnAnchor2').hidden = curTab !== 'bg';
    $('btnAddMode').hidden = $('btnHandles').hidden = curTab !== 'peaks';
    $('chartHint').textContent = anchorMode ? t('Bấm lên phổ tại thung lũng giữa các peak để đặt điểm neo nền. Bấm lại nút để tắt.')
      : addMode ? t('Bấm vào một điểm trên phổ để đặt peak tại BE đó. Bấm lại nút để tắt.')
      : selectMode ? t('Kéo ngang trên đồ thị để chọn vùng phân tích.')
      : curTab === 'bg' ? t('Kéo các vòng tròn (điểm neo, hai điểm mút) để chỉnh nền. Peak không bị ảnh hưởng.')
      : curTab === 'peaks' ? (showHandles ? t('Kéo chấm tròn ở đỉnh peak để dời BE và đổi chiều cao; kéo thanh dọc ở nửa chiều cao để đổi FWHM. Nền giữ nguyên.') : t('Tay kéo peak đang ẩn.'))
      : t('Trục BE đảo chiều như quy ước XPS. Phía dưới là phần dư của phép khớp.');
  }
  function hookChart() {
    const el = $('chart');
    el.on('plotly_click', ev => { if (!ev.points.length) return; if (anchorMode) addAnchor(ev.points[0].x); else if (addMode) addPeakAt(ev.points[0].x); });
    el.on('plotly_relayout', ev => {
      if (!ev) return;
      const hit = new Set();
      Object.keys(ev).forEach(k => { const m = k.match(/^shapes\[(\d+)\]/); if (m) hit.add(+m[1]); });
      if (!hit.size) return;
      const s = S(), shp = el.layout.shapes || [];
      let peaks = false;
      hit.forEach(i => {
        const kn = knotMeta[i], sh = shp[i]; if (!kn || !sh) return;
        const nx = XPS.round(+sh.xanchor, 2), ny = +sh.yanchor;
        if (!isFinite(nx) || !isFinite(ny)) return;
        if (kn.kind === 'end') {
          const lo = Math.min(...s.region), hi = Math.max(...s.region);
          s.region = kn.end === 0 ? [Math.min(nx, hi - 1), hi] : [lo, Math.max(nx, lo + 1)];
          s.endY[kn.end] = ny;
        } else if (kn.kind === 'apex' || kn.kind === 'fwhm') {
          const cp = s.comps[kn.ci]; if (!cp) return;
          const xx = XPS.xOf(s), BB = XPS.background(s, xx); if (!BB) return;
          const xsB = xx.slice(BB.i0, BB.i1 + 1), xr = +sh.xanchor;
          if (kn.kind === 'apex') { cp.center = XPS.round(xr, 3); const f0 = XPS.shapeVal(cp, 0) || 1; cp.height = Math.max(0, XPS.round((ny - bgAt(xsB, BB.bg, xr)) / f0, 1)); }
          else { cp.fwhm = Math.max(0.1, XPS.round(2 * Math.abs(cp.center - xr), 3)); if (s.shareFwhm) s.comps.forEach(c => c.fwhm = cp.fwhm); }
          peaks = true;
        } else if (kn.ai !== undefined) s.anchors[kn.ai] = { x: nx, y: ny };
      });
      renderControls(); afterEdit();
      if (peaks) setMsg(t('Đã chỉnh peak bằng tay. Bấm "Khớp phổ" nếu muốn tối ưu tiếp từ vị trí này.'));
    });
    el.on('plotly_selected', ev => {
      if (!selectMode || !ev || !ev.range) return;
      const r = ev.range.x; S().region = [XPS.round(Math.min(...r), 2), XPS.round(Math.max(...r), 2)];
      selectMode = false; syncModes(); renderControls(); afterEdit();
    });
  }

  // ======================================================================
  // Export
  // ======================================================================
  const r7 = v => Number.isFinite(v) ? +v.toPrecision(7) : null;
  function sheetsFor(s) {
    const x = XPS.xOf(s), B = XPS.background(s, x);
    const names = s.comps.map((c, i) => c.name || 'Peak ' + (i + 1));
    const rows = [['Binding energy (eV)', 'Raw intensity', 'Background', 'Data − background', 'Envelope (fit + bg)', ...names.map(n => n + ' (+bg)'), 'Residual']];
    for (let i = x.length - 1; i >= 0; i--) {
      const r = [XPS.round(x[i], 4), s.y[i]];
      if (B && i >= B.i0 && i <= B.i1) {
        const bg = B.bg[i - B.i0], comps = s.comps.map(cp => XPS.compCurve(cp, x[i]));
        const env = bg + comps.reduce((a, v) => a + v, 0);
        r.push(r7(bg), r7(s.y[i] - bg), s.comps.length ? r7(env) : null, ...comps.map(v => r7(v + bg)), s.comps.length ? r7(s.y[i] - env) : null);
      }
      rows.push(r);
    }
    const st = s.comps.length ? XPS.stats(s) : null, fe = XPS.fitErrors(s);
    const areas = s.comps.map(cp => XPS.compArea(s, cp)), tot = areas.reduce((a, v) => a + v, 0);
    const E = (ci, k) => fe && Number.isFinite(fe.sig[ci + '.' + k]) ? r7(k === 'mix' ? fe.sig[ci + '.' + k] * 100 : fe.sig[ci + '.' + k]) : '';
    const p = [['Spectrum', s.name], ['Source', s.source], ['Software', 'XPS Fit Studio ' + XPS.VERSION + ' (' + REPO + ')'], ['Intensity unit', s.unit], ['Acquisition time per point (s)', s.acq ?? ''],
      ['BE shift (eV)', s.shift], ['Calibration', s.calib ? s.calib.line + ' = ' + s.calib.ref + ' eV' : 'none'], ['Region (eV)', Math.min(...s.region) + ' – ' + Math.max(...s.region)],
      ['Background', s.bgType], ['End-point averaging (points)', s.bgAvg],
      ['Background anchors (eV)', (s.anchors || []).slice().sort((a, b) => a.x - b.x).map(a => a.x + (a.y !== null && a.y !== undefined ? ' (level ' + Math.round(a.y) + ')' : '')).join(', ') || 'none'],
      ['Manual end levels (low, high)', (s.endY || []).map(v => v === null || v === undefined ? 'auto' : Math.round(v)).join(', ')], [],
      ['Peak', 'Line shape', 'BE (eV)', '± BE', 'Width parameter (eV)', '± width', 'Measured FWHM (eV)', 'Height', '± height', 'L (%)', '± L', 'α', 'β', 'G (eV)', 'Doublet ΔE (eV)', 'Doublet ratio', 'Area', '± area', 'Area (%)']];
    s.comps.forEach((cp, i) => p.push([names[i], XPS.shapeLabel(cp), r7(cp.center), E(i, 'center'), r7(cp.fwhm), E(i, 'fwhm'), r7(XPS.measuredFwhm(cp)), r7(cp.height), E(i, 'height'),
      cp.shape === 'la' ? '' : r7(cp.mix * 100), E(i, 'mix'), cp.shape === 'la' ? r7(cp.asym.a) : '', cp.shape === 'la' ? r7(cp.asym.b) : '', cp.shape === 'la' ? r7(cp.asym.g) : '',
      cp.doublet ? cp.doublet.split : '', cp.doublet ? cp.doublet.ratio : '', r7(areas[i]), fe ? r7(fe.areaSig[i]) : '', r7(100 * areas[i] / tot)]));
    if (st) p.push([], ['Chi-square', r7(st.chi2)], ['Reduced chi-square', r7(st.redChi2)], ['R²', r7(st.r2)], ['RMSE', r7(st.rmse)], ['Points (N)', st.n], ['Free parameters (p)', st.nFree],
      ['Uncertainties', fe ? '1σ from covariance matrix × reduced χ² (background fixed)' : 'not available: parameters changed after the last fit']);
    return { rows, params: p };
  }
  function quantSheet() {
    const rows = XPS.quantify(spectra.filter(s => s.quantOn), { imfpExp: quantOpts.imfp });
    const out = [['Region', 'RSF', 'Area (cps·eV)', 'Atomic %'], ...rows.map(r => [r.s.name, r.rsf ?? '', r.ok ? r7(r.I) : '', r.at !== null && r.at !== undefined ? r7(r.at) : ''])];
    out.push([], ['Component', 'Region', 'Atomic %']);
    rows.forEach(r => r.comps.forEach(c => out.push([c.name, r.s.name, r7(c.at)])));
    out.push([], ['RSF source', quantOpts.src || 'Scofield cross-sections (Al Kα, C 1s = 1)'], ['IMFP correction', quantOpts.imfp ? 'KE^' + quantOpts.imfp : 'none']);
    return out;
  }
  function safeSheet(n, used) { let b = n.replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 26) || 'Spectrum', k = b, j = 2; while (used.has(k)) k = b + ' ' + j++; used.add(k); return k; }
  async function exportXlsx(list, filename, withQuant) {
    if (!window.XLSX) return toast(t('Thư viện Excel chưa tải xong, thử lại sau giây lát'));
    const wb = XLSX.utils.book_new(), used = new Set();
    list.forEach(s => {
      const { rows, params } = sheetsFor(s);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), safeSheet(s.name, used));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(params), safeSheet(s.name + ' fit', used));
    });
    if (withQuant) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(quantSheet()), safeSheet('Quantification', used));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Methods text'], [methods()], [], ['Acknowledgment'], [CITE().ack]]), safeSheet('Methods', used));
    await saveFile(filename, new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }
  // ---------- CSV ----------
  const csvCell = v => v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  function csvFor(s) {
    const rows = sheetsFor(s).rows;
    rows[0] = rows[0].map((h, i) => i === 0 ? 'BE (eV)' : h);
    return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  // ---------- SciPlot Studio project ----------
  // One workbook + one XPS graph per spectrum; columns cover the analysis region, highest BE first.
  // Unicode super/subscripts → SciPlot math text (Cu⁰ → Cu$^{0}$, 2p₃/₂ → 2p$_{3/2}$)
  function mathText(n) {
    const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻', SUB = '₀₁₂₃₄₅₆₇₈₉₊₋', PL = '0123456789+-';
    const map = (str, set) => [...str].map(c => PL[set.indexOf(c)]).join('');
    return String(n)
      .replace(/([₀-₉]+)\/([₀-₉]+)/g, (_, a, b) => '$_{' + map(a, SUB) + '/' + map(b, SUB) + '}$')
      .replace(/[⁰-⁹⁺⁻¹²³]+/g, m => '$^{' + map(m, SUP) + '}$')
      .replace(/[₀-₉₊₋]+/g, m => '$_{' + map(m, SUB) + '}$');
  }
  function sciplotProject(list) {
    const P = { version: 1, books: [], graphs: [], open: [], active: null, seq: { book: 0, graph: 0 } };
    const L = i => { let t = ''; i++; while (i > 0) { const m = (i - 1) % 26; t = String.fromCharCode(65 + m) + t; i = Math.floor((i - 1) / 26); } return t; };
    const used = new Set(), uniq = n => { let k = n, j = 2; while (used.has(k)) k = n + ' ' + j++; used.add(k); return k; };
    list.forEach(s => {
      const x = XPS.xOf(s), B = XPS.background(s, x);
      if (!B) return;
      const idx = []; for (let i = B.i1; i >= B.i0; i--) idx.push(i);
      const unit = s.unit === 'cps' ? 'counts s⁻¹' : s.unit === 'counts' ? 'counts' : 'a.u.';
      const comps = s.comps.map(cp => idx.map(i => XPS.compCurve(cp, x[i])));
      const cols = [
        { lname: 'Binding energy', units: 'eV', desig: 'X', data: idx.map(i => XPS.round(x[i], 4)) },
        { lname: 'Raw', units: unit, desig: 'Y', data: idx.map(i => s.y[i]), role: 'raw' },
        { lname: 'Background', units: unit, desig: 'Y', data: idx.map(i => r7(B.bg[i - B.i0])), role: 'bg' }
      ];
      s.comps.forEach((cp, k) => cols.push({ lname: mathText(cp.name || 'Peak ' + (k + 1)), units: unit, comment: XPS.shapeLabel(cp) + ', BE ' + cp.center.toFixed(2) + ' eV', desig: 'Y', data: idx.map((i, j) => r7(comps[k][j] + B.bg[i - B.i0])), role: 'peak' }));
      if (s.comps.length) {
        const env = idx.map((i, j) => B.bg[i - B.i0] + comps.reduce((a, c) => a + c[j], 0));
        cols.push({ lname: 'Envelope', units: unit, desig: 'Y', data: env.map(r7), role: 'env' });
        cols.push({ lname: 'Residual', units: unit, desig: 'Y', data: idx.map((i, j) => r7(s.y[i] - env[j])), role: null });
      }
      const bid = 'b' + (++P.seq.book), gid = 'g' + (++P.seq.graph), name = uniq(s.name);
      cols.forEach((c, i) => { c.name = L(i); c.comment = c.comment || ''; });
      P.books.push({ id: bid, name: name + ' data', cols: cols.map(({ role, ...c }) => c) });
      P.graphs.push({
        id: gid, name, kind: 'xps', book: bid,
        series: cols.filter(c => c.role).map(c => ({ x: 'A', y: c.name, yerr: null, role: c.role })),
        opts: { peak_fill: 'gradient' }, size: [4.6, 3.8], theme: 'boxed', font: 'sans', fontsize: 11, palette: 'paper',
        xaxis: { reverse: true }, yaxis: {}, y2axis: {}, legend: { loc: [0.02, 0.86] }, title: '',
        texts: [{ id: 't1', text: mathText(s.name), x: 0.03, y: 0.92, fontsize: 13, bold: true }], reflines: [], frame: {}
      });
      P.open.push(gid, bid);
    });
    P.active = P.graphs.length ? P.graphs[0].id : null;
    return P;
  }
  const EXP_HINT = {
    sciplot: 'File project mở thẳng trong SciPlot Studio (File → Mở project): mỗi phổ thành một hình XPS có tô peak kèm workbook số liệu, chỉnh được font, màu, trục và ghép hình (a)(b)(c).',
    xlsx: 'Mỗi phổ hai sheet: dữ liệu để vẽ lại (BE, dữ liệu đo, nền, từng peak cộng nền, đường tổng, phần dư) và thông số khớp ± sai số; kèm sheet định lượng và Methods khi xuất tất cả.',
    csv: 'Mỗi phổ một file CSV: BE, dữ liệu đo, nền, dữ liệu trừ nền, đường tổng, từng peak cộng nền, phần dư. Mở được bằng mọi phần mềm bảng tính và vẽ đồ thị.'
  };
  function syncExpHint() { $('expHint').textContent = t(EXP_HINT[$('expFmt').value]); }
  on('expFmt', 'change', () => { syncExpHint(); ls.set('xpsfit-expfmt', $('expFmt').value); });
  on('doExport', 'click', async () => {
    const fmtv = $('expFmt').value, list = $('expScope').value === 'all' ? spectra : (S() ? [S()] : []);
    if (!list.length) return;
    const base = list.length === 1 ? 'XPS_' + safeName(list[0].name) : 'XPS_all_spectra';
    if (fmtv === 'xlsx') return exportXlsx(list, base + '.xlsx', list.length > 1 && list.filter(s => s.quantOn).length >= 2);
    if (fmtv === 'sciplot') return saveFile(base + '.sciplot.json', new Blob([JSON.stringify(sciplotProject(list))], { type: 'application/json' }));
    for (const s of list) await saveFile('XPS_' + safeName(s.name) + '.csv', new Blob([csvFor(s)], { type: 'text/csv' }));
  });
  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (e2) { toast(t('Trình duyệt chặn sao chép')); }
      ta.remove();
    }
  }
  on('copyTsv', 'click', () => { const tsv = sheetsFor(S()).rows.map(r => r.map(v => v === null || v === undefined ? '' : v).join('\t')).join('\n'); copyText(tsv, t('Đã sao chép {0} dòng. Dán vào bảng tính hoặc phần mềm vẽ đồ thị.', tsv.split('\n').length - 1)); });
  on('copyMethods', 'click', () => copyText($('methods').value, t('Đã sao chép đoạn Methods')));
  async function exportFigure(fmtName) {
    const s = S(); if (!s || !window.Plotly) return;
    const { tr, layout } = buildFigure(s, true);
    const div = document.createElement('div'); div.style.position = 'fixed'; div.style.left = '-10000px'; div.style.width = '1180px'; div.style.height = '700px'; document.body.appendChild(div);
    try {
      await Plotly.newPlot(div, tr, Object.assign(layout, { width: 1180, height: 700 }), { staticPlot: true });
      const url = await Plotly.toImage(div, { format: fmtName, width: 1180, height: 700, scale: fmtName === 'png' ? 4 : 1 });
      let data;
      if (fmtName === 'svg') data = new Blob([decodeURIComponent(url.slice(url.indexOf(',') + 1))], { type: 'image/svg+xml' });
      else { const b = atob(url.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); data = new Blob([u], { type: 'image/png' }); }
      await saveFile('XPS_' + safeName(s.name) + '.' + fmtName, data);
    } catch (e) { toast(t('Không xuất được hình: {0}', e.message)); }
    finally { Plotly.purge(div); div.remove(); }
  }
  on('figPng', 'click', () => exportFigure('png'));
  on('figSvg', 'click', () => exportFigure('svg'));

  // ======================================================================
  // App bar, dialogs, citation
  // ======================================================================
  const CITE = () => ({
    ack: 'The authors thank Dr. Phong Hoai Le (University of Science, VNU-HCM, Vietnam) for developing XPS Fit Studio (' + REPO + '), which was used to process the XPS spectra in this work.',
    methods: 'XPS spectra were processed using XPS Fit Studio (version ' + XPS.VERSION + '; P. H. Le, University of Science, VNU-HCM, Vietnam; ' + REPO + ').',
    caption: 'Fitted with XPS Fit Studio v' + XPS.VERSION + ' (' + REPO + ').',
    ref: 'Le, P. H. XPS Fit Studio, version ' + XPS.VERSION + '; University of Science, VNU-HCM: Ho Chi Minh City, Vietnam, 2026. ' + REPO + '.'
  });
  function renderCite() {
    const box = $('citeList'); box.innerHTML = ''; box.style.display = 'grid'; box.style.gap = '10px';
    const c = CITE();
    [['Lời cảm ơn (Acknowledgments)', c.ack], ['Phần Methods / Experimental', c.methods], ['Chú thích hình / SI', c.caption], ['Tài liệu tham khảo (kiểu ACS)', c.ref]].forEach(([k, v]) => {
      const d = document.createElement('div'); d.className = 'cite';
      const kk = document.createElement('div'); kk.className = 'k'; kk.textContent = t(k);
      const p = document.createElement('p'); p.textContent = v;
      const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = t('Sao chép');
      b.onclick = () => copyText(v, t('Đã sao chép'));
      d.append(kk, p, b); box.appendChild(d);
    });
    $('aboutLine').textContent = 'XPS Fit Studio ' + XPS.VERSION + ' · ' + REPO;
  }
  const openDlg = id => { const d = $(id); if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); };
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close ? d.close() : d.removeAttribute('open'); });
  });
  on('mHelp', 'click', () => openDlg('dlgHelp'));
  on('mCite', 'click', () => { renderCite(); openDlg('dlgCite'); });
  on('mOpen', 'click', () => $('file').click());
  on('mLoad', 'click', () => $('projFile').click());
  on('mSave', 'click', () => saveFile('XPS_project_' + new Date().toISOString().slice(0, 10) + '.xpsfit.json', projectJson(), 'application/json'));
  on('projFile', 'change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { loadProject(await f.text(), true); toast(t('Đã mở project {0}', f.name)); } catch (err) { setMsg(err.message, true); } });
  on('mUndo', 'click', undo); on('mRedo', 'click', redo);
  on('loadSamples', 'click', () => { const set = sampleSet(); spectra.push(...set); cur = spectra.length - set.length; afterStructure(); });
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('mInstall').hidden = false; });
  on('mInstall', 'click', async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { } installEvt = null; $('mInstall').hidden = true; });

  // language & theme
  function syncLang() { $('lVi').setAttribute('aria-pressed', I18N.lang === 'vi'); $('lEn').setAttribute('aria-pressed', I18N.lang === 'en'); }
  on('lVi', 'click', () => I18N.setLang('vi')); on('lEn', 'click', () => I18N.setLang('en'));
  I18N.onChange(() => { syncLang(); renderAll(); renderCite(); syncExpHint(); });
  function applyTheme(m) {
    if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m);
    $('thL').setAttribute('aria-pressed', m === 'light'); $('thA').setAttribute('aria-pressed', m === 'auto'); $('thD').setAttribute('aria-pressed', m === 'dark');
    ls.set('xpsfit-theme', m); renderChart();
  }
  on('thL', 'click', () => applyTheme('light')); on('thA', 'click', () => applyTheme('auto')); on('thD', 'click', () => applyTheme('dark'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderChart);
  new MutationObserver(() => renderChart()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // tabs
  function showTab(name) {
    TABS.forEach(tb => { const on2 = tb === name; $('tab-' + tb).setAttribute('aria-selected', on2 ? 'true' : 'false'); $('tab-' + tb).tabIndex = on2 ? 0 : -1; $('pane-' + tb).hidden = !on2; });
    ls.set('xpsfit-tab', name); curTab = name;
    if (name !== 'bg') { anchorMode = false; selectMode = false; }
    if (name !== 'peaks') addMode = false;
    syncModes(); renderChart();
  }
  TABS.forEach((tb, k) => {
    on('tab-' + tb, 'click', () => showTab(tb));
    on('tab-' + tb, 'keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = TABS[(k + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]; showTab(n); $('tab-' + n).focus();
    });
  });
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey, typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); $('mSave').click(); }
    else if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); $('mLoad').click(); }
    else if (mod && e.key === 'Enter') { e.preventDefault(); doFit(); }
    else if (mod && !typing && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (mod && !typing && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    else if (!mod && !typing && /^[1-5]$/.test(e.key) && !document.querySelector('dialog[open]')) showTab(TABS[+e.key - 1]);
  });

  // drag & drop
  const drop = $('drop');
  on('file', 'change', e => { loadFiles([...e.target.files]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => loadFiles([...e.dataTransfer.files]));
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length && !drop.contains(e.target)) loadFiles([...e.dataTransfer.files]); });

  // misc
  let tt; function toast(m) { const el = $('toast'); el.textContent = m; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 3200); }
  function setMsg(m, err) { const el = $('fitMsg'); el.innerHTML = ''; if (!m) return; const d = document.createElement('div'); d.className = 'msg' + (err ? ' err' : ''); d.textContent = m; el.appendChild(d); }

  // ======================================================================
  // Boot
  // ======================================================================
  function boot() {
    $('ver').textContent = 'v' + XPS.VERSION;
    I18N.translateDom(); syncLang();
    applyTheme(ls.get('xpsfit-theme') || 'auto');
    defShape = ls.get('xpsfit-shape') || 'gl';
    const ef = ls.get('xpsfit-expfmt'); if (ef && EXP_HINT[ef]) $('expFmt').value = ef; syncExpHint();
    let restored = false;
    const saved = ls.get('xpsfit-session');
    if (saved) { try { loadProject(saved, true); restored = spectra.length > 0; } catch (e) { } }
    if (!restored) { spectra = sampleSet(); cur = 0; }
    const tab = ls.get('xpsfit-tab');
    renderAll(); renderCite();
    showTab(TABS.includes(tab) ? tab : 'peaks');
    lastSnap = null; commit(true); undoStack = []; syncUndo();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.claude) navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  if (window.Plotly) boot(); else window.addEventListener('load', boot);
})();
