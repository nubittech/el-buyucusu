/* muhur.html'e YAZILAN gerçek sınıflandırıcıyı ve beceri tablosunu doğrular. */
const fs = require('fs');
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger } = H;

const HTML = fs.readFileSync('/Users/mertmac/Desktop/el-buyucusu/muhur.html', 'utf8');
const s = HTML.indexOf("<script>\n'use strict'"), e = HTML.lastIndexOf('</script>');
const src = HTML.slice(s + 8, e);

/* tarayıcı API'lerini taklit et, sonra dosyadaki fonksiyonları dışarı al */
const stub = `
 const localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 const performance={now:()=>0};
 const setTimeout=()=>0; const location={protocol:'https:',hostname:'x'};
 const _els={}; const document={getElementById:id=>(_els[id]=_els[id]||{
   style:{},classList:{toggle:()=>{},add:()=>{},remove:()=>{}},appendChild:()=>{},
   firstElementChild:{style:{}},getContext:()=>new Proxy({},{get:()=>()=>{}}),
   addEventListener:()=>{},removeEventListener:()=>{},click:()=>{},
   set innerHTML(v){}, get innerHTML(){return ''}, set textContent(v){}, get textContent(){return ''},
   width:1,height:1}),createElement:()=>({style:{},classList:{},appendChild:()=>{},set textContent(v){}}) };
 const addEventListener=()=>{}; const requestAnimationFrame=()=>{};
 const navigator={mediaDevices:{getUserMedia:()=>Promise.reject(new Error('yok'))}};
`;
const tail = `; return {feat,siniflandir,beceriBul,uzaklik,PROTO,POSES,BY,RED_MESAFE,RED_ORAN,KILIT_MS,DIZI_MS,guncelle,S,muhurEkle,diziKapat};`;
const M = new Function(stub + src.replace(/^\s*'use strict';/, '') + tail)();

/* --- sentetik poz üreteci (kalibrasyonla aynı) --- */
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
const POSEDEF = {
  fire: { touch: ['i'] }, air: {}, water: { folded: ['p'], thumbTuck: true },
  bolt: { folded: ['i', 'm', 'r'] }, earth: { folded: ['m', 'r'], thumbTuck: true },
  gun: { folded: ['r', 'p'], thumbUp: true },
};
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const d2v = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const TIPS = { 8: 5, 12: 9, 16: 13, 20: 17 };
function jitter(lm, sg) {
  const sc = d2v(lm[0], lm[9]) || 1e-6;
  const o = lm.map(p => ({ x: p.x, y: p.y, z: 0 }));
  for (let i = 0; i < o.length; i++) {
    let k = sc * sg;
    if (TIPS[i] !== undefined && d2v(lm[i], lm[4]) / sc < 0.35) {
      k *= 3.5; const m = lm[TIPS[i]], vx = m.x - lm[i].x, vy = m.y - lm[i].y, vl = Math.hypot(vx, vy) || 1e-6;
      o[i].x += vx / vl * sc * 0.10; o[i].y += vy / vl * sc * 0.10;
    }
    o[i].x += gauss() * k; o[i].y += gauss() * k;
  }
  return o;
}

let fail = 0;
const pad = (s, n) => String(s).padEnd(n);
console.log('1) GERÇEK SINIFLANDIRICI — temiz pozlar\n');
for (const [id, def] of Object.entries(POSEDEF)) {
  const r = M.siniflandir(M.feat(build(def)));
  const ok = r.id === id;
  if (!ok) fail++;
  console.log(` ${ok ? '✓' : '✗ HATA'}  ${pad(M.BY[id].el + ' ' + M.BY[id].ad, 16)} → ${r.id || 'RED(' + r.red + ')'}`);
}

console.log('\n2) GÜRÜLTÜ ALTINDA (2000 örnek/poz)\n');
for (const sg of [0.025, 0.045, 0.070]) {
  let tot = 0, ok = 0, red = 0;
  const per = {};
  for (const [id, def] of Object.entries(POSEDEF)) {
    const clean = build(def); let c = 0, rj = 0;
    for (let k = 0; k < 2000; k++) {
      const r = M.siniflandir(M.feat(jitter(clean, sg)));
      tot++; if (r.id === id) { ok++; c++; } else if (!r.id) { red++; rj++; }
    }
    per[id] = [c / 2000, rj / 2000];
  }
  console.log(` σ=%${(sg * 100).toFixed(1)}  doğru %${(ok / tot * 100).toFixed(1)} · reddedilen %${(red / tot * 100).toFixed(1)} · YANLIŞ %${((tot - ok - red) / tot * 100).toFixed(2)}`);
  if (sg >= 0.045) for (const id in per) console.log(`     ${pad(M.BY[id].el + ' ' + M.BY[id].ad, 16)} doğru %${(per[id][0] * 100).toFixed(1)}  red %${(per[id][1] * 100).toFixed(1)}`);
}

console.log('\n3) BECERİ TABLOSU\n');
const T = [
  [['fire'], 'Alev Oku'], [['earth'], 'Taş Mermisi'],
  [['fire', 'fire'], 'Ejder Nefesi'], [['earth', 'earth'], 'Taş Duvar'],
  [['fire', 'air'], 'Alev Fırtınası'],      /* yendiği → beslenmiş */
  [['water', 'fire'], 'Kaynar Dalga'],
  [['fire', 'water'], 'Buhar Perdesi'],     /* yenildiği → füzyon */
  [['earth', 'bolt'], 'Sarsıntı'],
  [['earth', 'water', 'fire'], 'Volkan'],   /* zincir */
  [['fire', 'air', 'bolt'], 'Yanan Gökyüzü'],
  [['fire', 'bolt'], null],                 /* nötr çift → rezerve */
  [['air', 'water'], null],
  [['fire', 'air', 'water'], null],         /* zincir değil */
];
for (const [dz, bekl] of T) {
  const b = M.beceriBul(dz);
  const got = b ? b.ad : null, ok = got === bekl;
  if (!ok) fail++;
  console.log(` ${ok ? '✓' : '✗ HATA'}  ${pad(dz.map(x => M.BY[x].el).join(''), 8)} → ${pad(got || 'eşleşme yok', 22)}${b ? b.tur + ' · ' + b.ms + 'ms' : ''}`);
}
/* 25 ikili kombinasyonun kaçı kapsanıyor */
const EL = ['fire', 'air', 'water', 'bolt', 'earth'];
let kapsanan = 0, isim = new Set();
for (const a of EL) for (const b of EL) { const r = M.beceriBul([a, b]); if (r) { kapsanan++; isim.add(r.ad); } }
console.log(`\n ikili kombinasyon kapsamı: ${kapsanan}/25 eşleşiyor, ${isim.size} farklı beceri (10 nötr çift bilerek boş)`);
let z = 0; for (const a of EL) for (const b of EL) for (const c of EL) if (M.beceriBul([a, b, c])) z++;
console.log(` üçlü zincir: ${z}/125 eşleşiyor (beklenen 5)`);
if (kapsanan !== 15 || isim.size !== 15 || z !== 5) { fail++; console.log(' ✗ HATA: kapsam beklenenden farklı'); }

console.log(fail ? `\n=== ${fail} BAŞARISIZ ===` : '\n=== HEPSİ GEÇTİ ===');
process.exit(fail ? 1 : 0);
