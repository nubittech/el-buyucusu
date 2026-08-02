/* Sentetik MediaPipe el iskeleti üreteci + avuç (kalkan) testi kalibrasyonu.
   Amaç: eşikleri tahminle değil, ölçerek seçmek. */

const D2R = Math.PI / 180;

/* 3B el modeli -> yaw/pitch ile döndür -> ortografik izdüşüm -> normalize görüntü koordinatı.
   Yerel eksen: x = avuç boyunca (baş parmak tarafı negatif), y = parmaklar yönü, z = avuç normali (kameraya). */
const MCP = { i: [-0.30, 0.95, 0], m: [0, 1.0, 0], r: [0.28, 0.95, 0], p: [0.52, 0.85, 0] };
const LEN = { i: 0.78, m: 0.85, r: 0.78, p: 0.60 };
const SEG = [0.45, 0.27, 0.28];                 // proksimal / orta / distal falanks payları
const FAN_WIDE = { i: -13, m: 0, r: 13, p: 27 };  // yelpaze açıları (derece)
const FAN_TIGHT = { i: -3, m: 0, r: 3, p: 8 };   // parmaklar bitişik

function finger(name, curl, fanDeg) {
  const a = fanDeg * D2R, L = LEN[name], base = MCP[name];
  const u = [Math.sin(a), Math.cos(a), 0];        // parmak yönü (düz halde)
  const n = [0, 0, 1];                            // avuç normali
  const phi = [curl * 70, curl * 160, curl * 220].map(d => d * D2R);
  const pts = [base.slice()];
  for (let k = 0; k < 3; k++) {
    const c = Math.cos(phi[k]), s = Math.sin(phi[k]);
    const d = [c * u[0] - s * n[0], c * u[1] - s * n[1], c * u[2] - s * n[2]];
    const prev = pts[pts.length - 1];
    pts.push([prev[0] + L * SEG[k] * d[0], prev[1] + L * SEG[k] * d[1], prev[2] + L * SEG[k] * d[2]]);
  }
  return pts;                                     // [MCP, PIP, DIP, TIP]
}

/* thumb: 0 = avuca yapışık, 1 = tam açık/ayrık */
function thumb(open) {
  const closed = [[-0.30, 0.22, 0.06], [-0.40, 0.52, 0.14], [-0.34, 0.74, 0.16], [-0.26, 0.88, 0.16]];
  const opened = [[-0.35, 0.25, 0.05], [-0.62, 0.50, 0.12], [-0.80, 0.72, 0.16], [-0.92, 0.90, 0.18]];
  return closed.map((c, k) => c.map((v, j) => v + (opened[k][j] - v) * open));
}

function buildHand({ curl = { i: 0, m: 0, r: 0, p: 0 }, fan = FAN_WIDE, thumbOpen = 1, yaw = 0, pitch = 0 }) {
  const lm3 = [[0, 0, 0]];                        // 0 wrist
  lm3.push(...thumb(thumbOpen));                  // 1..4
  for (const f of ['i', 'm', 'r', 'p']) lm3.push(...finger(f, curl[f], fan[f])); // 5..20

  const cy = Math.cos(yaw * D2R), sy = Math.sin(yaw * D2R);
  const cp = Math.cos(pitch * D2R), sp = Math.sin(pitch * D2R);
  return lm3.map(([x, y, z]) => {
    let X = x * cy + z * sy, Z = -x * sy + z * cy;   // yaw (y ekseni)
    let Y = y * cp - Z * sp;                          // pitch (x ekseni)
    return { x: 0.5 + X * 0.09, y: 0.90 - Y * 0.09, z: 0 };
  });
}

/* ---- ölçülen büyüklükler (index.html'deki d2v ile aynı: 2B) ---- */
const d2v = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function metrics(lm) {
  const palmLen = d2v(lm[0], lm[9]) || 1e-6;   // bilek → orta parmak MCP
  const palmWid = d2v(lm[5], lm[17]) || 1e-6;  // işaret MCP → serçe MCP (boğum hattı)
  const extR = (tip, pip) => d2v(lm[tip], lm[0]) / (d2v(lm[pip], lm[0]) || 1e-6);
  const ang = (a, b, c, d) => {                // vec(a→b) ile vec(c→d) arasındaki açı (derece)
    const v1 = [lm[b].x - lm[a].x, lm[b].y - lm[a].y], v2 = [lm[d].x - lm[c].x, lm[d].y - lm[c].y];
    const n1 = Math.hypot(...v1) || 1e-6, n2 = Math.hypot(...v2) || 1e-6;
    return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)))) / D2R;
  };
  return {
    palmLen, palmWid,
    /* aspect: avuç kameraya dönükken ~1.2. Yana dönünce (yaw) genişlik kısalır → yükselir.
       Öne/arkaya yatınca (pitch) boy kısalır → düşer. Yani tek sayıda "avuç dönük mü" testi. */
    aspect: palmLen / palmWid,
    pinchD: d2v(lm[4], lm[8]) / palmLen,
    ext: { i: extR(8, 6), m: extR(12, 10), r: extR(16, 14), p: extR(20, 18) },
    extMin: Math.min(extR(8, 6), extR(12, 10), extR(16, 14), extR(20, 18)),
    /* yelpaze: işaret parmağı yönü ile serçe yönü arasındaki açı — ölçekten bağımsız */
    fanDeg: ang(5, 8, 17, 20),
    thumbPinky: d2v(lm[4], lm[17]) / palmWid,
    thumbIndex: d2v(lm[4], lm[5]) / palmWid,
  };
}

/* ---- test senaryoları: [ad, beklenen kalkan, el] ---- */
const C = (v) => ({ i: v, m: v, r: v, p: v });
const CASES = [
  ['tam açık avuç, kameraya dönük', true, buildHand({})],
  ['tam açık avuç, hafif yaw 20°', true, buildHand({ yaw: 20 })],
  ['tam açık avuç, hafif pitch 15°', true, buildHand({ pitch: 15 })],
  ['tam açık avuç, yaw -25°', true, buildHand({ yaw: -25 })],

  ['SİLAH pozu (işaret+orta açık)', false, buildHand({ curl: { i: 0, m: 0, r: 0.85, p: 0.85 }, thumbOpen: 1 })],
  ['pinch / mühür (şarj)', false, buildHand({ curl: { i: 0.55, m: 0.15, r: 0.2, p: 0.25 }, thumbOpen: 0.35, fan: FAN_TIGHT })],
  ['yumruk', false, buildHand({ curl: C(0.95), thumbOpen: 0.1, fan: FAN_TIGHT })],
  ['yarı bükük parmaklar (gevşek el)', false, buildHand({ curl: C(0.42) })],
  ['düz el, parmaklar BİTİŞİK', false, buildHand({ fan: FAN_TIGHT })],
  ['açık el ama baş parmak avuçta', false, buildHand({ thumbOpen: 0.15 })],
  ['avuç YANA dönük (yaw 60°)', false, buildHand({ yaw: 60 })],
  ['avuç yana dönük (yaw 75°)', false, buildHand({ yaw: 75 })],
  ['avuç eğik (pitch 55°)', false, buildHand({ pitch: 55 })],
  ['geçiş karesi: pinch→silah', false, buildHand({ curl: { i: 0.3, m: 0.25, r: 0.5, p: 0.55 }, thumbOpen: 0.6, fan: FAN_TIGHT })],
];

console.log('ölçümler:\n');
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('senaryo', 34), pad('bekl', 6), pad('extMin', 7), pad('aspect', 7), pad('fan°', 7), pad('thmb17', 7), pad('thmb5', 7), 'pinchD');
for (const [name, want, lm] of CASES) {
  const q = metrics(lm);
  console.log(pad(name, 34), pad(want ? 'AÇIK' : 'kapalı', 6),
    pad(q.extMin.toFixed(3), 7), pad(q.aspect.toFixed(3), 7), pad(q.fanDeg.toFixed(1), 7),
    pad(q.thumbPinky.toFixed(3), 7), pad(q.thumbIndex.toFixed(3), 7), q.pinchD.toFixed(3));
}

/* ---- aday eşiklerle karar ---- */
const T = { EXT: 1.18, ASPECT_LO: 0.95, ASPECT_HI: 1.72, FAN: 22, THUMB17: 1.25, THUMB5: 0.50, PINCH: 0.45 };
function isPalm(lm) {
  const q = metrics(lm);
  return q.extMin > T.EXT &&
    q.aspect > T.ASPECT_LO && q.aspect < T.ASPECT_HI &&
    q.fanDeg > T.FAN &&
    q.thumbPinky > T.THUMB17 && q.thumbIndex > T.THUMB5 &&
    !(q.pinchD < T.PINCH);
}
console.log('\neşikler:', JSON.stringify(T));
let fail = 0;
console.log('\nsonuç:');
for (const [name, want, lm] of CASES) {
  const got = isPalm(lm), ok = got === want;
  if (!ok) fail++;
  console.log(` ${ok ? '✓' : '✗ HATA'}  ${pad(name, 34)} bekl=${want ? 'AÇIK' : 'kapalı'} → ${got ? 'AÇIK' : 'kapalı'}`);
}
console.log(fail ? `\n${fail} senaryo BAŞARISIZ` : '\nTÜM SENARYOLAR GEÇTİ');

/* ---- gürültü dayanıklılığı: MediaPipe landmark titremesini taklit et ----
   Her karede her noktaya gauss gürültü ekle; kaç karede "kalkan" dediğini say.
   İstenen: doğru poz ~%100 kararlı, yanlış pozlar ~%0 (tek kare bile sızmasın). */
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function jitter(lm, sigmaRel) {
  const s = (d2v(lm[0], lm[9]) || 1e-6) * sigmaRel;
  return lm.map(p => ({ x: p.x + gauss() * s, y: p.y + gauss() * s, z: 0 }));
}
const TRIALS = 4000;
for (const SIG of [0.015, 0.030]) {
  console.log(`\ngürültü dayanıklılığı — σ = %${(SIG * 100).toFixed(1)} (kare başına, ${TRIALS} deneme):`);
  let worstTP = 100, worstFP = 0;
  for (const [name, want, lm] of CASES) {
    let hits = 0;
    for (let k = 0; k < TRIALS; k++) if (isPalm(jitter(lm, SIG))) hits++;
    const pct = hits / TRIALS * 100;
    if (want) worstTP = Math.min(worstTP, pct); else worstFP = Math.max(worstFP, pct);
    const bad = want ? pct < 90 : pct > 1;
    console.log(` ${bad ? '⚠' : ' '} ${pad(name, 34)} ${pad(want ? 'AÇIK' : 'kapalı', 6)} kalkan açık: %${pct.toFixed(2)}`);
  }
  console.log(` → en kötü doğru-poz kararlılığı %${worstTP.toFixed(2)} · en kötü yanlış tetikleme %${worstFP.toFixed(2)}`);
}

module.exports = { CASES, buildHand, metrics, d2v, D2R, isPalm, T, finger, thumb, MCP, LEN, SEG, FAN_WIDE, FAN_TIGHT };
