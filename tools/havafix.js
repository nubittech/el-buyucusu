/* Hava (açık avuç) neden zor algılanıyor?
   Hipotez: prototipteki baş parmak sonuna kadar açık; gerçek elde daha kapalı,
   bu da mesafeyi RED_MESAFE eşiğinin üstüne çıkarıyor. Baş parmak açıklığını
   0..1 tarayıp gerçek prototipe uzaklığı ölçüyoruz. */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger, d2v } = H;

const TOUCH_CURL = 0.42;
const TUCK = [-0.20, 0.80, 0.10], FULL = [-0.92, 0.90, 0.18], GUNUP = [-0.78, 1.05, 0.14];
function build({ touch = [], folded = [], thumbTuck = false, thumbUp = false, thumbOpen = 1, fan = 12 }) {
  const curl = { i: 0, m: 0, r: 0, p: 0 };
  for (const f of touch) curl[f] = TOUCH_CURL;
  for (const f of folded) curl[f] = 0.92;
  const FANS = { i: -fan, m: 0, r: fan, p: fan * 2.1 };
  const ch = {}; for (const f of ['i', 'm', 'r', 'p']) ch[f] = finger(f, curl[f], FANS[f]);
  let tip;
  if (touch.length) { tip = [0, 0, 0]; for (const f of touch) { const t = ch[f][3]; for (let k = 0; k < 3; k++) tip[k] += t[k] / touch.length; } tip[2] += 0.06; }
  else if (thumbTuck) tip = TUCK.slice();
  else if (thumbUp) tip = GUNUP.slice();
  else tip = TUCK.map((v, k) => v + (FULL[k] - v) * thumbOpen);   /* kısmi açıklık */
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

/* muhur.html'deki mevcut prototipler */
const P = {
 fire:[1.0556,1.3382,1.3196,1.2601,0,0.7885,1.1016,1.3999,1.2276],
 air:[1.3181,1.3382,1.3196,1.2601,1.1294,1.6009,1.9203,2.1374,1.7442],
 water:[1.3181,1.3382,1.3196,0.7397,1.1498,1.2939,1.3512,0.7924,0.8737],
 bolt:[0.6714,0.6456,0.6692,1.2601,0.8342,1.128,1.411,2.1374,1.7442],
 earth:[1.3181,0.6456,0.6692,1.2601,1.1498,0.2489,0.5311,1.3819,0.8737],
 gun:[1.3181,1.3382,0.6692,0.7397,0.89,1.3526,1.2866,1.5457,1.5922]};
const RED_MESAFE = 1.25, RED_ORAN = 1.66;
const NAMES = Object.keys(P);

console.log('AÇIK AVUÇ — baş parmak açıklığına göre mevcut prototipe uzaklık\n');
console.log('açıklık   d(air)   en yakın        oran    sonuç');
for (let t = 0.3; t <= 1.001; t += 0.1) {
  const f = feat(build({ thumbOpen: t }));
  const ds = NAMES.map(n => [dist(f, P[n]), n]).sort((a, b) => a[0] - b[0]);
  const dAir = dist(f, P.air), oran = ds[1][0] / (ds[0][0] || 1e-6);
  const red = ds[0][0] > RED_MESAFE ? 'REDDEDİLDİ' : oran < RED_ORAN ? 'belirsiz' : (ds[0][1] === 'air' ? 'air ✓' : 'YANLIŞ→' + ds[0][1]);
  console.log(`  %${(t * 100).toFixed(0).padStart(3)}   ${dAir.toFixed(3)}   ${ds[0][1].padEnd(6)} ${ds[0][0].toFixed(3)}   ${oran.toFixed(2)}    ${red}`);
}

/* --- daha gerçekçi bir prototip: açıklık aralığının ortası --- */
console.log('\n\nYENİ PROTOTİP ADAYLARI (açıklık %35–%100 aralığının ortalaması)\n');
const ors = [];
for (let t = 0.35; t <= 1.001; t += 0.05) ors.push(feat(build({ thumbOpen: t })));
const airYeni = ors[0].map((_, k) => +(ors.reduce((s, f) => s + f[k], 0) / ors.length).toFixed(4));
console.log('air (yeni):', JSON.stringify(airYeni));
console.log('air (eski):', JSON.stringify(P.air));

const P2 = { ...P, air: airYeni };
console.log('\nyeni prototiple aynı tarama:\n');
console.log('açıklık   d(air)   en yakın        oran    sonuç');
let enKotu = 0;
for (let t = 0.3; t <= 1.001; t += 0.1) {
  const f = feat(build({ thumbOpen: t }));
  const ds = NAMES.map(n => [dist(f, P2[n]), n]).sort((a, b) => a[0] - b[0]);
  const oran = ds[1][0] / (ds[0][0] || 1e-6);
  enKotu = Math.max(enKotu, ds[0][0]);
  const red = ds[0][0] > RED_MESAFE ? 'REDDEDİLDİ' : oran < RED_ORAN ? 'belirsiz' : (ds[0][1] === 'air' ? 'air ✓' : 'YANLIŞ→' + ds[0][1]);
  console.log(`  %${(t * 100).toFixed(0).padStart(3)}   ${dist(f, P2.air).toFixed(3)}   ${ds[0][1].padEnd(6)} ${ds[0][0].toFixed(3)}   ${oran.toFixed(2)}    ${red}`);
}
console.log(`\nyeni prototiple en kötü mesafe: ${enKotu.toFixed(3)} (eşik ${RED_MESAFE})`);

/* --- diğer beş poz bozuldu mu: gürültü altında 6 sınıflı doğruluk --- */
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const TIPS={8:5,12:9,16:13,20:17};
function jitter(lm,s){const sc=d2v(lm[0],lm[9])||1e-6;const o=lm.map(p=>({x:p.x,y:p.y,z:0}));
 for(let i=0;i<o.length;i++){let k=sc*s;
  if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
   o[i].x+=vx/vl*sc*0.10;o[i].y+=vy/vl*sc*0.10;}
  o[i].x+=gauss()*k;o[i].y+=gauss()*k;}return o;}
const DEF={fire:{touch:['i']},air:{},water:{folded:['p'],thumbTuck:true},
 bolt:{folded:['i','m','r']},earth:{folded:['m','r'],thumbTuck:true},gun:{folded:['r','p'],thumbUp:true}};
console.log('\n6 SINIFLI DOĞRULUK (yeni prototiple, 2000 örnek/poz, baş parmak açıklığı %35–100 rastgele)\n');
for (const sg of [0.025, 0.045, 0.07]) {
  let tot=0,ok=0,red=0,yanlis=0;const per={};
  for (const n of NAMES) {
    let c=0,r=0,y=0;
    for (let k=0;k<2000;k++){
      const d={...DEF[n]};
      if(!d.touch&&!d.thumbTuck&&!d.thumbUp) d.thumbOpen=0.35+Math.random()*0.65;
      const f=feat(jitter(build(d),sg));
      const ds=NAMES.map(m=>[dist(f,P2[m]),m]).sort((a,b)=>a[0]-b[0]);
      const oran=ds[1][0]/(ds[0][0]||1e-6);
      tot++;
      if(ds[0][0]>RED_MESAFE||oran<RED_ORAN){red++;r++;}
      else if(ds[0][1]===n){ok++;c++;}
      else {yanlis++;y++;}
    }
    per[n]=[c/2000,r/2000,y/2000];
  }
  console.log(` σ=%${(sg*100).toFixed(1)}  doğru %${(ok/tot*100).toFixed(1)} · red %${(red/tot*100).toFixed(1)} · YANLIŞ %${(yanlis/tot*100).toFixed(2)}`);
  for(const n of NAMES) console.log(`     ${n.padEnd(6)} doğru %${(per[n][0]*100).toFixed(1)}  red %${(per[n][1]*100).toFixed(1)}  yanlış %${(per[n][2]*100).toFixed(2)}`);
}
