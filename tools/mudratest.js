/* Mudra ayrılabilirlik ölçümü.
   Tablodaki mudraları sentetik iskeletle üretir, MediaPipe titremesi altında
   hangi 5'lisinin birbirinden EN GÜVENİLİR ayrıldığını brute-force ile bulur. */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger, MCP, LEN, SEG, D2R, d2v } = H;

/* ---- mudra kurucusu ----
   touch: baş parmağın değdiği parmaklar (i/m/r/p). Değen parmak kıvrılır,
   baş parmak ucu onun ucuna oturur. Değmeyenler açık kalır (curl 0). */
const TOUCH_CURL = 0.42;                    /* uç, baş parmak hizasına inecek kadar */
function buildMudra({ touch = [], folded = [], thumbTuck = false, fan = 12 }) {
  const curl = { i: 0, m: 0, r: 0, p: 0 };
  for (const f of touch) curl[f] = TOUCH_CURL;
  for (const f of folded) curl[f] = 0.92;
  const FANS = { i: -fan, m: 0, r: fan, p: fan * 2.1 };
  const chains = {};
  for (const f of ['i', 'm', 'r', 'p']) chains[f] = finger(f, curl[f], FANS[f]);

  /* baş parmak: değdiği parmakların uç ortalamasına git; yoksa açık ya da avuca gömülü */
  let tip;
  if (touch.length) {
    tip = [0, 0, 0];
    for (const f of touch) { const t = chains[f][3]; for (let k = 0; k < 3; k++) tip[k] += t[k] / touch.length; }
    tip[2] += 0.06;                                       /* baş parmak parmağın önünde durur */
  } else if (thumbTuck) tip = [-0.20, 0.80, 0.10];        /* avuca kapalı (Tarjani/yumruk) */
  else tip = [-0.92, 0.90, 0.18];                         /* tam açık/ayrık (Abhaya) */

  const base = [-0.35, 0.25, 0.05];                        /* CMC */
  const th = [base];
  for (let k = 1; k <= 3; k++) {                           /* MCP, IP, TIP: hafif yay */
    const t = k / 3, bow = Math.sin(t * Math.PI) * 0.10;
    th.push([base[0] + (tip[0] - base[0]) * t - bow, base[1] + (tip[1] - base[1]) * t, base[2] + (tip[2] - base[2]) * t + bow]);
  }

  const lm3 = [[0, 0, 0], ...th];
  for (const f of ['i', 'm', 'r', 'p']) lm3.push(...chains[f]);
  return lm3.map(([x, y, z]) => ({ x: 0.5 + x * 0.09, y: 0.90 - y * 0.09, z: 0 }));
}

/* ---- tablodaki mudralar ---- */
const MUDRA = {
  'Gyan (baş+işaret)':        { touch: ['i'] },
  'Shuni (baş+orta)':         { touch: ['m'] },
  'Surya (baş+yüzük)':        { touch: ['r'] },
  'Buddhi (baş+serçe)':       { touch: ['p'] },
  'Vayu (işaret katlı)':      { folded: ['i'], thumbTuck: true },
  'Abhaya (tam açık avuç)':   {},
  'Pran (baş+yüzük+serçe)':   { touch: ['r', 'p'] },
  'Apana/Mrigi (baş+orta+yüzük)': { touch: ['m', 'r'] },
  'Rudra (baş+işaret+yüzük)': { touch: ['i', 'r'] },
  'Vata-naashak (baş+iş+orta)': { touch: ['i', 'm'] },
  'Tarjani (sadece işaret)':  { folded: ['m', 'r', 'p'], thumbTuck: true },
};

/* ---- özellik vektörü: MediaPipe'tan güvenilir okunabilen büyüklükler ---- */
function feat(lm) {
  const palmWid = d2v(lm[5], lm[17]) || 1e-6;
  const ext = (tip, pip) => d2v(lm[tip], lm[0]) / (d2v(lm[pip], lm[0]) || 1e-6);
  return [
    ext(8, 6), ext(12, 10), ext(16, 14), ext(20, 18),        /* hangi parmaklar açık */
    d2v(lm[4], lm[8]) / palmWid, d2v(lm[4], lm[12]) / palmWid, /* baş parmak hangi uca yakın */
    d2v(lm[4], lm[16]) / palmWid, d2v(lm[4], lm[20]) / palmWid,
  ];
}
const W = [1.6, 1.6, 1.6, 1.6, 1, 1, 1, 1];                  /* açıklık sinyali daha güvenilir → ağırlıklı */
const dist = (a, b) => Math.hypot(...a.map((v, k) => (v - b[k]) * W[k]));

/* ---- gerçekçi hata modeli ----
   Bağımsız gauss gürültü MediaPipe'ı temsil etmiyor. Gerçekte iki ek etki var:
   1) KAPANMA: baş parmağın örttüğü parmak ucu görünmez olur; ağ onu tahmin eder,
      hatası birkaç kat büyür ve parmağın kök yönüne doğru SİSTEMATİK kayar.
   2) Bükülü parmakların uçları da kısmen kapalıdır, hataları artar.
   Bu iki etki tam olarak "baş parmak hangi parmağa değiyor" sinyalini aşındırır. */
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const TIPS = { 8: 5, 12: 9, 16: 13, 20: 17 };            /* uç → kök (MCP) */
function jitter(lm, s, occ = true) {
  const scale = (d2v(lm[0], lm[9]) || 1e-6);
  const out = lm.map(p => ({ x: p.x, y: p.y, z: 0 }));
  for (let i = 0; i < out.length; i++) {
    let k = scale * s;
    if (occ && TIPS[i] !== undefined) {
      const dThumb = d2v(lm[i], lm[4]) / scale;
      if (dThumb < 0.35) {                                /* baş parmak bu ucu örtüyor */
        k *= 3.5;
        const mcp = lm[TIPS[i]];                          /* köke doğru sistematik kayma */
        const vx = mcp.x - lm[i].x, vy = mcp.y - lm[i].y, vl = Math.hypot(vx, vy) || 1e-6;
        out[i].x += vx / vl * scale * 0.10; out[i].y += vy / vl * scale * 0.10;
      }
    }
    out[i].x += gauss() * k; out[i].y += gauss() * k;
  }
  return out;
}

const NAMES = Object.keys(MUDRA);
const CLEAN = {}, PROTO = {};
for (const n of NAMES) { CLEAN[n] = buildMudra(MUDRA[n]); PROTO[n] = feat(CLEAN[n]); }
let SAMPLES = {};
const N = 1500;
let SIGMA = 0.025;
function resample(sig) { SIGMA = sig; SAMPLES = {}; for (const n of NAMES) SAMPLES[n] = Array.from({ length: N }, () => feat(jitter(CLEAN[n], sig))); }
resample(0.045);

/* ---- ikili ayrılabilirlik: A örnekleri A prototipine mi daha yakın? ---- */
function pairScore(a, b) {
  let ok = 0;
  for (const s of SAMPLES[a]) if (dist(s, PROTO[a]) < dist(s, PROTO[b])) ok++;
  for (const s of SAMPLES[b]) if (dist(s, PROTO[b]) < dist(s, PROTO[a])) ok++;
  return ok / (2 * N);
}
let P = {};
function scoreAll() {
  P = {}; const pairs = [];
  for (let i = 0; i < NAMES.length; i++) for (let j = i + 1; j < NAMES.length; j++) {
    const s = pairScore(NAMES[i], NAMES[j]);
    P[NAMES[i] + '|' + NAMES[j]] = P[NAMES[j] + '|' + NAMES[i]] = s;
    pairs.push([s, NAMES[i], NAMES[j]]);
  }
  return pairs.sort((a, b) => a[0] - b[0]);
}
/* önce kırılganlık sıralamasını bul: gürültüyü artırarak hangi çiftler önce çöküyor */
console.log('KIRILGANLIK TARAMASI — kapanma modeli açık, en zayıf 6 çift:\n');
for (const sig of [0.025, 0.045, 0.070]) {
  resample(sig);
  const pairs = scoreAll();
  console.log(`σ=%${(sig * 100).toFixed(1)}`);
  for (const [s, a, b] of pairs.slice(0, 6)) console.log(`   %${(s * 100).toFixed(1)}  ${a}  ↔  ${b}`);
  console.log('');
}
resample(0.045);
const pairs = scoreAll();

/* ---- ergonomi (yapma kolaylığı) — ölçüm değil, benim değerlendirmem 1..5 ---- */
const EASE = {
  'Gyan (baş+işaret)': 5, 'Shuni (baş+orta)': 4, 'Surya (baş+yüzük)': 3, 'Buddhi (baş+serçe)': 2,
  'Vayu (işaret katlı)': 3, 'Abhaya (tam açık avuç)': 5, 'Pran (baş+yüzük+serçe)': 2,
  'Apana/Mrigi (baş+orta+yüzük)': 3, 'Rudra (baş+işaret+yüzük)': 2, 'Vata-naashak (baş+iş+orta)': 3,
  'Tarjani (sadece işaret)': 5,
};

/* ---- en iyi 5'li: en zayıf ikili ayrımı maksimize et (462 kombinasyon) ---- */
function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}
const best = combos(NAMES, 5).map(c => {
  let worst = 1;
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) worst = Math.min(worst, P[c[i] + '|' + c[j]]);
  const ease = c.reduce((s, n) => s + EASE[n], 0) / 5;
  return { c, worst, ease };
}).sort((a, b) => (b.worst - a.worst) || (b.ease - a.ease));

console.log('\n\nEN İYİ 5\'Lİ SETLER (en zayıf ikili ayrım · ortalama kolaylık):\n');
for (const b of best.slice(0, 5)) {
  console.log(`  en zayıf ayrım %${(b.worst * 100).toFixed(1)}  ·  kolaylık ${b.ease.toFixed(1)}/5`);
  for (const n of b.c) console.log(`      ${n}  (kolaylık ${EASE[n]})`);
  console.log('');
}
/* kolaylığı da hesaba katan seçim: ayrım >= %99 olanlar arasında en kolayı */
const safe = best.filter(b => b.worst >= 0.99).sort((a, b) => b.ease - a.ease)[0];
if (safe) {
  console.log(`ÖNERİ (ayrım ≥%99 olanlar içinde en kolayı) — en zayıf ayrım %${(safe.worst * 100).toFixed(1)}, kolaylık ${safe.ease.toFixed(1)}/5:`);
  for (const n of safe.c) console.log(`   • ${n}  (kolaylık ${EASE[n]})`);
}

/* ---- önerilen setin gürültü dayanıklılığı ---- */
const SET = ['Gyan (baş+işaret)','Shuni (baş+orta)','Surya (baş+yüzük)','Abhaya (tam açık avuç)','Tarjani (sadece işaret)'];
console.log('\n\nÖNERİLEN SETİN DAYANIKLILIĞI (5 sınıflı, en yakın prototip):\n');
for (const sig of [0.025,0.045,0.070,0.100]) {
  resample(sig);
  let worst=1, worstPair='', tot=0, ok=0;
  for (let i=0;i<5;i++) for (let j=i+1;j<5;j++){ const s=pairScore(SET[i],SET[j]); if(s<worst){worst=s;worstPair=`${SET[i]} ↔ ${SET[j]}`;} }
  for (const n of SET) for (const s of SAMPLES[n]) {   /* 5 sınıflı tam sınıflandırma */
    let best=null,bd=1e9; for(const m of SET){const d=dist(s,PROTO[m]); if(d<bd){bd=d;best=m;}}
    tot++; if(best===n) ok++;
  }
  console.log(`  σ=%${(sig*100).toFixed(1)}  →  5 sınıflı doğruluk %${(ok/tot*100).toFixed(1)}  ·  en zayıf çift %${(worst*100).toFixed(1)} (${worstPair})`);
}
