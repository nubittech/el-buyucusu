/* Kullanıcının seçtiği 5 mühürün ayrılabilirlik ölçümü.
   Ateş: baş+işaret (👌) · Hava: açık avuç (🖐) · Su: 3 parmak
   Yıldırım: baş+serçe açık (🤙) · Toprak: işaret+serçe açık (🤘) */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger, d2v } = H;

const TOUCH_CURL = 0.42;
function build({ touch = [], folded = [], thumbTuck = false, fan = 12 }) {
  const curl = { i: 0, m: 0, r: 0, p: 0 };
  for (const f of touch) curl[f] = TOUCH_CURL;
  for (const f of folded) curl[f] = 0.92;
  const FANS = { i: -fan, m: 0, r: fan, p: fan * 2.1 };
  const ch = {}; for (const f of ['i', 'm', 'r', 'p']) ch[f] = finger(f, curl[f], FANS[f]);
  let tip;
  if (touch.length) { tip = [0, 0, 0]; for (const f of touch) { const t = ch[f][3]; for (let k = 0; k < 3; k++) tip[k] += t[k] / touch.length; } tip[2] += 0.06; }
  else if (thumbTuck) tip = [-0.20, 0.80, 0.10];
  else tip = [-0.92, 0.90, 0.18];
  const base = [-0.35, 0.25, 0.05], th = [base];
  for (let k = 1; k <= 3; k++) { const t = k / 3, bow = Math.sin(t * Math.PI) * 0.10;
    th.push([base[0] + (tip[0] - base[0]) * t - bow, base[1] + (tip[1] - base[1]) * t, base[2] + (tip[2] - base[2]) * t + bow]); }
  const lm3 = [[0, 0, 0], ...th];
  for (const f of ['i', 'm', 'r', 'p']) lm3.push(...ch[f]);
  return lm3.map(([x, y, z]) => ({ x: 0.5 + x * 0.09, y: 0.90 - y * 0.09, z: 0 }));
}

/* --- kullanıcının seti. "3 parmak" iki okumayla da sınanıyor --- */
const SETS = {
  'A — 3 parmak = işaret+orta+yüzük': {
    '🔥 Ateş  (baş+işaret)':        { touch: ['i'] },
    '🌪 Hava  (açık avuç)':          {},
    '💧 Su    (işaret+orta+yüzük)':  { folded: ['p'], thumbTuck: true },
    '⚡ Yıldırım (baş+serçe açık)':  { folded: ['i', 'm', 'r'] },
    '🪨 Toprak (işaret+serçe 🤘)':   { folded: ['m', 'r'], thumbTuck: true },
  },
  'B — 3 parmak = orta+yüzük+serçe': {
    '🔥 Ateş  (baş+işaret)':        { touch: ['i'] },
    '🌪 Hava  (açık avuç)':          {},
    '💧 Su    (orta+yüzük+serçe)':   { folded: ['i'], thumbTuck: true },
    '⚡ Yıldırım (baş+serçe açık)':  { folded: ['i', 'm', 'r'] },
    '🪨 Toprak (işaret+serçe 🤘)':   { folded: ['m', 'r'], thumbTuck: true },
  },
};

function feat(lm) {
  const pw = d2v(lm[5], lm[17]) || 1e-6;
  const ext = (t, p) => d2v(lm[t], lm[0]) / (d2v(lm[p], lm[0]) || 1e-6);
  return [ext(8, 6), ext(12, 10), ext(16, 14), ext(20, 18),
    d2v(lm[4], lm[8]) / pw, d2v(lm[4], lm[12]) / pw, d2v(lm[4], lm[16]) / pw, d2v(lm[4], lm[20]) / pw,
    d2v(lm[4], lm[17]) / pw];                       /* baş parmak açıklığı — 🤙 vs 🤘 ayrımı */
}
const W = [1.6, 1.6, 1.6, 1.6, 1, 1, 1, 1, 1.3];
const dist = (a, b) => Math.hypot(...a.map((v, k) => (v - b[k]) * W[k]));

function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const TIPS = { 8: 5, 12: 9, 16: 13, 20: 17 };
function jitter(lm, s) {
  const sc = d2v(lm[0], lm[9]) || 1e-6;
  const out = lm.map(p => ({ x: p.x, y: p.y, z: 0 }));
  for (let i = 0; i < out.length; i++) {
    let k = sc * s;
    if (TIPS[i] !== undefined && d2v(lm[i], lm[4]) / sc < 0.35) {
      k *= 3.5;
      const m = lm[TIPS[i]], vx = m.x - lm[i].x, vy = m.y - lm[i].y, vl = Math.hypot(vx, vy) || 1e-6;
      out[i].x += vx / vl * sc * 0.10; out[i].y += vy / vl * sc * 0.10;
    }
    out[i].x += gauss() * k; out[i].y += gauss() * k;
  }
  return out;
}

const N = 2500, pad = (s, n) => String(s).padEnd(n);
for (const [setName, SET] of Object.entries(SETS)) {
  const NAMES = Object.keys(SET);
  const PROTO = {}, CLEAN = {};
  for (const n of NAMES) { CLEAN[n] = build(SET[n]); PROTO[n] = feat(CLEAN[n]); }
  console.log(`\n${'='.repeat(64)}\n${setName}\n${'='.repeat(64)}`);
  for (const sig of [0.025, 0.045, 0.070, 0.100]) {
    const S = {}; for (const n of NAMES) S[n] = Array.from({ length: N }, () => feat(jitter(CLEAN[n], sig)));
    let tot = 0, ok = 0, worst = 1, wp = '';
    const perClass = {};
    for (const n of NAMES) {
      let c = 0;
      for (const s of S[n]) { let b = null, bd = 1e9; for (const m of NAMES) { const d = dist(s, PROTO[m]); if (d < bd) { bd = d; b = m; } } tot++; if (b === n) { ok++; c++; } }
      perClass[n] = c / N;
    }
    for (let i = 0; i < NAMES.length; i++) for (let j = i + 1; j < NAMES.length; j++) {
      let o = 0;
      for (const s of S[NAMES[i]]) if (dist(s, PROTO[NAMES[i]]) < dist(s, PROTO[NAMES[j]])) o++;
      for (const s of S[NAMES[j]]) if (dist(s, PROTO[NAMES[j]]) < dist(s, PROTO[NAMES[i]])) o++;
      const sc = o / (2 * N); if (sc < worst) { worst = sc; wp = `${NAMES[i]} ↔ ${NAMES[j]}`; }
    }
    console.log(`\n σ=%${(sig * 100).toFixed(1)}  →  5 sınıflı doğruluk %${(ok / tot * 100).toFixed(1)}   en zayıf çift %${(worst * 100).toFixed(1)}  (${wp})`);
    if (sig >= 0.07) for (const n of NAMES) console.log(`      ${pad(n, 34)} %${(perClass[n] * 100).toFixed(1)}`);
  }
}
