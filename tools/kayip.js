/* Kullanıcının şikayeti: "el hareketleri arttıkça algılamalarda bozulmalar".
   Hareket hâlinde MediaPipe kareleri dağınık biçimde bozulur/reddedilir.
   Eski yöntem (kesintisiz aynı etiket) buna karşı ne kadar dayanıklıydı,
   yeni oy penceresi ne kadar? Kayıp oranını tarayıp ölç. */
require('../muhur.js'); const M=globalThis.MUHUR;
const DT=1000/60;

/* ESKİ yöntemin birebir kopyası (referans) */
function eski(seq){
  let aday=null,kilit=0,onayli=null,n=0;
  for(const id of seq){
    if(id&&id===aday) kilit=Math.min(150+120,kilit+DT);
    else if(id){aday=id;kilit=DT;}
    else kilit=Math.max(0,kilit-DT*1.6);
    if(!kilit) aday=null;
    const o=(aday&&kilit>=150)?aday:null;
    if(o&&o!==onayli) n++;
    onayli=o;
  }
  return n;
}
function yeni(seq){
  const D=M.yeniDizi(); let t=0,n=0;
  for(const id of seq){ t+=DT;
    for(const o of M.guncelle(D,id,DT,t)) if(o.tip==='muhur') n++; }
  return n;
}
/* 1 saniye boyunca 🔥 tutuluyor ama karelerin p'si bozuk (null) geliyor */
function uret(p,sn){ const N=Math.round(sn*1000/DT),s=[];
  for(let k=0;k<N;k++) s.push(Math.random()<p?null:'fire'); return s; }

console.log('1 sn boyunca 🔥 tutuluyor · kareler rastgele kayboluyor');
console.log('(başarı = mühür en az bir kez onaylandı; 500 deneme)\n');
console.log('kayıp oranı   ESKİ (kesintisiz)   YENİ (oy penceresi)');
for(const p of [0,0.1,0.2,0.3,0.4,0.5,0.6]){
  let e=0,y=0;
  for(let k=0;k<500;k++){ const s=uret(p,1.0);
    if(eski(s)>=1) e++; if(yeni(s)>=1) y++; }
  console.log(`  %${(p*100).toFixed(0).padStart(3)}         %${(e/5).toFixed(1).padStart(5)}             %${(y/5).toFixed(1).padStart(5)}`);
}
console.log('\nYANLIŞ TETİKLEME kontrolü — poz yokken rastgele gürültü kareleri');
for(const p of [0.2,0.35,0.5]){
  let e=0,y=0;
  for(let k=0;k<500;k++){
    const s=[]; const EL=['fire','air','water','bolt','earth','gun'];
    for(let i=0;i<60;i++) s.push(Math.random()<p?EL[(Math.random()*6)|0]:null);
    if(eski(s)>=1) e++; if(yeni(s)>=1) y++;
  }
  console.log(`  gürültü yoğunluğu %${(p*100).toFixed(0)}  ESKİ %${(e/5).toFixed(1)}  YENİ %${(y/5).toFixed(1)}`);
}
