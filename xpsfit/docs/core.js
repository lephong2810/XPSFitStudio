/* XPS Fit Studio — processing engine.
   Parsing (VAMAS ISO 14976, labelled text exports, two-column text), binding-energy shift,
   backgrounds (Shirley, smart Shirley, Tougaard U2, linear; optional anchor points),
   line shapes (GL sum, GL product, asymmetric LA), Levenberg–Marquardt fitting with
   covariance-based uncertainties, χ² statistics, RSF quantification and a Methods text.
   © 2026 Phong Hoai Le — MIT License. */
const XPS = (() => {
  const VERSION = '1.0.0';
  const LN2 = Math.LN2;
  const G_AREA = Math.sqrt(Math.PI / (4 * LN2));
  const L_AREA = Math.PI / 2;

  // Translation hook: the UI sets XPS.t to its translator. Templates use {0}, {1}…
  let T = s => s;
  const tr = (tpl, ...a) => T(tpl).replace(/\{(\d+)\}/g, (_, i) => a[+i] ?? '');

  // ======================================================================
  // Parsing
  // ======================================================================
  function parseVamas(text, fileName) {
    const lines = text.replace(/\r/g, '').split('\n');
    let p = 0;
    const next = () => {
      if (p >= lines.length) throw new Error(tr('File VAMAS bị cắt ngang ở dòng {0}', p + 1));
      return lines[p++].trim();
    };
    const num = () => {
      const s = next(), v = parseFloat(s);
      if (!isFinite(v)) throw new Error(tr('Dòng {0} không phải số: "{1}"', p, s));
      return v;
    };
    const int = () => Math.round(num());
    const skip = n => { for (let i = 0; i < n; i++) next(); };

    const formatId = next();
    if (!/VAMAS/i.test(formatId)) throw new Error(tr('Không phải file VAMAS (dòng đầu: "{0}")', formatId.slice(0, 60)));
    const institution = next();
    const instrument = next();
    next(); next();
    skip(int());
    const expMode = next().toUpperCase();
    const scanMode = next().toUpperCase();
    if (['MAP', 'MAPDP', 'NORM', 'SDP'].includes(expMode)) num();
    if (['MAP', 'MAPDP'].includes(expMode)) skip(3);
    const nExpVar = int();
    skip(2 * nExpVar);
    const nIncl = int();
    const warnings = [];
    if (nIncl !== 0) warnings.push(tr('File dùng danh sách loại trừ tham số; có thể đọc không chính xác.'));
    skip(Math.abs(nIncl));
    skip(int());
    const nFutExp = int(), nFutBlk = int();
    skip(nFutExp);
    const nBlocks = int();

    const spectra = [];
    for (let b = 0; b < nBlocks; b++) {
      const blockId = next(), sampleId = next();
      skip(7);
      skip(int());
      const technique = next().toUpperCase();
      if (['MAP', 'MAPDP'].includes(expMode)) skip(2);
      skip(nExpVar);
      const sourceLabel = next();
      if (['MAPDP', 'MAPSVDP', 'SDP', 'SDPSV'].includes(expMode) ||
        ['FABMS', 'FABMS ENERGY SPEC', 'ISS', 'SIMS', 'SIMS ENERGY SPEC', 'SNMS', 'SNMS ENERGY SPEC'].includes(technique)) skip(3);
      const hv = num();
      skip(3);
      if (['MAP', 'MAPDP', 'MAPSV', 'MAPSVDP', 'SEM'].includes(expMode)) skip(2);
      if (['MAPSV', 'MAPSVDP', 'SEM'].includes(expMode)) skip(6);
      skip(2);
      const analyserMode = next();
      const passEnergy = num();
      if (technique === 'AES DIFF') skip(1);
      skip(1);
      const workFn = num();
      skip(5);
      const species = next(), transition = next();
      skip(1);
      if (scanMode !== 'REGULAR') throw new Error(tr('Chỉ hỗ trợ VAMAS kiểu quét REGULAR (khối "{0}" là {1}).', blockId, scanMode));
      const absLabel = next();
      skip(1);
      const start = num(), step = num();
      const nCorr = int();
      const corr = [];
      for (let k = 0; k < nCorr; k++) corr.push([next(), next()]);
      skip(1);
      const dwell = num(), nScans = num();
      skip(1);
      if (['AES DIFF', 'AES DIR', 'EDX', 'ELS', 'UPS', 'XPS', 'XRF'].includes(technique) &&
        ['MAPDP', 'MAPSVDP', 'SDP', 'SDPSV'].includes(expMode)) skip(7);
      skip(3);
      skip(3 * int());
      skip(nFutBlk);
      const nOrd = int();
      skip(2 * nCorr);
      const nPts = Math.floor(nOrd / nCorr);
      const ys = new Array(nPts);
      for (let i = 0; i < nPts; i++) { ys[i] = num(); if (nCorr > 1) skip(nCorr - 1); }
      const isKE = /kinetic/i.test(absLabel);
      const be = ys.map((_, i) => { const e = start + i * step; return isKE ? hv - e : e; });
      const yUnit = (corr[0] || ['', ''])[1] + ' ' + (corr[0] || ['', ''])[0];
      const unit = /c\/s|cps|per\s*s|counts?\s*\/\s*s/i.test(yUnit) ? 'cps' : 'counts';
      const acq = dwell * nScans > 0 ? dwell * nScans : null;
      const name = [species, transition].filter(s => s && s !== '-').join(' ').trim() || blockId;
      spectra.push(makeSpectrum({
        name: name || tr('Khối {0}', b + 1), source: fileName, be, y: ys, unit, acq, hv,
        meta: {
          'Khối': blockId, 'Mẫu': sampleId, 'Thiết bị': instrument, 'Cơ sở': institution,
          'Nguồn': sourceLabel + ' (' + hv + ' eV)', 'Pass energy': passEnergy + ' eV',
          'Chế độ': analyserMode, 'Work function': workFn + ' eV',
          'Trục gốc': absLabel + (isKE ? ' → BE = hν − KE' : ''),
          'Bước': Math.abs(step) + ' eV', 'Dwell × scans': dwell + ' s × ' + nScans
        }
      }));
    }
    return { spectra, warnings };
  }

  // Plain two-column files and labelled multi-column exports
  // ("Dataset …", Dwell Time, Number of sweeps, KE / BE / Intensity(cps) / Transmission).
  function parseColumns(text, fileName) {
    const lines = text.replace(/\r/g, '').split('\n');
    const sections = [];
    let sec = null;
    const newSec = title => { sec = { title, kv: {}, labels: null, rows: [] }; sections.push(sec); };
    const splitRow = raw => {
      let parts = raw.trim().split(/[\t;]+|\s{2,}|\s(?=[-+\d.])/).map(t => t.trim()).filter(Boolean);
      if (parts.length < 2 && raw.includes(',')) parts = raw.trim().split(',').map(t => t.trim()).filter(Boolean);
      return parts;
    };
    const isNum = t => /^[-+]?(\d+[.,]?\d*|[.,]\d+)([eE][-+]?\d+)?$/.test(t);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const ds = line.match(/^Dataset\s+(.*)$/i);
      if (ds) { newSec(ds[1].trim()); continue; }
      if (!sec) newSec('');
      const parts = splitRow(line);
      if (parts.length >= 2 && parts.every(isNum)) sec.rows.push(parts.map(t => parseFloat(t.replace(',', '.'))));
      else if (!sec.rows.length) {
        const tabs = line.split('\t').map(t => t.trim()).filter(Boolean);
        if (tabs.length === 2 && isNum(tabs[1])) sec.kv[tabs[0].toLowerCase()] = parseFloat(tabs[1]);
        else if (/binding|kinetic|energy|intens|counts|cps/i.test(line)) sec.labels = (tabs.length > 1 ? tabs : line.split(/[,;]|\s{2,}/)).map(t => t.trim());
      }
    }
    const spectra = [], warnings = [];
    sections.filter(s => s.rows.length >= 5).forEach((s, k) => {
      const L = s.labels || [];
      const find = re => L.findIndex(l => re.test(l));
      let beCol = find(/binding/i);
      const keCol = find(/kinetic/i);
      let iCol = L.findIndex((l, i) => i !== beCol && i !== keCol && /intens|counts|cps/i.test(l));
      if (beCol < 0 && keCol < 0) beCol = 0;
      if (iCol < 0) iCol = (beCol >= 0 ? beCol : keCol) === 0 ? 1 : 0;
      const be = [], y = [];
      for (const r of s.rows) {
        if (r.length <= Math.max(iCol, beCol, keCol)) continue;
        be.push(beCol >= 0 ? r[beCol] : 1486.6 - r[keCol]); y.push(r[iCol]);
      }
      const meta = {};
      if (beCol < 0) { meta['Ghi chú'] = tr('BE = 1486.6 − KE (giả định Al Kα)'); warnings.push(tr('{0}: không có cột BE, đã tính từ KE với Al Kα.', fileName)); }
      const dwell = s.kv['dwell time (s)'] ?? s.kv['dwell time'];
      const sweeps = s.kv['number of sweeps'] ?? s.kv['number of scans'];
      const lab = L[iCol] || '';
      const unit = /cps|\/s/i.test(lab) ? 'cps' : /count/i.test(lab) ? 'counts' : 'au';
      const acq = dwell > 0 && sweeps > 0 ? dwell * sweeps : null;
      const m = s.title.match(/^(.*?)(?::\d+)?\s*(?:\((.*)\))?$/);
      const name = (m && m[1].trim()) || (sections.length > 1 ? fileName + ' #' + (k + 1) : fileName.replace(/\.[^.]+$/, ''));
      if (s.title) meta['Dataset'] = s.title;
      if (m && m[2]) meta['Mẫu'] = m[2];
      meta['Cột dùng'] = (beCol >= 0 ? (L[beCol] || tr('cột {0}', beCol + 1)) : (L[keCol] || 'KE')) + ' · ' + (lab || tr('cột {0}', iCol + 1));
      if (dwell) meta['Dwell × sweeps'] = dwell + ' s × ' + (sweeps ?? '?');
      spectra.push(makeSpectrum({ name, source: fileName, be, y, unit, acq, hv: 1486.6, meta }));
    });
    if (!spectra.length) throw new Error(tr('Không tìm thấy cột số (Binding Energy, Intensity) trong file.'));
    return { spectra, warnings };
  }

  function parseAny(text, fileName) {
    return /^\s*VAMAS/i.test(text) || /\.vms$/i.test(fileName) ? parseVamas(text, fileName) : parseColumns(text, fileName);
  }

  let uid = 1;
  function makeSpectrum({ name, source, be, y, unit = 'au', acq = null, hv = 1486.6, meta = {} }) {
    const idx = be.map((_, i) => i).sort((a, b) => be[a] - be[b]);
    const B = idx.map(i => be[i]), Y = idx.map(i => y[i]);
    return {
      id: uid++, name, source, be: B, y: Y, unit, acq, hv, meta,
      shift: 0, calib: null, region: [round(B[0], 2), round(B[B.length - 1], 2)],
      bgType: 'shirley', bgAvg: 5, anchors: [], endY: [null, null],
      comps: [], shareFwhm: false, fit: null, rsfKey: null, rsf: null, quantOn: true
    };
  }
  function reviveSpectrum(o) { const s = Object.assign(makeSpectrum({ name: o.name, source: o.source, be: o.be, y: o.y }), o); s.id = uid++; s.comps.forEach(normComp); return s; }

  // ======================================================================
  // Helpers
  // ======================================================================
  function round(v, d) { const f = Math.pow(10, d); return Math.round(v * f) / f; }
  function xOf(s) { return s.be.map(v => v + s.shift); }
  function regionIdx(s, x) {
    const lo = Math.min(...s.region), hi = Math.max(...s.region);
    let i0 = -1, i1 = -1;
    for (let i = 0; i < x.length; i++) if (x[i] >= lo && x[i] <= hi) { if (i0 < 0) i0 = i; i1 = i; }
    return [i0, i1];
  }
  function unitFactor(s) { return s.unit === 'cps' && s.acq > 0 ? s.acq : 1; }

  // ======================================================================
  // Background
  // ======================================================================
  function normAnchors(s) {
    s.anchors = (s.anchors || []).map(a => typeof a === 'number' ? { x: a, y: null } : a);
    if (!s.endY) s.endY = [null, null];
    return s.anchors;
  }
  function background(s, x) {
    const [i0, i1] = regionIdx(s, x);
    if (i0 < 0 || i1 - i0 < 4) return null;
    const y = s.y.slice(i0, i1 + 1), xs = x.slice(i0, i1 + 1), n = y.length;
    if (s.bgType === 'none') return { i0, i1, bg: new Array(n).fill(0), knots: [] };
    const k = Math.max(1, Math.min(s.bgAvg | 0, Math.floor(n / 4)));
    const anchors = normAnchors(s);
    const knots = [{ i: 0, ov: s.endY[0], kind: 'end', end: 0 }];
    anchors.map((a, ai) => ({ a, ai })).sort((p, q) => p.a.x - q.a.x).forEach(({ a, ai }) => {
      let best = 0; for (let i = 0; i < n; i++) if (Math.abs(xs[i] - a.x) < Math.abs(xs[best] - a.x)) best = i;
      if (best - knots[knots.length - 1].i >= 4 && n - 1 - best >= 4) knots.push({ i: best, ov: a.y, kind: 'anchor', ai });
    });
    knots.push({ i: n - 1, ov: s.endY[1], kind: 'end', end: 1 });
    knots.forEach((kn, j) => {
      if (kn.ov !== null && kn.ov !== undefined && isFinite(kn.ov)) { kn.y = kn.ov; kn.manual = true; return; }
      let a, b;
      if (j === 0) { a = 0; b = k - 1; } else if (j === knots.length - 1) { a = n - k; b = n - 1; }
      else { a = Math.max(0, kn.i - (k >> 1)); b = Math.min(n - 1, a + k - 1); }
      let sum = 0; for (let i = a; i <= b; i++) sum += y[i];
      kn.y = sum / (b - a + 1); kn.manual = false;
    });
    const bg = new Array(n);
    for (let j = 0; j < knots.length - 1; j++) {
      const a = knots[j].i, b = knots[j + 1].i;
      const seg = segment(s.bgType, xs.slice(a, b + 1), y.slice(a, b + 1), knots[j].y, knots[j + 1].y);
      for (let i = a; i <= b; i++) bg[i] = seg[i - a];
    }
    return { i0, i1, bg, knots: knots.map(kn => ({ x: xs[kn.i], y: kn.y, kind: kn.kind, ai: kn.ai, end: kn.end, manual: kn.manual })) };
  }
  function segment(type, xs, y, Ilo, Ihi) {
    const n = y.length, bg = new Array(n);
    const lin = i => Ilo + (Ihi - Ilo) * (xs[i] - xs[0]) / (xs[n - 1] - xs[0]);
    if (type === 'linear') { for (let i = 0; i < n; i++) bg[i] = lin(i); return bg; }
    if (type === 'tougaard') {
      const C = 1643, S = new Array(n).fill(0);
      for (let i = 1; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < i; j++) {
          const T2 = xs[i] - xs[j], dx = j > 0 ? xs[j] - xs[j - 1] : xs[1] - xs[0];
          sum += T2 / ((C + T2 * T2) * (C + T2 * T2)) * (y[j] - Ilo) * dx;
        }
        S[i] = sum;
      }
      const B = S[n - 1] > 0 ? (Ihi - Ilo) / S[n - 1] : 0;
      for (let i = 0; i < n; i++) bg[i] = B ? Ilo + B * S[i] : lin(i);
      return bg;
    }
    const smart = type === 'smart';
    let ysm = null;
    if (smart) {
      let w = Math.round(n / 30); w = Math.max(5, Math.min(21, w | 1));
      const h = (w - 1) / 2; ysm = new Array(n);
      for (let i = 0; i < n; i++) {
        let a = 0, c = 0;
        for (let j = Math.max(0, i - h); j <= Math.min(n - 1, i + h); j++) { a += y[j]; c++; }
        ysm[i] = a / c;
      }
    }
    bg.fill(Ilo);
    for (let it = 0; it < 100; it++) {
      const cum = new Array(n); cum[0] = 0;
      for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + 0.5 * (Math.max(0, y[i - 1] - bg[i - 1]) + Math.max(0, y[i] - bg[i])) * (xs[i] - xs[i - 1]);
      const tot = cum[n - 1];
      let change = 0;
      for (let i = 0; i < n; i++) {
        let v = tot > 0 ? Ilo + (Ihi - Ilo) * cum[i] / tot : lin(i);
        if (smart && v > ysm[i]) v = ysm[i];
        change = Math.max(change, Math.abs(v - bg[i]));
        bg[i] = v;
      }
      if (change < 1e-6 * Math.max(1, Math.abs(Ihi))) break;
    }
    return bg;
  }

  // ======================================================================
  // Line shapes. Every shape has its maximum normalised to 1, so `height` is the peak height.
  //   sgl : (1−m)·G + m·L                         (Gaussian–Lorentzian sum, pseudo-Voigt)
  //   gl  : exp(−4 ln2 (1−m) t²) / (1 + 4 m t²)   (Gaussian–Lorentzian product, GL(100m))
  //   la  : asymmetric Lorentzian [1/(1+4t²)]^α (high-BE side) / ^β (low-BE side),
  //         convolved with a Gaussian of FWHM g, as used for metallic core levels.
  // ======================================================================
  const SHAPES = ['gl', 'sgl', 'la'];
  function normComp(cp) {
    if (!cp.shape) cp.shape = 'sgl';
    if (!cp.fix) cp.fix = {};
    if (!cp.asym) cp.asym = { a: 1.0, b: 2.0, g: 0.6 };
    if (cp.doublet === undefined) cp.doublet = null;
    return cp;
  }
  function laBase(u, F, a, b) { const t = u / F; return Math.pow(1 / (1 + 4 * t * t), u > 0 ? a : b); }
  function laPrep(cp) {
    const F = cp.fwhm, { a, b, g } = cp.asym;
    const key = F + '|' + a + '|' + b + '|' + g;
    if (cp._la && cp._la.key === key) return cp._la;
    let s = [0], w = [1];
    if (g > 0.01) {
      const sig = g / 2.35482, N = Math.max(7, Math.min(80, Math.ceil(3.5 * sig / Math.min(sig / 3, F / 6))));
      s = []; w = []; let sum = 0;
      for (let k = -N; k <= N; k++) { const v = k * 3.5 * sig / N, ww = Math.exp(-v * v / (2 * sig * sig)); s.push(v); w.push(ww); sum += ww; }
      w = w.map(v => v / sum);
    }
    const raw = u => { let v = 0; for (let k = 0; k < s.length; k++) v += w[k] * laBase(u - s[k], F, a, b); return v; };
    let mx = 0, at = 0; const L = F + g;
    for (let i = 0; i <= 200; i++) { const u = -L + 2 * L * i / 200, v = raw(u); if (v > mx) { mx = v; at = u; } }
    Object.defineProperty(cp, '_la', { value: { key, raw, norm: mx || 1, peakAt: at }, writable: true, configurable: true, enumerable: false });
    return cp._la;
  }
  function shapeVal(cp, u) {
    const F = cp.fwhm, m = cp.mix;
    if (cp.shape === 'la') { const P = laPrep(cp); return P.raw(u) / P.norm; }
    const t = u / F;
    if (cp.shape === 'gl') return Math.exp(-4 * LN2 * (1 - m) * t * t) / (1 + 4 * m * t * t);
    return (1 - m) * Math.exp(-4 * LN2 * t * t) + m / (1 + 4 * t * t);
  }
  function compCurve(cp, x) {
    let v = cp.height * shapeVal(cp, x - cp.center);
    if (cp.doublet) v += cp.height * cp.doublet.ratio * shapeVal(cp, x - cp.center - cp.doublet.split);
    return v;
  }
  function mainLineAt(cp, x) { return cp.height * shapeVal(cp, x - cp.center); }
  // Area of a component (both doublet lines) integrated over the analysis region.
  function compArea(s, cp) {
    const lo = Math.min(...s.region), hi = Math.max(...s.region), N = 1200, h = (hi - lo) / N;
    let sum = 0;
    for (let i = 0; i <= N; i++) { const v = compCurve(cp, lo + i * h); sum += (i === 0 || i === N ? 0.5 : 1) * v; }
    return sum * h;
  }
  // FWHM of the main line measured on the actual profile (differs from the width parameter for GL product and LA).
  function measuredFwhm(cp) {
    const L = 6 * cp.fwhm + 3 * (cp.shape === 'la' ? cp.asym.g : 0), N = 3000;
    let mx = -1, im = 0; const v = [];
    for (let i = 0; i <= N; i++) { const u = -L + 2 * L * i / N; v.push(shapeVal(cp, u)); if (v[i] > mx) { mx = v[i]; im = i; } }
    const half = mx / 2; let l = im, r = im;
    while (l > 0 && v[l] > half) l--;
    while (r < N && v[r] > half) r++;
    const ux = i => -L + 2 * L * i / N;
    const xl = ux(l) + (half - v[l]) / (v[l + 1] - v[l]) * (ux(l + 1) - ux(l));
    const xr = ux(r - 1) + (half - v[r - 1]) / (v[r] - v[r - 1]) * (ux(r) - ux(r - 1));
    return xr - xl;
  }
  function shapeLabel(cp) {
    if (cp.shape === 'la') return 'LA(' + round(cp.asym.a, 2) + ', ' + round(cp.asym.b, 2) + ', ' + round(cp.asym.g, 2) + ' eV)';
    if (cp.shape === 'gl') return 'GL(' + Math.round(cp.mix * 100) + ')';
    return 'SGL(' + Math.round(cp.mix * 100) + ')';
  }

  // ======================================================================
  // Fitting
  // ======================================================================
  const KEYS = ['center', 'fwhm', 'height', 'mix', 'a', 'b', 'g'];
  const getP = (cp, k) => (k === 'a' || k === 'b' || k === 'g') ? cp.asym[k] : cp[k];
  const setP = (cp, k, v) => { if (k === 'a' || k === 'b' || k === 'g') cp.asym[k] = v; else cp[k] = v; };
  function buildParams(s) {
    const P = [];
    const lo = Math.min(...s.region), hi = Math.max(...s.region);
    s.comps.forEach((cp, ci) => {
      normComp(cp);
      const add = (key, l, h) => { if (!cp.fix[key]) P.push({ ci, key, lo: l, hi: h }); };
      add('center', lo, hi);
      if (!(s.shareFwhm && ci > 0)) add('fwhm', 0.05, 10);
      add('height', 0, Infinity);
      if (cp.shape === 'la') { add('a', 0.51, 6); add('b', 0.51, 6); add('g', 0.01, 4); }
      else add('mix', 0, 1);
    });
    return P;
  }
  function getVals(s, P) { return P.map(p => getP(s.comps[p.ci], p.key)); }
  function applyParams(s, P, vals) {
    P.forEach((p, i) => setP(s.comps[p.ci], p.key, vals[i]));
    if (s.shareFwhm && s.comps.length) s.comps.forEach(c => { c.fwhm = s.comps[0].fwhm; });
  }
  function modelSum(s, xs) {
    const out = new Array(xs.length).fill(0);
    for (const cp of s.comps) for (let i = 0; i < xs.length; i++) out[i] += compCurve(cp, xs[i]);
    return out;
  }
  function weights(s, yobs) { const F = unitFactor(s); return yobs.map(v => F / Math.max(v, 1 / F)); }

  function signature(s) {
    return JSON.stringify([s.shift, s.region, s.bgType, s.bgAvg, s.anchors, s.endY, s.shareFwhm,
      s.comps.map(c => [c.shape, c.center, c.fwhm, c.height, c.mix, c.asym, c.doublet, c.fix])]);
  }

  function fit(s, maxIter = 300) {
    const x = xOf(s), B = background(s, x);
    if (!B) throw new Error(tr('Vùng phân tích quá hẹp.'));
    if (!s.comps.length) throw new Error(tr('Chưa có peak nào để khớp.'));
    const xs = x.slice(B.i0, B.i1 + 1), yobs = s.y.slice(B.i0, B.i1 + 1);
    const ysub = yobs.map((v, i) => v - B.bg[i]);
    const w = weights(s, yobs);
    const P = buildParams(s);
    let vals = getVals(s, P);
    const n = xs.length, np = vals.length;
    const resid = () => { const m = modelSum(s, xs); return ysub.map((v, i) => v - m[i]); };
    const chi = r => r.reduce((a, v, i) => a + w[i] * v * v, 0);
    const clamp = v => v.map((t, i) => Math.min(P[i].hi, Math.max(P[i].lo, t)));
    const jac = () => {
      const m0 = modelSum(s, xs), J = [];
      for (let k = 0; k < np; k++) {
        const hstep = Math.max(1e-6, Math.abs(vals[k]) * 1e-5);
        const v2 = vals.slice(); v2[k] += hstep;
        applyParams(s, P, v2);
        const m2 = modelSum(s, xs);
        applyParams(s, P, vals);
        J.push(m2.map((v, i) => (v - m0[i]) / hstep));
      }
      return J;
    };
    const normal = (J, r) => {
      const A = [], g = new Array(np).fill(0);
      for (let a = 0; a < np; a++) {
        A.push(new Array(np).fill(0));
        for (let i = 0; i < n; i++) g[a] += J[a][i] * w[i] * r[i];
        for (let b = 0; b <= a; b++) {
          let sum = 0;
          for (let i = 0; i < n; i++) sum += J[a][i] * w[i] * J[b][i];
          A[a][b] = sum; A[b][a] = sum;
        }
      }
      return { A, g };
    };
    applyParams(s, P, vals);
    let r = resid(), c2 = chi(r), lam = 1e-3, iter = 0, converged = np === 0;
    for (; iter < maxIter && np > 0;) {
      iter++;
      const { A, g } = normal(jac(), r);
      let improved = false;
      for (let tries = 0; tries < 12; tries++) {
        const M = A.map((row, a) => row.map((v, b) => a === b ? v * (1 + lam) + 1e-12 : v));
        const d = solve(M, g.slice());
        if (!d) { lam *= 10; continue; }
        const nv = clamp(vals.map((v, i) => v + d[i]));
        applyParams(s, P, nv);
        const r2 = resid(), c22 = chi(r2);
        if (c22 <= c2) {
          const rel = (c2 - c22) / Math.max(c2, 1e-300);
          vals = nv; r = r2; c2 = c22; lam = Math.max(lam / 10, 1e-9); improved = true;
          if (rel < 1e-9) converged = true;
          break;
        }
        applyParams(s, P, vals);
        lam *= 10;
      }
      if (!improved) { converged = true; break; }
      if (converged) break;
    }
    applyParams(s, P, vals);

    // Uncertainties: covariance = (JᵀWJ)⁻¹ · χ²_red (1σ, statistical only; background held fixed)
    const dof = Math.max(1, n - np), red = c2 / dof;
    const sig = {}, areaSig = s.comps.map(() => null);
    if (np > 0) {
      const { A } = normal(jac(), r);
      const C = invert(A);
      if (C) {
        P.forEach((p, i) => { const v = C[i][i] * red; sig[p.ci + '.' + p.key] = v > 0 ? Math.sqrt(v) : NaN; });
        if (s.shareFwhm && sig['0.fwhm'] !== undefined) s.comps.forEach((_, ci) => { sig[ci + '.fwhm'] = sig['0.fwhm']; });
        const A0 = s.comps.map(cp => compArea(s, cp));
        const G = P.map((p, k) => {
          const hstep = Math.max(1e-6, Math.abs(vals[k]) * 1e-4);
          const v2 = vals.slice(); v2[k] += hstep; applyParams(s, P, v2);
          const Ak = s.comps.map(cp => compArea(s, cp)); applyParams(s, P, vals);
          return Ak.map((a, ci) => (a - A0[ci]) / hstep);
        });
        s.comps.forEach((_, ci) => {
          let v = 0;
          for (let a = 0; a < np; a++) for (let b = 0; b < np; b++) v += G[a][ci] * C[a][b] * G[b][ci];
          areaSig[ci] = v * red > 0 ? Math.sqrt(v * red) : 0;
        });
      }
    }
    s.fit = { iterations: iter, converged, nFree: np, sig, areaSig, sigOf: signature(s) };
    return stats(s);
  }
  function fitErrors(s) { return s.fit && s.fit.sigOf === signature(s) ? s.fit : null; }

  function stats(s) {
    const x = xOf(s), B = background(s, x);
    if (!B || !s.comps.length) return null;
    const xs = x.slice(B.i0, B.i1 + 1), yobs = s.y.slice(B.i0, B.i1 + 1);
    const m = modelSum(s, xs), w = weights(s, yobs);
    let c2 = 0, ss = 0, st = 0;
    const mean = yobs.reduce((a, v) => a + v, 0) / yobs.length;
    const res = yobs.map((v, i) => {
      const r = v - (B.bg[i] + m[i]);
      c2 += w[i] * r * r; ss += r * r; st += (v - mean) * (v - mean);
      return r;
    });
    const nFree = buildParams(s).length, dof = Math.max(1, yobs.length - nFree);
    return { chi2: c2, redChi2: c2 / dof, dof, n: yobs.length, nFree, rmse: Math.sqrt(ss / yobs.length), r2: st > 0 ? 1 - ss / st : NaN, residuals: res };
  }

  function solve(A, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (Math.abs(A[piv][c]) < 1e-300) return null;
      [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / A[c][c];
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const x = new Array(n);
    for (let r = n - 1; r >= 0; r--) { let sum = b[r]; for (let k = r + 1; k < n; k++) sum -= A[r][k] * x[k]; x[r] = sum / A[r][r]; }
    return x.every(isFinite) ? x : null;
  }
  function invert(A) {
    const n = A.length, cols = [];
    for (let j = 0; j < n; j++) {
      const e = new Array(n).fill(0); e[j] = 1;
      const c = solve(A.map(r => r.slice()), e);
      if (!c) return null;
      cols.push(c);
    }
    return A.map((_, i) => cols.map(c => c[i]));
  }

  // ======================================================================
  // Quantification
  // ======================================================================
  // Scofield photoionisation cross-sections for Al Kα, relative to C 1s = 1.00.
  // Reference values only: use the sensitivity-factor library of your own instrument when available.
  const RSF = {
    'C 1s': 1.00, 'N 1s': 1.80, 'O 1s': 2.93, 'F 1s': 4.43, 'Na 1s': 8.52,
    'Al 2p': 0.537, 'Si 2p': 0.817, 'P 2p': 1.19, 'S 2p': 1.68, 'Cl 2p': 2.29,
    'Sc 2p': 6.38, 'Sc 2p3/2': 4.21, 'Ti 2p': 7.81, 'Ti 2p3/2': 5.22, 'V 2p': 9.66, 'V 2p3/2': 6.37,
    'Cr 2p': 11.67, 'Cr 2p3/2': 7.69, 'Mn 2p': 13.91, 'Mn 2p3/2': 9.17, 'Fe 2p': 16.40, 'Fe 2p3/2': 10.80,
    'Co 2p': 19.14, 'Co 2p3/2': 12.60, 'Ni 2p': 22.17, 'Ni 2p3/2': 14.60, 'Cu 2p': 25.40, 'Cu 2p3/2': 16.70,
    'Zn 2p': 28.70, 'Zn 2p3/2': 18.90, 'Ga 2p': 32.50, 'Ga 2p3/2': 21.40,
    'Y 3d': 5.98, 'Zr 3d': 7.04, 'Zr 3d5/2': 4.17, 'Nb 3d': 8.21, 'Nb 3d5/2': 4.86, 'Mo 3d': 9.50, 'Mo 3d5/2': 5.62,
    'Ru 3d': 12.49, 'Ru 3d5/2': 7.39, 'Rh 3d': 14.19, 'Rh 3d5/2': 8.39, 'Pd 3d': 16.04, 'Pd 3d5/2': 9.48,
    'Ag 3d': 18.08, 'Ag 3d5/2': 10.70, 'In 3d': 22.52, 'In 3d5/2': 13.30, 'Sn 3d': 25.10, 'Sn 3d5/2': 14.80,
    'Sb 3d': 27.80, 'Sb 3d5/2': 16.40, 'La 3d': 47.60, 'La 3d5/2': 28.10, 'Ce 3d': 51.60, 'Ce 3d5/2': 30.50,
    'Hf 4f': 7.52, 'Hf 4f7/2': 4.20, 'Ta 4f': 8.62, 'Ta 4f7/2': 4.82, 'W 4f': 9.80, 'W 4f7/2': 5.48,
    'Re 4f': 11.08, 'Re 4f7/2': 6.20, 'Os 4f': 12.44, 'Os 4f7/2': 6.96, 'Ir 4f': 13.90, 'Ir 4f7/2': 7.78,
    'Pt 4f': 15.45, 'Pt 4f7/2': 8.65, 'Au 4f': 17.12, 'Au 4f7/2': 9.58, 'Pb 4f': 22.70, 'Pb 4f7/2': 12.70,
    'Bi 4f': 24.80, 'Bi 4f7/2': 13.90
  };
  function guessRsfKey(s) {
    const nm = (s.name || '').replace(/\s+/g, ' ').trim();
    const m = nm.match(/^([A-Z][a-z]?)\s*(\d[spdf])\s*(\d\/\d)?/);
    if (!m) return null;
    const base = m[1] + ' ' + m[2];
    if (m[3] && RSF[base + m[3]]) return base + m[3];
    if (!RSF[base]) return null;
    const hasDoublet = s.comps.some(c => c.doublet);
    const sub = Object.keys(RSF).find(k => k.startsWith(base) && k !== base);
    if (!sub || hasDoublet || !s.comps.length) return base;
    return sub;
  }
  function regionIntensity(s) {
    const x = xOf(s), B = background(s, x);
    if (!B) return null;
    if (s.comps.length) {
      const areas = s.comps.map(cp => compArea(s, cp));
      return { total: areas.reduce((a, v) => a + v, 0), areas, fromFit: true };
    }
    let tot = 0;
    for (let i = B.i0 + 1; i <= B.i1; i++) tot += 0.5 * ((s.y[i - 1] - B.bg[i - 1 - B.i0]) + (s.y[i] - B.bg[i - B.i0])) * (x[i] - x[i - 1]);
    return { total: tot, areas: [], fromFit: false };
  }
  function toCps(s, A) { return s.unit === 'counts' && s.acq > 0 ? A / s.acq : A; }
  function quantify(list, opts = {}) {
    const n = opts.imfpExp || 0;
    const rows = list.map(s => {
      const R = regionIntensity(s);
      const rsf = s.rsf ?? (s.rsfKey ? RSF[s.rsfKey] : null) ?? (guessRsfKey(s) ? RSF[guessRsfKey(s)] : null);
      if (!R || !(rsf > 0)) return { s, R, rsf, ok: false };
      const be = s.comps.length ? s.comps.reduce((a, c) => a + c.center, 0) / s.comps.length : (s.region[0] + s.region[1]) / 2;
      const ke = (s.hv || 1486.6) - be;
      const I = toCps(s, R.total);
      return { s, R, rsf, ke, I, corr: I / (rsf * Math.pow(Math.max(ke, 1), n)), ok: R.total > 0 };
    });
    const sum = rows.filter(r => r.ok).reduce((a, r) => a + r.corr, 0);
    rows.forEach(r => {
      r.at = r.ok && sum > 0 ? 100 * r.corr / sum : null;
      r.comps = r.ok && r.R.fromFit ? r.s.comps.map((cp, i) => ({ name: cp.name, at: r.at * r.R.areas[i] / r.R.total })) : [];
    });
    return rows;
  }

  // ======================================================================
  // Methods text (English, for papers)
  // ======================================================================
  function methodsText(list, opts = {}) {
    const f = (v, d = 2) => Number(v).toFixed(d);
    const bgName = { shirley: 'an iterative Shirley', smart: 'a Shirley-type background constrained to lie at or below the smoothed data', tougaard: 'a two-parameter universal (U2) Tougaard', linear: 'a linear', none: 'no' };
    const out = [];
    out.push('XPS spectra were processed with XPS Fit Studio (version ' + VERSION + '; P. H. Le, University of Science, VNU-HCM, Vietnam; https://github.com/lephong2810/XPSFitStudio).');
    const cal = list.find(s => s.calib);
    if (cal) out.push('The binding-energy scale was charge-referenced by setting the ' + (cal.calib.line || 'C 1s') + ' peak of adventitious carbon to ' + f(cal.calib.ref, 1) + ' eV (applied shift ' + (cal.shift >= 0 ? '+' : '') + f(cal.shift) + ' eV).');
    else if (list.some(s => s.shift)) out.push('Binding energies were shifted by ' + list.map(s => s.name + ' ' + (s.shift >= 0 ? '+' : '') + f(s.shift) + ' eV').join(', ') + '.');
    list.forEach(s => {
      const lo = Math.min(...s.region), hi = Math.max(...s.region);
      const an = (s.anchors || []).length;
      let t = 'For the ' + s.name + ' region (' + f(lo, 1) + '–' + f(hi, 1) + ' eV), ' + bgName[s.bgType] + (s.bgType === 'none' ? ' background was used' : ' background was subtracted') +
        (s.bgType !== 'none' ? ' (end-point intensities averaged over ' + s.bgAvg + ' points' + (an ? '; ' + an + ' intermediate anchor point' + (an > 1 ? 's' : '') + ' at ' + s.anchors.map(a => f(a.x, 1)).join(', ') + ' eV' : '') + ((s.endY || []).some(v => v !== null && v !== undefined) || s.anchors.some(a => a.y !== null && a.y !== undefined) ? '; some background levels were set manually' : '') + ')' : '') + '.';
      if (s.comps.length) {
        const shapes = [...new Set(s.comps.map(c => c.shape))];
        const sd = { gl: 'Gaussian–Lorentzian product functions', sgl: 'Gaussian–Lorentzian sum (pseudo-Voigt) functions', la: 'asymmetric Lorentzian functions convolved with a Gaussian (LA)' };
        t += ' The envelope was fitted with ' + s.comps.length + ' component' + (s.comps.length > 1 ? 's' : '') + ' (' + s.comps.map(c => c.name + ' ' + shapeLabel(c)).join('; ') + ') using ' + shapes.map(k => sd[k]).join(' and ') + '.';
        const dbl = s.comps.filter(c => c.doublet);
        if (dbl.length) t += ' Spin–orbit doublets were constrained to equal FWHM, fixed splitting (' + [...new Set(dbl.map(c => f(c.doublet.split)))].join(', ') + ' eV) and fixed area ratio (' + [...new Set(dbl.map(c => f(c.doublet.ratio)))].join(', ') + ').';
        if (s.shareFwhm) t += ' All components shared a common FWHM.';
        const fixed = s.comps.filter(c => Object.values(c.fix || {}).some(Boolean));
        if (fixed.length) t += ' Fixed parameters: ' + fixed.map(c => c.name + ' (' + Object.keys(c.fix).filter(k => c.fix[k]).map(k => ({ center: 'BE', fwhm: 'FWHM', height: 'height', mix: 'L%', a: 'α', b: 'β', g: 'G' }[k])).join(', ') + ')').join('; ') + '.';
        const st = stats(s);
        if (st) t += ' The reduced χ² was ' + f(st.redChi2) + ' (N = ' + st.n + ' points, ' + st.nFree + ' free parameters).';
      }
      out.push(t);
    });
    out.push('Fitting used Levenberg–Marquardt non-linear least squares with Poisson weighting (σ² = counts) and the background held fixed; component areas were integrated over the analysis region. Quoted uncertainties are 1σ values from the covariance matrix scaled by the reduced χ² and do not include the uncertainty of the background choice.');
    if (opts.quant) out.push('Atomic concentrations were calculated from background-subtracted peak areas (in counts s⁻¹) divided by ' + (opts.rsfSource || 'Scofield photoionisation cross-sections (Al Kα, relative to C 1s = 1)') + (opts.imfpExp ? ' and by KE^' + opts.imfpExp + ' to approximate the kinetic-energy dependence of the inelastic mean free path' : '') + '.');
    return out.join(' ');
  }

  return {
    VERSION, SHAPES, RSF,
    set t(fn) { T = fn || (s => s); },
    parseVamas, parseColumns, parseAny, makeSpectrum, reviveSpectrum, normComp,
    xOf, regionIdx, background, compCurve, mainLineAt, shapeVal, compArea, measuredFwhm, shapeLabel,
    fit, fitErrors, stats, signature, round, unitFactor,
    guessRsfKey, regionIntensity, toCps, quantify, methodsText
  };
})();
if (typeof module !== 'undefined') module.exports = XPS;
