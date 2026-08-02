/* 6 pozun prototip özellik vektörlerini üretir (muhur.html'e gömülecek). */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger, d2v } = H;

const TOUCH_CURL = 0.42;
function build({ touch = [], folded = [], thumbTuck = false, thumbUp = false, fan = 12 }) {
  const curl = { i: 0, m: 0, r: 0, p: 0 };
  for (const f of touch) curl[f] = TOUCH_CURL;
  for (const f of folded) curl[f] = 0.92;
  const FANS = { i: -fan, m: 0, r: fan, p: fan * 2.1 };
  const ch = {}; for (const f of ['i', 'm', 'r', 'p']) ch[f] = finger(f, curl[f], FANS[f]);
  let tip;
  if (touch.length) { tip = [0, 0, 0]; for (const f of touch) { const t = ch[f][3]; for (let k = 0; k < 3; k++) tip[k] += t[k] / touch.length; } tip[2] += 0.06; }
  else if (thumbTuck) tip = [-0.20, 0.80, 0.10];
  else if (thumbUp) tip = [-0.78, 1.05, 0.14];
  else tip = [-0.92, 0.90, 0.18];
  const base = [-0.35, 0.25, 0.05], th = [base];
  for (let k = 1; k <= 3; k++) { const t = k / 3, bow = Math.sin(t * Math.PI) * 0.10;
    th.push([base[0] + (tip[0] - base[0]) * t - bow, base[1] + (tip[1] - base[1]) * t, base[2] + (tip[2] - base[2]) * t + bow]); }
  const lm3 = [[0, 0, 0], ...th];
  for (const f of ['i', 'm', 'r', 'p']) lm3.push(...ch[f]);
  return lm3.map(([x, y, z]) => ({ x: 0.5 + x * 0.09, y: 0.90 - y * 0.09, z: 0 }));
}
function feat(lm) {
  const pw = d2v(lm[5], lm[17]) || 1e-6;
  const ext = (t, p) => d2v(lm[t], lm[0]) / (d2v(lm[p], lm[0]) || 1e-6);
  return [ext(8, 6), ext(12, 10), ext(16, 14), ext(20, 18),
    d2v(lm[4], lm[8]) / pw, d2v(lm[4], lm[12]) / pw, d2v(lm[4], lm[16]) / pw, d2v(lm[4], lm[20]) / pw,
    d2v(lm[4], lm[17]) / pw];
}
const POSES = {
  fire:  { touch: ['i'] },
  air:   {},
  water: { folded: ['p'], thumbTuck: true },
  bolt:  { folded: ['i', 'm', 'r'] },
  earth: { folded: ['m', 'r'], thumbTuck: true },
  gun:   { folded: ['r', 'p'], thumbUp: true },
};
const out = {};
for (const [k, v] of Object.entries(POSES)) out[k] = feat(build(v)).map(x => +x.toFixed(4));
console.log(JSON.stringify(out, null, 1).replace(/\n\s+/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']'));

/* eşik kalibrasyonu: doğru poz ne kadar uzakta olabilir, belirsizlik marjı ne olmalı */
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const TIPS = { 8: 5, 12: 9, 16: 13, 20: 17 };
function jitter(lm, s) {
  const sc = d2v(lm[0], lm[9]) || 1e-6;
  const o = lm.map(p => ({ x: p.x, y: p.y, z: 0 }));
  for (let i = 0; i < o.length; i++) {
    let k = sc * s;
    if (TIPS[i] !== undefined && d2v(lm[i], lm[4]) / sc < 0.35) {
      k *= 3.5; const m = lm[TIPS[i]], vx = m.x - lm[i].x, vy = m.y - lm[i].y, vl = Math.hypot(vx, vy) || 1e-6;
      o[i].x += vx / vl * sc * 0.10; o[i].y += vy / vl * sc * 0.10;
    }
    o[i].x += gauss() * k; o[i].y += gauss() * k;
  }
  return o;
}
const W = [1.6, 1.6, 1.6, 1.6, 1.5, 1, 1, 1, 1.3];
const dist = (a, b) => Math.hypot(...a.map((v, k) => (v - b[k]) * W[k]));
const NAMES = Object.keys(POSES), CLEAN = {};
for (const n of NAMES) CLEAN[n] = build(POSES[n]);
console.log('\n// σ=%4.5 altında: doğru prototipe mesafe (d1) ve ikinciye oran (d2/d1)');
let maxD1 = 0, minRatio = 1e9;
for (const n of NAMES) {
  const ds = [], rs = [];
  for (let k = 0; k < 3000; k++) {
    const f = feat(jitter(CLEAN[n], 0.045));
    const sorted = NAMES.map(m => [dist(f, out[m]), m]).sort((a, b) => a[0] - b[0]);
    if (sorted[0][1] === n) { ds.push(sorted[0][0]); rs.push(sorted[1][0] / (sorted[0][0] || 1e-6)); }
  }
  ds.sort((a, b) => a - b); rs.sort((a, b) => a - b);
  const p95 = ds[Math.floor(ds.length * 0.95)], r05 = rs[Math.floor(rs.length * 0.05)];
  maxD1 = Math.max(maxD1, p95); minRatio = Math.min(minRatio, r05);
  console.log(`//   ${n.padEnd(6)} d1(%95) = ${p95.toFixed(3)}   d2/d1(%5) = ${r05.toFixed(2)}`);
}
console.log(`// → RED_MESAFE ≈ ${(maxD1 * 1.35).toFixed(2)}   RED_ORAN ≈ ${(minRatio * 0.9).toFixed(2)}`);
