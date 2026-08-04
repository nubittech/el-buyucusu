/* DÜŞMAN SIKIŞMASI — eski hareket vs yönlendirme
   Şikâyet: "nesnelerin arkasında kalıyor ve sıkışıyor". Sebep, hareketin
   "düz git → pushOut ile engelden çık" olması: kayaya doğru yürüyen düşman
   geri itiliyor, net ilerleme sıfır kalıyor.

   Burada arenanın engelleri index.html ile AYNI üreteçle kuruluyor (aynı
   tohum, aynı sıra), sonra iki strateji karşılaştırılıyor:
     ESKİ  — düz git, pushOut
     YENİ  — yonSec ile açı tara, engele girmeyen ilk yönü al
   Ölçülen: hedefe varma oranı, süre, ve "sıkışık kare" oranı. */

const AR = 30;
const OBS = [];
let sekilSayac = 0;
function addObs(x, z, w, d, h) {
  OBS.push({ minx:x-w/2, maxx:x+w/2, minz:z-d/2, maxz:z+d/2, h });
  sekilSayac++;
}
/* --- index.html ile birebir aynı yerleşim --- */
addObs(0,-AR-1,AR*2+4,2.6,2.6); addObs(0,AR+1,AR*2+4,2.6,2.6);
addObs(-AR-1,0,2.6,AR*2+4,2.6); addObs(AR+1,0,2.6,AR*2+4,2.6);
{ let r=4242; const rnd=()=>((r=r*1103515245+12345&0x7fffffff)/0x7fffffff);
  for(const a0 of [0.30,1.24,2.16,3.05,4.02,5.10]){
    const adet=2; const d0=9.5+rnd()*8;
    for(let i=0;i<adet;i++){
      const a=a0+(rnd()-0.5)*0.44, d=d0+(rnd()-0.5)*5.5;
      const w=1.6+rnd()*1.9, h=1.0+rnd()*1.5;
      addObs(Math.cos(a)*d,Math.sin(a)*d,w,w*(0.74+rnd()*0.46),h);
    }
    if(rnd()<0.6){ const a=a0+(rnd()-0.5)*0.7, d=d0+(rnd()-0.5)*7;
      addObs(Math.cos(a)*d,Math.sin(a)*d,1.0+rnd()*0.8,1.0+rnd()*0.7,0.55+rnd()*0.4); }
  }
  for(let i=0;i<26;i++){
    const a=i/26*6.283185+(rnd()-0.5)*0.16;
    if(Math.min(Math.abs(a-1.45),Math.abs(a-4.6))<0.20) continue;
    const d=21.5+rnd()*6.5, h=2.6+rnd()*4.6, w=2.0+rnd()*2.2;
    addObs(Math.cos(a)*d,Math.sin(a)*d,w,w*(0.78+rnd()*0.4),h);
  }
  for(const[a,d]of [[0.75,24],[2.55,25.5],[4.05,23],[5.6,25],[1.45,13.5]])
    addObs(Math.cos(a)*d,Math.sin(a)*d,1.5,1.5,2.4+rnd()*1.6);
}

function pushOut(o,r){
  o.x=Math.max(-AR+r,Math.min(AR-r,o.x));
  o.z=Math.max(-AR+r,Math.min(AR-r,o.z));
  for(const b of OBS){
    const cx=Math.max(b.minx,Math.min(o.x,b.maxx)), cz=Math.max(b.minz,Math.min(o.z,b.maxz));
    const dx=o.x-cx, dz=o.z-cz, d2=dx*dx+dz*dz;
    if(d2<r*r){
      const d=Math.sqrt(d2);
      if(d<1e-3){
        const dl=[o.x-b.minx,b.maxx-o.x,o.z-b.minz,b.maxz-o.z];
        const mi=dl.indexOf(Math.min(...dl));
        if(mi===0)o.x=b.minx-r;else if(mi===1)o.x=b.maxx+r;else if(mi===2)o.z=b.minz-r;else o.z=b.maxz+r;
      } else { const push=(r-d)/d; o.x+=dx*push; o.z+=dz*push; }
    }
  }
}
function bloke(x,z,r,y){
  if(Math.abs(x)>AR-r||Math.abs(z)>AR-r) return true;
  for(const b of OBS){
    if(y>=b.h) continue;
    const cx=Math.max(b.minx,Math.min(x,b.maxx)), cz=Math.max(b.minz,Math.min(z,b.maxz));
    const dx=x-cx, dz=z-cz;
    if(dx*dx+dz*dz<r*r) return true;
  }
  return false;
}
const TARAMA=[0,0.35,-0.35,0.75,-0.75,1.20,-1.20,1.75,-1.75,2.40,-2.40,3.14159];
function yonSec(e,hx,hz,adim,r){
  const a0=Math.atan2(hz,hx);
  for(const da of TARAMA){
    const a=a0+da, nx=e.x+Math.cos(a)*adim, nz=e.z+Math.sin(a)*adim;
    if(!bloke(nx,nz,r,0.9)) return [Math.cos(a),Math.sin(a)];
  }
  return [0,0];
}

const DT=1/60, HIZ=4.86, SURE=14;          /* en hızlı ninja, 14 sn üst sınır */
function kos(yeni, sx, sz, hx, hz){
  const e={x:sx,z:sz};
  let sikisik=0, kare=0, kacis=0, kx=0, kz=0;
  for(let t=0;t<SURE;t+=DT){
    kare++;
    const dx=hx-e.x, dz=hz-e.z, d=Math.hypot(dx,dz);
    if(d<1.2) return {vardi:true, sure:t, sikisikOran:sikisik/kare};
    const ux=dx/d, uz=dz/d;
    const ox=e.x, oz=e.z;
    if(yeni===2){
      /* KAÇIŞ: üst üste sıkışınca bir yana kilitlen ve 0.5 sn sürdür.
         Açgözlü yönlendirme içbükey cepte her karede aynı kararı verip
         kilitleniyor; kısa süreli taahhüt bu döngüyü kırıyor. */
      if(kacis>0){
        kacis-=DT;
        const [mx,mz]=yonSec(e,kx,kz,Math.max(HIZ*DT,0.05),0.62);
        e.x+=mx*HIZ*DT; e.z+=mz*HIZ*DT;
      } else {
        const [mx,mz]=yonSec(e,ux,uz,Math.max(HIZ*DT,0.05),0.62);
        e.x+=mx*HIZ*DT; e.z+=mz*HIZ*DT;
      }
    } else if(yeni){
      const [mx,mz]=yonSec(e,ux,uz,Math.max(HIZ*DT,0.05),0.62);
      e.x+=mx*HIZ*DT; e.z+=mz*HIZ*DT;
    } else {
      e.x+=ux*HIZ*DT; e.z+=uz*HIZ*DT;
    }
    pushOut(e,0.6);
    const ilerleme=Math.hypot(e.x-ox,e.z-oz);
    if(ilerleme < HIZ*DT*0.25){
      sikisik++;
      if(yeni===2 && kacis<=0){ kacis=0.5; const yan=Math.random()<0.5?1:-1; kx=-uz*yan; kz=ux*yan; }
    }
  }
  return {vardi:false, sure:SURE, sikisikOran:sikisik/kare};
}

let r=99991; const rnd=()=>((r=r*1103515245+12345&0x7fffffff)/0x7fffffff);
const DENEME=4000;
const testler=[];
for(let i=0;i<DENEME;i++){
  let sx,sz,hx,hz,g=0;
  do{ const a=rnd()*6.283, d=rnd()*26; sx=Math.cos(a)*d; sz=Math.sin(a)*d; }while(bloke(sx,sz,0.62,0.9)&&++g<50);
  g=0;
  do{ const a=rnd()*6.283, d=rnd()*22; hx=Math.cos(a)*d; hz=Math.sin(a)*d; }while(bloke(hx,hz,0.62,0.9)&&++g<50);
  testler.push([sx,sz,hx,hz]);
}
console.log(`\nDÜŞMAN YOL BULMA — ${DENEME} rastgele başlangıç→hedef, arena engelleri gerçek yerleşim\n`);
console.log('  strateji   hedefe vardı   ort. süre   sıkışık kare');
console.log('  ' + '-'.repeat(50));
for (const [ad, yeni] of [['ESKİ', false], ['YENİ', true], ['YENİ+kaçış', 2]]) {
  let vardi=0, top=0, sik=0;
  for (const [sx,sz,hx,hz] of testler){
    const r2=kos(yeni,sx,sz,hx,hz);
    if(r2.vardi){vardi++; top+=r2.sure;}
    sik+=r2.sikisikOran;
  }
  console.log(`  ${ad.padEnd(10)} %${(vardi/DENEME*100).toFixed(1).padStart(5)}       ` +
    `${vardi?(top/vardi).toFixed(2):'—'} sn     %${(sik/DENEME*100).toFixed(1)}`);
}
console.log('\n"sıkışık kare" = o karede kat edilen yol, olması gerekenin dörtte birinden az.\n');
