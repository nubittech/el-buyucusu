/* DÜŞMAN DURUM MAKİNESİ — saklanma döngüsü ölçümü
   Önceki ölçüm (yzsikisma.js) yalnız "hedefe git"i simüle etti ve %0 sıkışma
   gösterdi — ama oyundaki asıl sorun fizik değil, DURUM MAKİNESİydi:

     oyuncuHazir, oyuncu şarjlı beceriyi beklettiği sürece doğru kalıyor
     (muhur.js'te şarjın zaman aşımı yok) → düşman siper arıyor → görüş
     kesiliyor → yaklas → görüş açılıyor → oyuncu HÂLÂ hazır → siper.

   Burada durum makinesinin kendisi koşturuluyor ve ölçülen şey:
     - düşmanın oyuncuyu GÖREBİLDİĞİ karelerin oranı
     - kaç kez ateş edebildiği
     - durum değişim sıklığı (gidip gelme = yüksek)  */

const AR=30, TELEGRAF=1100;
const OBS=[];
function addObs(x,z,w,d,h,dv){ OBS.push({minx:x-w/2,maxx:x+w/2,minz:z-d/2,maxz:z+d/2,h,duvar:dv}); }
addObs(0,-AR-1,AR*2+4,2.6,2.6,1); addObs(0,AR+1,AR*2+4,2.6,2.6,1);
addObs(-AR-1,0,2.6,AR*2+4,2.6,1); addObs(AR+1,0,2.6,AR*2+4,2.6,1);
{ let r=4242; const rnd=()=>((r=r*1103515245+12345&0x7fffffff)/0x7fffffff);
  const ASGARI=2.0;
  const yerUygun=(x,z,w,d)=>{
    for(const b of OBS){ if(b.duvar) continue;
      const gx=Math.max(0,Math.max((x-w/2)-b.maxx,b.minx-(x+w/2)));
      const gz=Math.max(0,Math.max((z-d/2)-b.maxz,b.minz-(z+d/2)));
      if(Math.hypot(gx,gz)<ASGARI) return false; }
    return true; };
  for(const a0 of [0.30,1.24,2.16,3.05,4.02,5.10]){
    const d0=9.5+rnd()*8;
    for(let dn=0;dn<8;dn++){
      const a=a0+(rnd()-0.5)*0.44, d=d0+(rnd()-0.5)*5.5;
      const x=Math.cos(a)*d,z=Math.sin(a)*d,w=1.6+rnd()*1.9,h=1.0+rnd()*1.5,dd=w*(0.74+rnd()*0.46);
      if(!yerUygun(x,z,w,dd)) continue; addObs(x,z,w,dd,h); break; }
    if(rnd()<0.6) for(let dn=0;dn<6;dn++){
      const a=a0+(rnd()-0.5)*0.7,d=d0+(rnd()-0.5)*7;
      const x=Math.cos(a)*d,z=Math.sin(a)*d,w=1.0+rnd()*0.8,dd=1.0+rnd()*0.7;
      if(!yerUygun(x,z,w,dd)) continue; addObs(x,z,w,dd,0.55+rnd()*0.4); break; }
  }
  for(let i=0;i<26;i++){
    const a=i/26*6.283185+(rnd()-0.5)*0.16;
    if(Math.min(Math.abs(a-1.45),Math.abs(a-4.6))<0.20) continue;
    for(let dn=0;dn<6;dn++){
      const d=21.5+rnd()*6.5,x=Math.cos(a)*d,z=Math.sin(a)*d;
      const h=2.6+rnd()*4.6,w=2.0+rnd()*2.2,dd=w*(0.78+rnd()*0.4);
      if(!yerUygun(x,z,w,dd)) continue; addObs(x,z,w,dd,h); break; }
  }
  for(const[a,d]of [[0.75,24],[2.55,25.5],[4.05,23],[5.6,25],[1.45,13.5]]){
    const x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(yerUygun(x,z,1.5,1.5)) addObs(x,z,1.5,1.5,2.4+rnd()*1.6); }
}
function pointBlocked(x,y,z){ for(const b of OBS){ if(y<b.h&&x>b.minx&&x<b.maxx&&z>b.minz&&z<b.maxz) return true; } return false; }
function hasLOS(x1,z1,x2,z2,y){
  const d=Math.hypot(x2-x1,z2-z1),st=Math.max(2,Math.ceil(d/0.6));
  for(let i=1;i<st;i++){const t=i/st; if(pointBlocked(x1+(x2-x1)*t,y,z1+(z2-z1)*t)) return false;}
  return true;
}
function pushOut(o,r){
  o.x=Math.max(-AR+r,Math.min(AR-r,o.x)); o.z=Math.max(-AR+r,Math.min(AR-r,o.z));
  for(const b of OBS){
    const cx=Math.max(b.minx,Math.min(o.x,b.maxx)), cz=Math.max(b.minz,Math.min(o.z,b.maxz));
    const dx=o.x-cx, dz=o.z-cz, d2=dx*dx+dz*dz;
    if(d2<r*r){ const d=Math.sqrt(d2);
      if(d<1e-3){ const dl=[o.x-b.minx,b.maxx-o.x,o.z-b.minz,b.maxz-o.z];
        const mi=dl.indexOf(Math.min(...dl));
        if(mi===0)o.x=b.minx-r;else if(mi===1)o.x=b.maxx+r;else if(mi===2)o.z=b.minz-r;else o.z=b.maxz+r;
      } else { const p=(r-d)/d; o.x+=dx*p; o.z+=dz*p; } }
  }
}
function bloke(x,z,r,y){
  if(Math.abs(x)>AR-r||Math.abs(z)>AR-r) return true;
  for(const b of OBS){ if(y>=b.h) continue;
    const cx=Math.max(b.minx,Math.min(x,b.maxx)), cz=Math.max(b.minz,Math.min(z,b.maxz));
    const dx=x-cx, dz=z-cz; if(dx*dx+dz*dz<r*r) return true; }
  return false;
}
const TARAMA=[0,0.35,-0.35,0.75,-0.75,1.20,-1.20,1.75,-1.75,2.40,-2.40,3.14159];
function yonSec(e,hx,hz,adim,r,gorusIste,P){
  const a0=Math.atan2(hz,hx); let yedek=null;
  for(const da of TARAMA){
    const a=a0+da, nx=e.x+Math.cos(a)*adim, nz=e.z+Math.sin(a)*adim;
    if(bloke(nx,nz,r,0.9)) continue;
    if(gorusIste){ if(hasLOS(nx,nz,P.x,P.z,1.2)) return [Math.cos(a),Math.sin(a)];
      if(!yedek) yedek=[Math.cos(a),Math.sin(a)]; continue; }
    return [Math.cos(a),Math.sin(a)];
  }
  return yedek||[0,0];
}
function siperNoktasi(e,P){
  let iyi=null,iyiD=1e9;
  for(const b of OBS){
    if(b.h<1.4) continue;
    const cx=(b.minx+b.maxx)/2, cz=(b.minz+b.maxz)/2;
    const gx=cx-P.x, gz=cz-P.z, gl=Math.hypot(gx,gz)||1;
    if(gl>22) continue;
    const yari=Math.max(b.maxx-b.minx,b.maxz-b.minz)/2+1.1;
    const hx=cx+gx/gl*yari, hz=cz+gz/gl*yari;
    if(Math.abs(hx)>AR-1||Math.abs(hz)>AR-1) continue;
    if(hasLOS(hx,hz,P.x,P.z,1.15)) continue;
    const d=Math.hypot(hx-e.x,hz-e.z);
    if(d<iyiD){iyiD=d;iyi={x:hx,z:hz,d};}
  }
  return iyi;
}

const DT=1/60;
/* tavan=Infinity → eski davranış (siper sınırsız) */
function sim(tavan, sure, tohum){
  let r=tohum; const rnd=()=>((r=r*1103515245+12345&0x7fffffff)/0x7fffffff);
  const P={x:0,z:0};
  const e={x:14,z:9,cd:2.0,bekle:2.4,sp:4.86,ss:1,siperSure:0,kacis:0,kx:0,kz:0,sonLos:false};
  let gorunur=0,kare=0,atis=0,degisim=0,son=null,siperKare=0;
  for(let t=0;t<sure;t+=DT){
    kare++;
    /* Oyuncu: yavaşça dolanıyor ve HEP şarjlı bekliyor (en kötü durum) */
    P.x=Math.cos(t*0.35)*7; P.z=Math.sin(t*0.35)*7;
    const oyuncuHazir=true;
    e.cd-=DT;
    const dx=P.x-e.x, dz=P.z-e.z, d=Math.hypot(dx,dz)||1e-6;
    const ux=dx/d, uz=dz/d;
    const los=hasLOS(e.x,e.z,P.x,P.z,1.2);
    if(los) gorunur++;
    const siperHakki = e.siperSure < tavan;
    let durum;
    if(!los) durum='yaklas';
    else if(e.cd<TELEGRAF/1000) durum='hazirlan';
    else if(oyuncuHazir&&siperHakki) durum='siper';
    else if(d>6.5) durum='yaklas';
    else if(d<3.6) durum='uzaklas';
    else durum='dolan';
    if(durum!==son){degisim++;son=durum;}
    if(durum==='siper') siperKare++;
    if(durum==='siper'||(durum==='yaklas'&&!los&&e.siperSure>0)) e.siperSure+=DT;

    let mx=0,mz=0,hiz=e.sp;
    if(durum==='yaklas'){mx=ux;mz=uz;}
    else if(durum==='uzaklas'){mx=-ux;mz=-uz;}
    else if(durum==='dolan'){mx=-uz*e.ss;mz=ux*e.ss;}
    else if(durum==='hazirlan'){hiz*=0.25;mx=-uz*e.ss*0.4;mz=ux*e.ss*0.4;}
    else { const sp=siperNoktasi(e,P);
      if(sp&&sp.d>0.8){const l=sp.d||1;mx=(sp.x-e.x)/l;mz=(sp.z-e.z)/l;hiz*=1.25;}
      else {mx=-uz*e.ss;mz=ux*e.ss;} }
    if(durum==='dolan'){mx+=ux*0.35;mz+=uz*0.35;}
    const ml=Math.hypot(mx,mz), oX=e.x, oZ=e.z;
    if(ml>1e-4){
      const adim=hiz*DT; let hx=mx/ml,hz=mz/ml;
      if(e.kacis>0){e.kacis-=DT;hx=e.kx;hz=e.kz;}
      const [sx,sz]=yonSec(e,hx,hz,Math.max(adim,0.05),0.62,durum==='yaklas'&&!los&&!(e.kacis>0),P);
      e.x+=sx*adim; e.z+=sz*adim;
    }
    pushOut(e,0.6);
    if(!(e.kacis>0)&&Math.hypot(e.x-oX,e.z-oZ)<hiz*DT*0.25){
      e.kacis=0.5; const y=rnd()<0.5?1:-1; e.kx=-uz*y; e.kz=ux*y;
    }
    if(!los) e.losKayip=(e.losKayip||0)+DT;
    if(los&&!e.sonLos&&(e.losKayip||0)>0.4) e.cd=Math.max(e.cd,TELEGRAF/1000+0.15);
    if(los) e.losKayip=0;
    e.sonLos=los;
    if(e.cd<=0&&los&&d<20){ atis++; e.cd=e.bekle*(0.85+rnd()*0.35); e.siperSure=0;
      e.cd=Math.max(e.cd,1.6); }
    else if(e.cd<=0&&!los) e.cd=0.35;
  }
  return {gorunur:gorunur/kare*100, atis, degisim, siper:siperKare/kare*100};
}

const SURE=60;
console.log(`\nDURUM MAKİNESİ — ${SURE} sn, oyuncu SÜREKLİ şarjlı · SEYRELTİLMİŞ harita (31 engel)\n`);
console.log('  siper tavanı   görüş %   atış   siperde %   durum değişimi');
console.log('  '+'-'.repeat(58));
for(const [ad,tav] of [['sınırsız (eski)',Infinity],['2.0 sn (yeni)',2.0],['1.2 sn',1.2]]){
  let g=0,a=0,dg=0,sp=0; const T=12;
  for(let k=0;k<T;k++){ const r=sim(tav,SURE,1000+k*7919); g+=r.gorunur;a+=r.atis;dg+=r.degisim;sp+=r.siper; }
  console.log(`  ${ad.padEnd(16)} %${(g/T).toFixed(1).padStart(5)}   ${(a/T).toFixed(1).padStart(4)}   %${(sp/T).toFixed(1).padStart(5)}      ${(dg/T).toFixed(0).padStart(4)}`);
}
console.log('\n  görüş %   = düşmanın oyuncuyu görebildiği kare oranı (yüksek iyi)');
console.log('  atış      = 60 sn\'de kaç kez ateş edebildi (yüksek iyi)');
console.log('  siperde % = saklanmakla geçen kare oranı (düşük iyi)\n');
