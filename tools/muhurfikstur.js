/* FİKSTÜR ÜRETİCİ — C# portunu JS'e karşı doğrulamak için ortak veri.
     node tools/muhurfikstur.js > /tmp/muhur-fikstur.json

   Neden dosya: iki dilde aynı rastgele sayıları üretmeye çalışmak portu
   doğrulamaz, PRNG'yi doğrular. Landmark'lar burada BİR KEZ üretilip yazılıyor;
   C# tarafı yalnız okuyor. Böylece karşılaştırılan tek şey hesabın kendisi.

   Tohumlu PRNG (mulberry32) kullanılıyor ki fikstür koşumdan koşuma aynı kalsın;
   bir sapma çıktığında aynı veriyle tekrar üretilebilsin. */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger } = H;
require('../muhur.js');
const M = globalThis.MUHUR;

/* --- tohumlu rastgele --- */
let _s = 0x9e3779b9;
function rnd() {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function gauss() { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/* --- sentetik poz üreteci (verifymuhur.js ile aynı model) --- */
const TOUCH_CURL = 0.42;
const TUCK = [-0.20, 0.80, 0.10], FULL = [-0.92, 0.90, 0.18];
const GUN_LO = [-0.50, 0.95, 0.12], GUN_HI = [-0.85, 1.12, 0.16];
function build({ touch = [], folded = [], thumbTuck = false, thumbUp = false, thumbOpen = 1, fan = 12 }) {
  const curl = { i: 0, m: 0, r: 0, p: 0 };
  for (const f of touch) curl[f] = TOUCH_CURL;
  for (const f of folded) curl[f] = 0.92;
  const FANS = { i: -fan, m: 0, r: fan, p: fan * 2.1 };
  const ch = {}; for (const f of ['i', 'm', 'r', 'p']) ch[f] = finger(f, curl[f], FANS[f]);
  let tip;
  if (touch.length) { tip = [0, 0, 0]; for (const f of touch) { const t = ch[f][3]; for (let k = 0; k < 3; k++) tip[k] += t[k] / touch.length; } tip[2] += 0.06; }
  else if (thumbTuck) tip = TUCK.slice();
  else if (thumbUp) tip = GUN_LO.map((v, k) => v + (GUN_HI[k] - v) * thumbOpen);
  else tip = TUCK.map((v, k) => v + (FULL[k] - v) * thumbOpen);
  const base = [-0.35, 0.25, 0.05], th = [base];
  for (let k = 1; k <= 3; k++) {
    const t = k / 3, bow = Math.sin(t * Math.PI) * 0.10;
    th.push([base[0] + (tip[0] - base[0]) * t - bow, base[1] + (tip[1] - base[1]) * t, base[2] + (tip[2] - base[2]) * t + bow]);
  }
  const lm3 = [[0, 0, 0], ...th];
  for (const f of ['i', 'm', 'r', 'p']) lm3.push(...ch[f]);
  return lm3.map(([x, y, z]) => ({ x: 0.5 + x * 0.09, y: 0.90 - y * 0.09, z: 0 }));
}
const DEF = {
  fire: { touch: ['i'] }, air: { serbest: 1 }, water: { folded: ['p'], thumbTuck: true },
  bolt: { folded: ['i', 'm', 'r'], serbest: 1 }, earth: { folded: ['m', 'r'], thumbTuck: true },
  gun: { folded: ['r', 'p'], thumbUp: true, serbest: 1 },
};
const NAMES = Object.keys(DEF);
function örnek(n, ac) { const d = { ...DEF[n] }; delete d.serbest; if (DEF[n].serbest) d.thumbOpen = ac; return build(d); }

const d2v = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const TIPS = { 8: 5, 12: 9, 16: 13, 20: 17 };
function jitter(lm, s) {
  const sc = d2v(lm[0], lm[9]) || 1e-6; const o = lm.map(p => ({ x: p.x, y: p.y, z: 0 }));
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

/* --- 1) sınıflandırma örnekleri --- */
const ornekler = [];
function ekle(etiket, lm) {
  const f = M.feat(lm);
  const r = M.siniflandir(f);
  ornekler.push({
    etiket,
    lm: lm.map(p => [p.x, p.y]),
    feat: f,
    id: r.id, red: r.red || null, mod: r.mod,
    ds: r.ds.map(d => ({ id: d.id, d: d.d })),
  });
}
/* temiz pozlar, iki baş parmak açıklığında */
for (const n of NAMES) for (const ac of [0.35, 1.0]) ekle(n, örnek(n, ac));
/* gürültülü: reddedilen ve yanlış sınıflanan kareler de dahil olsun —
   port yalnız kolay durumlarda değil, EŞİĞE YAKIN durumlarda da eşleşmeli */
for (const n of NAMES) for (const sg of [0.025, 0.045, 0.070])
  for (let k = 0; k < 40; k++) ekle(n, jitter(örnek(n, 0.35 + rnd() * 0.65), sg));

/* --- 2) dizi motoru senaryoları --- */
const DT = 1000 / 60;
const F = (id, ms) => [id, Math.round(ms / DT)];
const TUT = id => F(id, M.KILIT_MS + 100);
const SENARYO = [
  ['tek: 🔥 şarj', false, [TUT('fire'), F(null, 600)]],
  ['tek: 🔥→👉 ateş', false, [TUT('fire'), F(null, 150), TUT('gun'), F(null, 200)]],
  ['tek: erken 👉 bekler', false, [TUT('earth'), F('gun', 700)]],
  ['tek: eşik altı tetiklemez', false, [F('fire', M.KILIT_MS - 80), F(null, 400)]],
  ['kombo: 🔥→👉 tek mühür', true, [TUT('fire'), F(null, 150), TUT('gun'), F(null, 400)]],
  ['kombo: 🔥🌪→👉 beslenmiş', true, [TUT('fire'), F(null, 200), TUT('air'), F(null, 200), TUT('gun'), F(null, 900)]],
  ['kombo: 🪨💧🔥→👉 zincir', true, [TUT('earth'), F(null, 200), TUT('water'), F(null, 200), TUT('fire'), F(null, 200), TUT('gun'), F(null, 1400)]],
  ['kombo: 🌪💧 eşleşmez → ceza', true, [TUT('air'), F(null, 200), TUT('water'), F(null, 200), TUT('gun'), F(null, 600)]],
  ['kombo: dizi zaman aşımı', true, [TUT('fire'), F(null, 1200)]],
  ['kombo: aynı mühür ardışık bastırılır', true, [TUT('fire'), F(null, 60), TUT('fire'), F(null, 400)]],
];
const diziler = [];
for (const [ad, kombo, adimlar] of SENARYO) {
  M.komboAyar(kombo);
  const D = M.yeniDizi(); let t = 0; const olaylar = [];
  for (const [id, n] of adimlar) for (let k = 0; k < n; k++) {
    t += DT;
    /* t YUVARLANMAZ. toFixed(4) ile yazınca 316.66666666666669 → 316.6667 oluyor
       ve karşılaştırmada C#'ın doğru değeri sapma gibi görünüyordu; fikstür
       kendi ölçtüğü şeyi bozuyordu. */
    for (const o of M.guncelle(D, id, DT, t))
      olaylar.push({ t, tip: o.tip, id: o.id || null, beceri: o.beceri ? o.beceri.ad : null });
  }
  diziler.push({ ad, kombo, adimlar, olaylar, sonDizi: D.dizi.slice(), sonBeceri: D.beceri ? D.beceri.ad : null });
}
M.komboAyar(true);

/* --- 3) beceri tablosu ve çarpışma --- */
const EL = ['fire', 'air', 'water', 'bolt', 'earth'];
const beceriler = [];
for (const a of EL) {
  const b = M.beceriBul([a]);
  beceriler.push({ dz: [a], ad: b ? b.ad : null, tur: b ? b.tur : null, ms: b ? b.ms : 0, kat: b ? b.kat : 0 });
  for (const b2 of EL) {
    const r = M.beceriBul([a, b2]);
    beceriler.push({ dz: [a, b2], ad: r ? r.ad : null, tur: r ? r.tur : null, ms: r ? r.ms : 0, kat: r ? r.kat : 0 });
    for (const c of EL) {
      const r3 = M.beceriBul([a, b2, c]);
      beceriler.push({ dz: [a, b2, c], ad: r3 ? r3.ad : null, tur: r3 ? r3.tur : null, ms: r3 ? r3.ms : 0, kat: r3 ? r3.kat : 0 });
    }
  }
}
const carpismalar = [];
for (const a of EL) for (const b of EL) for (const g1 of [1, 1.6, 2.6]) for (const g2 of [1, 1.5, 2.6]) {
  const r = M.carpismaCoz({ el: a, guc: g1 }, { el: b, guc: g2 });
  carpismalar.push({ a, g1, b, g2, sonuc: r.sonuc, kazanan: r.kazanan ? r.kazanan.el : null, kalanGuc: r.kalanGuc || 0 });
}

process.stdout.write(JSON.stringify({
  sabitler: {
    KILIT_MS: M.KILIT_MS, DIZI_MS: M.DIZI_MS, CEZA_MS: M.CEZA_MS,
    RED_MESAFE: M.RED_MESAFE, RED_ORAN: M.RED_ORAN,
    SIGMA_ESIK: M.SIGMA_ESIK, SIGMA_ORAN: M.SIGMA_ORAN,
  },
  ornekler, diziler, beceriler, carpismalar,
}));
process.stderr.write(`fikstür: ${ornekler.length} örnek · ${diziler.length} senaryo · ${beceriler.length} beceri · ${carpismalar.length} çarpışma\n`);
