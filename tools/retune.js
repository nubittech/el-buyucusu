/* Baş parmağı SERBEST olan pozların (air, bolt, gun) prototipleri tek bir uç
   duruşta üretilmişti; gerçek elde baş parmak açıklığı kişiden kişiye değişiyor.
   Bu pozların prototipleri açıklık aralığının ORTALAMASI olarak yeniden üretilip
   red eşikleri gerçekçi varyasyon altında yeniden ayarlanıyor. */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger, d2v } = H;

const TOUCH_CURL = 0.42;
const TUCK = [-0.20, 0.80, 0.10], FULL = [-0.92, 0.90, 0.18];
const GUN_LO = [-0.50, 0.95, 0.12], GUN_HI = [-0.85, 1.12, 0.16];   /* tabanca: baş parmak diklik aralığı */
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
const W = [1.6, 1.6, 1.6, 1.6, 1.5, 1, 1, 1, 1.3];
const dist = (a, b) => Math.hypot(...a.map((v, k) => (v - b[k]) * W[k]));

/* baş parmağı serbest olan pozlar: prototip = açıklık aralığının ortalaması */
const DEF = {
  fire:  { touch: ['i'] },
  air:   { serbest: true },
  water: { folded: ['p'], thumbTuck: true },
  bolt:  { folded: ['i', 'm', 'r'], serbest: true },
  earth: { folded: ['m', 'r'], thumbTuck: true },
  gun:   { folded: ['r', 'p'], thumbUp: true, serbest: true },
};
const NAMES = Object.keys(DEF);
const AC_LO = 0.35, AC_HI = 1.0;
function örnek(n, ac) { const d = { ...DEF[n] }; delete d.serbest; if (DEF[n].serbest) d.thumbOpen = ac; return build(d); }

const PROTO = {};
for (const n of NAMES) {
  if (!DEF[n].serbest) { PROTO[n] = feat(örnek(n, 1)).map(x => +x.toFixed(4)); continue; }
  const fs = []; for (let t = AC_LO; t <= AC_HI + 1e-9; t += 0.05) fs.push(feat(örnek(n, t)));
  PROTO[n] = fs[0].map((_, k) => +(fs.reduce((s, f) => s + f[k], 0) / fs.length).toFixed(4));
}
console.log('YENİ PROTOTİPLER\n');
for (const n of NAMES) console.log(` ${n.padEnd(6)} ${JSON.stringify(PROTO[n])}`);

function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const TIPS={8:5,12:9,16:13,20:17};
function jitter(lm,s){const sc=d2v(lm[0],lm[9])||1e-6;const o=lm.map(p=>({x:p.x,y:p.y,z:0}));
 for(let i=0;i<o.length;i++){let k=sc*s;
  if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
   o[i].x+=vx/vl*sc*0.10;o[i].y+=vy/vl*sc*0.10;}
  o[i].x+=gauss()*k;o[i].y+=gauss()*k;}return o;}

/* örnek havuzu: gerçekçi varyasyon (baş parmak açıklığı + landmark gürültüsü) */
function havuz(sg, N) {
  const out = {};
  for (const n of NAMES) {
    out[n] = [];
    for (let k = 0; k < N; k++) {
      const ac = AC_LO + Math.random() * (AC_HI - AC_LO);
      out[n].push(feat(jitter(örnek(n, ac), sg)));
    }
  }
  return out;
}
function degerlendir(H, mes, oran) {
  let tot = 0, ok = 0, red = 0, yanlis = 0; const per = {};
  for (const n of NAMES) {
    let c = 0, r = 0, y = 0;
    for (const f of H[n]) {
      const ds = NAMES.map(m => [dist(f, PROTO[m]), m]).sort((a, b) => a[0] - b[0]);
      tot++;
      if (ds[0][0] > mes || ds[1][0] / (ds[0][0] || 1e-6) < oran) { red++; r++; }
      else if (ds[0][1] === n) { ok++; c++; } else { yanlis++; y++; }
    }
    per[n] = [c / H[n].length, r / H[n].length, y / H[n].length];
  }
  return { ok: ok / tot, red: red / tot, yanlis: yanlis / tot, per };
}

console.log('\n\nEŞİK TARAMASI  (σ=%4.5, 2500 örnek/poz)\n');
const H45 = havuz(0.045, 2500);
console.log(' mesafe  oran   doğru    red     YANLIŞ');
for (const mes of [1.25, 1.6, 2.0]) for (const oran of [1.66, 1.45, 1.30, 1.20]) {
  const r = degerlendir(H45, mes, oran);
  console.log(`  ${mes.toFixed(2)}   ${oran.toFixed(2)}   %${(r.ok*100).toFixed(1).padStart(5)}   %${(r.red*100).toFixed(1).padStart(4)}   %${(r.yanlis*100).toFixed(2)}`);
}

const MES = 1.8, ORAN = 1.30;
console.log(`\n\nSEÇİLEN: RED_MESAFE=${MES}  RED_ORAN=${ORAN}\n`);
for (const sg of [0.025, 0.045, 0.070]) {
  const r = degerlendir(havuz(sg, 2500), MES, ORAN);
  console.log(` σ=%${(sg*100).toFixed(1)}  doğru %${(r.ok*100).toFixed(1)} · red %${(r.red*100).toFixed(1)} · YANLIŞ %${(r.yanlis*100).toFixed(2)}`);
  for (const n of NAMES) console.log(`     ${n.padEnd(6)} doğru %${(r.per[n][0]*100).toFixed(1).padStart(5)}  red %${(r.per[n][1]*100).toFixed(1).padStart(4)}  yanlış %${(r.per[n][2]*100).toFixed(2)}`);
}
console.log('\n--- muhur.html için ---');
console.log('const PROTO0={');
for (const n of NAMES) console.log(` ${n}:${JSON.stringify(PROTO[n])}${n===NAMES[NAMES.length-1]?'};':','}`);
