/* Silah pozu dizinin kapatıcısı olunca 6 sınıflı hale geliyor.
   Kritik soru: Su (işaret+orta+yüzük) ile Silah (işaret+orta) ayrılıyor mu? */
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
  else if (thumbUp) tip = [-0.78, 1.05, 0.14];        /* silah: baş parmak yukarı-yana dik */
  else tip = [-0.92, 0.90, 0.18];
  const base = [-0.35, 0.25, 0.05], th = [base];
  for (let k = 1; k <= 3; k++) { const t = k / 3, bow = Math.sin(t * Math.PI) * 0.10;
    th.push([base[0] + (tip[0] - base[0]) * t - bow, base[1] + (tip[1] - base[1]) * t, base[2] + (tip[2] - base[2]) * t + bow]); }
  const lm3 = [[0, 0, 0], ...th];
  for (const f of ['i', 'm', 'r', 'p']) lm3.push(...ch[f]);
  return lm3.map(([x, y, z]) => ({ x: 0.5 + x * 0.09, y: 0.90 - y * 0.09, z: 0 }));
}

const BASE = {
  '🔥 Ateş  (baş+işaret)':      { touch: ['i'] },
  '🌪 Hava  (açık avuç)':        {},
  '💧 Su    (işaret+orta+yüzük)': { folded: ['p'], thumbTuck: true },
  '⚡ Yıldırım (baş+serçe)':     { folded: ['i', 'm', 'r'] },
  '🪨 Toprak (işaret+serçe 🤘)': { folded: ['m', 'r'], thumbTuck: true },
};
/* silahın iki tutuşu: baş parmak dik (klasik tabanca) vs avuçta kapalı */
const VARIANTS = {
  'Silah: baş parmak DİK (👉 tabanca)': { folded: ['r', 'p'], thumbUp: true },
  'Silah: baş parmak KAPALI (✌ gibi)':  { folded: ['r', 'p'], thumbTuck: true },
};

function feat(lm) {
  const pw = d2v(lm[5], lm[17]) || 1e-6;
  const ext = (t, p) => d2v(lm[t], lm[0]) / (d2v(lm[p], lm[0]) || 1e-6);
  return [ext(8, 6), ext(12, 10), ext(16, 14), ext(20, 18),
    d2v(lm[4], lm[8]) / pw, d2v(lm[4], lm[12]) / pw, d2v(lm[4], lm[16]) / pw, d2v(lm[4], lm[20]) / pw,
    d2v(lm[4], lm[17]) / pw];
}
const W = [1.6, 1.6, 1.6, 1.6, 1.5, 1, 1, 1, 1.3];   /* baş–işaret teması ağırlıklı (Ateş↔Hava için) */
const dist = (a, b) => Math.hypot(...a.map((v, k) => (v - b[k]) * W[k]));
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const TIPS = { 8: 5, 12: 9, 16: 13, 20: 17 };
function jitter(lm, s) {
  const sc = d2v(lm[0], lm[9]) || 1e-6;
  const out = lm.map(p => ({ x: p.x, y: p.y, z: 0 }));
  for (let i = 0; i < out.length; i++) {
    let k = sc * s;
    if (TIPS[i] !== undefined && d2v(lm[i], lm[4]) / sc < 0.35) {
      k *= 3.5; const m = lm[TIPS[i]], vx = m.x - lm[i].x, vy = m.y - lm[i].y, vl = Math.hypot(vx, vy) || 1e-6;
      out[i].x += vx / vl * sc * 0.10; out[i].y += vy / vl * sc * 0.10;
    }
    out[i].x += gauss() * k; out[i].y += gauss() * k;
  }
  return out;
}

const N = 2500, pad = (s, n) => String(s).padEnd(n);
for (const [vName, vDef] of Object.entries(VARIANTS)) {
  const SET = { ...BASE, [vName]: vDef };
  const NAMES = Object.keys(SET), PROTO = {}, CLEAN = {};
  for (const n of NAMES) { CLEAN[n] = build(SET[n]); PROTO[n] = feat(CLEAN[n]); }
  console.log(`\n${'='.repeat(66)}\n${vName}\n${'='.repeat(66)}`);
  for (const sig of [0.025, 0.045, 0.070]) {
    const S = {}; for (const n of NAMES) S[n] = Array.from({ length: N }, () => feat(jitter(CLEAN[n], sig)));
    let tot = 0, ok = 0;
    const conf = {};
    for (const n of NAMES) {
      conf[n] = {};
      for (const s of S[n]) { let b = null, bd = 1e9; for (const m of NAMES) { const d = dist(s, PROTO[m]); if (d < bd) { bd = d; b = m; } } tot++; if (b === n) ok++; conf[n][b] = (conf[n][b] || 0) + 1; }
    }
    /* Su ↔ Silah özel */
    const su = NAMES.find(n => n.startsWith('💧')), gun = vName;
    let o = 0;
    for (const s of S[su]) if (dist(s, PROTO[su]) < dist(s, PROTO[gun])) o++;
    for (const s of S[gun]) if (dist(s, PROTO[gun]) < dist(s, PROTO[su])) o++;
    console.log(`\n σ=%${(sig * 100).toFixed(1)}  →  6 sınıflı doğruluk %${(ok / tot * 100).toFixed(1)}   ·   Su ↔ Silah ayrımı %${(o / (2 * N) * 100).toFixed(1)}`);
    if (sig >= 0.045) for (const n of NAMES) {
      const wrong = Object.entries(conf[n]).filter(([m]) => m !== n).sort((a, b) => b[1] - a[1])[0];
      console.log(`      ${pad(n, 36)} %${((conf[n][n] || 0) / N * 100).toFixed(1)}${wrong ? `   → en çok karıştığı: ${wrong[0]} (%${(wrong[1] / N * 100).toFixed(1)})` : ''}`);
    }
  }
}
