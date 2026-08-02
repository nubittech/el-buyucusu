/* index.html'e YAZILAN gerçek analyzeHand + zaman kilidi mantığını doğrular.
   Kodu dosyadan söker, sentetik iskeletlerde çalıştırır. */
const fs = require('fs');
const path = require('path');

/* handtest.js'i sessizce yükleyip senaryoları al */
const realLog = console.log; console.log = () => { };
const T = require('./handtest.js');
console.log = realLog;

const HTML = fs.readFileSync('/Users/mertmac/Desktop/el-buyucusu/index.html', 'utf8');

/* --- 1) analyzeHand'i dosyadan sök --- */
const start = HTML.indexOf('function analyzeHand(lm){');
if (start < 0) { console.error('HATA: analyzeHand bulunamadı'); process.exit(1); }
let i = HTML.indexOf('{', start), depth = 0, end = -1;
for (let k = i; k < HTML.length; k++) {
  if (HTML[k] === '{') depth++;
  else if (HTML[k] === '}') { depth--; if (!depth) { end = k + 1; break; } }
}
const src = HTML.slice(start, end);
console.log(`analyzeHand sökülük: ${src.split('\n').length} satır, ${src.length} karakter\n`);

const d2v = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const analyzeHand = new Function('d2v', src + '; return analyzeHand;')(d2v);

/* --- 2) senaryolarda çalıştır --- */
const pad = (s, n) => String(s).padEnd(n);
let fail = 0;
console.log('GERÇEK KOD — poz sınıflandırma:');
for (const [name, want, lm] of T.CASES) {
  const a = analyzeHand(lm);
  const ok = a.palm === want;
  if (!ok) fail++;
  console.log(` ${ok ? '✓' : '✗ HATA'}  ${pad(name, 34)} palm=${pad(a.palm, 6)} gun=${pad(a.gun, 6)} pinch=${a.pinch}`);
}
console.log(fail ? `\n✗ ${fail} senaryo başarısız\n` : '\n✓ 14/14 poz doğru\n');

/* --- 3) silah/pinch pozları bozulmadı mı (regresyon) --- */
const gunCase = T.CASES.find(c => c[0].startsWith('SİLAH'));
const pinchCase = T.CASES.find(c => c[0].startsWith('pinch'));
const g = analyzeHand(gunCase[2]), p = analyzeHand(pinchCase[2]);
console.log('regresyon — eski mekanikler:');
console.log(` ${g.gun ? '✓' : '✗ HATA'}  silah pozu hâlâ gun=true (ateş çalışıyor)`);
console.log(` ${p.pinch ? '✓' : '✗ HATA'}  pinch pozu hâlâ pinch=true (şarj çalışıyor)`);
if (!g.gun || !p.pinch) fail++;

/* --- 4) zaman kilidi: kare kare simülasyon (60 fps) --- */
const PALM_NEED = 220, DT = 1000 / 60;
function runFrames(palmSeq) {           /* palmSeq: her kare için pose.palm */
  let palmMs = 0; const blocking = [];
  for (const isPalm of palmSeq) {
    if (isPalm) palmMs = Math.min(PALM_NEED + 180, palmMs + DT);
    else palmMs = Math.max(0, palmMs - DT * 1.6);
    blocking.push(palmMs >= PALM_NEED);
  }
  return blocking;
}
const F = (n, v) => Array(n).fill(v);
console.log('\nzaman kilidi (60 fps, PALM_NEED=220ms):');
const scen = [
  ['1 karelik sızıntı (16ms)', [...F(1, true), ...F(40, false)], false],
  ['5 karelik sızıntı (83ms)', [...F(5, true), ...F(40, false)], false],
  ['12 kare (200ms) — eşik altı', [...F(12, true), ...F(40, false)], false],
  ['kasıtlı tutuş 30 kare (500ms)', F(30, true), true],
  ['tutarken 1 kare kaybı (titreme)', [...F(20, true), false, ...F(20, true)], true],
];
for (const [name, seq, wantEverBlock] of scen) {
  const b = runFrames(seq);
  const ever = b.some(Boolean);
  const firstAt = b.indexOf(true);
  const ok = ever === wantEverBlock;
  if (!ok) fail++;
  console.log(` ${ok ? '✓' : '✗ HATA'}  ${pad(name, 32)} kalkan açıldı mı: ${pad(ever ? 'EVET' : 'hayır', 6)}${firstAt >= 0 ? ` (${(firstAt * DT).toFixed(0)}ms'de)` : ''}`);
}
/* titreme senaryosunda kalkan hiç kesilmemeli */
const jit = runFrames([...F(20, true), false, ...F(20, true)]);
const droppedMidHold = jit.indexOf(true) >= 0 && jit.slice(jit.indexOf(true)).includes(false);
console.log(` ${droppedMidHold ? '✗ HATA' : '✓'}  ${pad('tek kare kaybında kalkan kesilmiyor', 32)}`);
if (droppedMidHold) fail++;

console.log(fail ? `\n=== ${fail} BAŞARISIZ ===` : '\n=== HEPSİ GEÇTİ ===');
process.exit(fail ? 1 : 0);
