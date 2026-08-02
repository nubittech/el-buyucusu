/* Gerçekçi: mühür onaylanır onaylanmaz el silaha gider — şarj bu sırada işler.
   Hangi parça gecikmeyi belirliyor: şarj mı, tanıma onayları mı? */
require('../muhur.js'); const M=globalThis.MUHUR;
const DT=1000/60;
function olc(gecisMs,kayip,sarjMs){
  const D=M.yeniDizi(); let t=0,onayT=null,atesT=null,sarjBitT=null;
  const ver=id=>Math.random()<kayip?null:id;
  let faz=0,gecisKalan=gecisMs;
  for(let k=0;k<Math.round(3000/DT);k++){
    t+=DT;
    let id = faz===0?ver('fire') : faz===1?null : ver('gun');
    for(const o of M.guncelle(D,id,DT,t)){
      if(o.tip==='yuklemeBasladi'&&onayT===null){ onayT=t; faz=1; D.yukTotal=sarjMs; }
      if(o.tip==='yuklendi'&&sarjBitT===null) sarjBitT=t;
      if(o.tip==='ates'&&atesT===null) atesT=t;
    }
    if(faz===1){ gecisKalan-=DT; if(gecisKalan<=0) faz=2; }
    if(atesT!==null) break;
  }
  return atesT===null?null:{onay:onayT,sarjBit:sarjBitT,ates:atesT};
}
const pad=(s,n)=>String(s).padEnd(n);
function tablo(sarjMs){
  console.log(`\nşarj = ${sarjMs} ms`);
  console.log(' '+pad('senaryo',26)+pad('mühür onayı',13)+pad('şarj biter',12)+'ATIŞ');
  for(const [ad,g,ky] of [['hızlı geçiş (60ms)',60,0],['normal geçiş (150ms)',150,0],
                          ['%25 kare kaybı',150,0.25],['%40 kare kaybı',150,0.40]]){
    const r=[];for(let k=0;k<300;k++){const x=olc(g,ky,sarjMs);if(x)r.push(x);}
    const o=a=>Math.round(r.reduce((s,x)=>s+x[a],0)/r.length);
    console.log(' '+pad(ad,26)+pad(o('onay')+' ms',13)+pad(o('sarjBit')+' ms',12)+o('ates')+' ms');
  }
}
console.log('ATIŞ GECİKMESİ — el şarj sırasında silaha geçiyor (gerçekçi)');
tablo(350);
tablo(250);
tablo(150);
console.log('\n→ şarj süresi atış anını değiştirmiyorsa, şarj zaten "bedava":');
console.log('  gecikmeyi belirleyen tanıma onayları (mühür + silah).');
