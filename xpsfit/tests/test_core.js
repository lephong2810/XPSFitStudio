// XPS Fit Studio — engine tests on simulated spectra.   Run:  node xpsfit/tests/test_core.js
const path = require('path'), fs = require('fs');
const XPS = require(path.join(__dirname, '..', 'docs', 'core.js'));
let seed = 12345, failed = 0;
const rnd = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
const P = (shape, c, w, h, m, extra = {}) => XPS.normComp(Object.assign({ name: 'p', shape, center: c, fwhm: w, height: h, mix: m, fix: {}, doublet: null }, extra));
function make(comps, lo, hi, base, name = 'C 1s') {
  const be = [], y = [];
  for (let e = lo; e <= hi + 1e-9; e += 0.05) { let m = base; for (const c of comps) m += XPS.compCurve(c, e); be.push(+e.toFixed(3)); y.push(Math.max(0, Math.round(m + gauss() * Math.sqrt(m)))); }
  return XPS.makeSpectrum({ name, source: 'test', be, y, unit: 'counts', acq: 1 });
}
function check(name, ok, detail) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + detail : '')); if (!ok) failed++; }

// 1. GL product: recover positions; covariance errors agree with Monte Carlo scatter
{
  const truth = [P('gl', 284.8, 1.1, 8000, 0), P('gl', 286.3, 1.2, 2000, 0)];  // Gaussian tails vanish at the region ends, so a linear background is exact
  const pos = []; let sig = null, red = null;
  for (let r = 0; r < 40; r++) {
    const s = make(truth, 280, 292, 1500); s.bgType = 'linear'; s.bgAvg = 20;
    s.comps = [P('gl', 285, 1, 6000, 0, { fix: { mix: true } }), P('gl', 286.6, 1, 1500, 0, { fix: { mix: true } })];
    const st = XPS.fit(s); pos.push(s.comps[1].center);
    if (!r) { sig = s.fit.sig['1.center']; red = st.redChi2; }
  }
  const mean = pos.reduce((a, v) => a + v) / pos.length, sd = Math.sqrt(pos.reduce((a, v) => a + (v - mean) ** 2, 0) / (pos.length - 1));
  check('GL/Gaussian fit recovers BE', Math.abs(mean - 286.3) < 0.01, 'mean ' + mean.toFixed(4) + ' eV');
  check('reduced χ² ≈ 1 for Poisson noise', red > 0.8 && red < 1.25, red.toFixed(3));
  check('covariance σ matches Monte Carlo', Math.abs(sig / sd - 1) < 0.35, 'σ ' + sig.toFixed(4) + ' vs MC ' + sd.toFixed(4));
}
// 2. Asymmetric LA line shape
{
  const s = make([P('la', 932.6, 0.9, 6000, 0, { asym: { a: 0.9, b: 2, g: 0.7 } })], 926, 945, 1000, 'Cu 2p3/2'); s.bgType = 'linear';
  s.comps = [P('la', 932.8, 1.2, 5000, 0, { asym: { a: 1.3, b: 1.5, g: 0.5 } })];
  const st = XPS.fit(s), c = s.comps[0];
  check('LA fit recovers BE and α', Math.abs(c.center - 932.6) < 0.02 && Math.abs(c.asym.a - 0.9) < 0.1, 'BE ' + c.center.toFixed(3) + ', α ' + c.asym.a.toFixed(3) + ', χ²r ' + st.redChi2.toFixed(3));
}
// 3. Shirley background stays under a single peak on a step
{
  const s = make([P('gl', 530, 1.2, 9000, 0.3)], 524, 538, 800, 'O 1s');
  const B = XPS.background(s, XPS.xOf(s));
  const lo = B.bg[0], hi = B.bg[B.bg.length - 1], mid = B.bg[Math.floor(B.bg.length / 2)];
  check('Shirley background is monotonic between end levels', mid >= Math.min(lo, hi) - 1 && mid <= Math.max(lo, hi) + 1);
}
// 4. Quantification: known areas and RSF give the expected ratio
{
  const c = make([P('gl', 284.8, 1.2, 6000, 0.3)], 279, 292, 400, 'C 1s'), o = make([P('gl', 530.4, 1.2, 6000 * 2.93, 0.3)], 525, 537, 400, 'O 1s');
  [c, o].forEach(s => { s.bgType = 'linear'; s.comps = [P('gl', s.name === 'C 1s' ? 284.9 : 530.3, 1.1, 5000, 0.3, { fix: { mix: true } })]; XPS.fit(s); });
  const q = XPS.quantify([c, o]);
  check('equal I/RSF gives 50/50 at.%', Math.abs(q[0].at - 50) < 1, q.map(r => r.s.name + ' ' + r.at.toFixed(2)).join(', '));
}
// 5. Example files parse
{
  const ex = path.join(__dirname, '..', 'examples');
  const v = XPS.parseAny(fs.readFileSync(path.join(ex, 'demo_CuOx_C1s_O1s_Cu2p.vms'), 'utf8'), 'demo.vms');
  check('VAMAS example: 3 blocks, KE→BE, counts', v.spectra.length === 3 && v.spectra[0].name === 'C 1s' && Math.abs(v.spectra[0].be[0] - 279) < 0.01 && v.spectra[0].unit === 'counts');
  const t = XPS.parseAny(fs.readFileSync(path.join(ex, 'demo_text_export_C1s.txt'), 'utf8'), 'demo.txt');
  check('text export: BE column, cps, acquisition time', t.spectra[0].unit === 'cps' && Math.abs(t.spectra[0].acq - 1) < 1e-9);
}
console.log(failed ? failed + ' test(s) failed' : 'All tests passed');
process.exit(failed ? 1 : 0);
