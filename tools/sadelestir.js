/* KUADRİK HATA İLE MESH SADELEŞTİRME (Garland–Heckbert)

   NEDEN BU, KÖŞE KÜMELEME DEĞİL:
   İlk sürüm köşeleri ızgaraya oturtup birleştiriyordu. Ölçüldü — 20.000 üçgenlik
   bina 800'e inince tanınmaz bir kağıt yumağına dönüyordu (çatı yok, kiriş yok),
   8.000'de ise doğru görünüyordu. Yani kaynak mesh sağlamdı, sorun yöntemdi.
   Izgara kümeleme yüzeyin DÜZ olup olmadığını umursamıyor: 3 metrelik düz bir
   duvarı da, 5 santimlik bir pencere pervazını da aynı hücreye eziyor.

   Kuadrik hata tam tersini yapıyor: bir köşenin komşu YÜZEY DÜZLEMLERİNE olan
   kare uzaklığını biriktiriyor. Düz bir duvarın ortasındaki köşe kaldırılınca
   hata sıfır — bedava siliniyor. Çatı sırtındaki köşe kaldırılınca hata büyük —
   korunuyor. Binalar büyük düzlemlerden oluştuğu için bu tam yerinde bir kazanç.

   KENAR KORUMASI: yalnız bir üçgene komşu kenarlar (siluet ve bölge sınırları)
   ek bir ceza kuadriği alıyor. Bölgeler ayrı ayrı sadeleştirildiği için bölge
   sınırı da "kenar" sayılıyor ve kiriş/duvar ayrımı keskin kalıyor.

   TERS DÖNME DENETİMİ: çökertme bir üçgenin normalini ters çevirecekse
   yapılmıyor. Bu denetim olmadan ince parçalar kendi içine katlanıp
   siyah lekelere dönüşüyor. */

/* --- küçük ikili yığın (en küçük önce) --- */
class Yigin{
  constructor(){ this.a=[]; }
  get boy(){ return this.a.length; }
  it(i){ const a=this.a;
    while(i>0){ const p=(i-1)>>1; if(a[p].c<=a[i].c) break; [a[p],a[i]]=[a[i],a[p]]; i=p; } }
  in(i){ const a=this.a, n=a.length;
    for(;;){ let k=i, l=2*i+1, r=l+1;
      if(l<n&&a[l].c<a[k].c) k=l;
      if(r<n&&a[r].c<a[k].c) k=r;
      if(k===i) break;
      [a[k],a[i]]=[a[i],a[k]]; i=k; } }
  ekle(x){ this.a.push(x); this.it(this.a.length-1); }
  al(){ const a=this.a, ust=a[0], son=a.pop();
    if(a.length){ a[0]=son; this.in(0); }
    return ust; }
}

/* Kuadrik: simetrik 4x4, 10 bağımsız terim
   [0]=xx [1]=xy [2]=xz [3]=xw [4]=yy [5]=yz [6]=yw [7]=zz [8]=zw [9]=ww */
const qSifir=()=>new Float64Array(10);
function qDuzlem(a,b,c,d,agirlik){
  const q=new Float64Array(10), w=agirlik===undefined?1:agirlik;
  q[0]=a*a*w; q[1]=a*b*w; q[2]=a*c*w; q[3]=a*d*w;
  q[4]=b*b*w; q[5]=b*c*w; q[6]=b*d*w;
  q[7]=c*c*w; q[8]=c*d*w; q[9]=d*d*w;
  return q;
}
function qTopla(hedef,q){ for(let i=0;i<10;i++) hedef[i]+=q[i]; }
function qHata(q,x,y,z){
  return q[0]*x*x + 2*q[1]*x*y + 2*q[2]*x*z + 2*q[3]*x
       + q[4]*y*y + 2*q[5]*y*z + 2*q[6]*y
       + q[7]*z*z + 2*q[8]*z + q[9];
}
/* En iyi konum: ∂hata/∂v = 0 → 3x3 çöz. Tekilse uç noktalar ve orta nokta
   arasından en ucuzu seçiliyor (düz yüzeylerde sistem sık sık tekil oluyor). */
function qEnIyi(q,p1,p2){
  const m=[q[0],q[1],q[2], q[1],q[4],q[5], q[2],q[5],q[7]];
  const det = m[0]*(m[4]*m[8]-m[5]*m[7])
            - m[1]*(m[3]*m[8]-m[5]*m[6])
            + m[2]*(m[3]*m[7]-m[4]*m[6]);
  if(Math.abs(det)>1e-10){
    const b=[-q[3],-q[6],-q[8]];
    const inv=(i,j)=>{
      const a=[[m[4],m[5]],[m[7],m[8]]];
      return a;
    };
    /* Cramer */
    const d0=b[0]*(m[4]*m[8]-m[5]*m[7]) - m[1]*(b[1]*m[8]-m[5]*b[2]) + m[2]*(b[1]*m[7]-m[4]*b[2]);
    const d1=m[0]*(b[1]*m[8]-m[5]*b[2]) - b[0]*(m[3]*m[8]-m[5]*m[6]) + m[2]*(m[3]*b[2]-b[1]*m[6]);
    const d2=m[0]*(m[4]*b[2]-b[1]*m[7]) - m[1]*(m[3]*b[2]-b[1]*m[6]) + b[0]*(m[3]*m[7]-m[4]*m[6]);
    const v=[d0/det,d1/det,d2/det];
    if(v.every(Number.isFinite)) return {v, h:Math.max(0,qHata(q,v[0],v[1],v[2]))};
  }
  const adaylar=[p1,p2,[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2,(p1[2]+p2[2])/2]];
  let en=adaylar[0], eh=Infinity;
  for(const a of adaylar){ const h=qHata(q,a[0],a[1],a[2]); if(h<eh){eh=h; en=a;} }
  return {v:en.slice(), h:Math.max(0,eh)};
}

/* pozisyonlar: [[x,y,z],...] · ucgenler: [[i,j,k],...] (poz indeksleri)
   hedef: istenen üçgen sayısı
   döner: {poz, ucgen} — sadeleştirilmiş */
/* etiketler (istege bagli): ucgen basina bolge numarasi.
   Verilirse KOSE ETIKET KUMESI hesaplanip iki ucu FARKLI kumeye sahip kenarlar
   cokertilmiyor. Sebep olculdu: bolgeler ayri ayri sadelestirilince ortak sinir
   iki yana kayiyor, aralarinda catlak aciliyor ve bina "patlamis" gorunuyor
   (cikti kenarlarinin %68'i acikti). Tek geciste sadelestirip sonra bolmek
   sinirlari birebir ayni konumda tutuyor. */
function sadelestirQEM(pozGiris, ucgenGiris, hedef, etiketler, sinirAgirlik){
  /* 1) KONUMA GÖRE KAYNAT. OBJ dosyaları UV/normal dikişlerinde aynı noktayı
     birden çok köşe olarak tutuyor; kaynatmazsak o dikişler "kenar" sanılıp
     hiç çökmüyor ve sadeleştirme duruyor. */
  const anahtar=new Map(), poz=[], eslem=new Int32Array(pozGiris.length);
  for(let i=0;i<pozGiris.length;i++){
    const p=pozGiris[i];
    const k=p[0].toFixed(5)+','+p[1].toFixed(5)+','+p[2].toFixed(5);
    let j=anahtar.get(k);
    if(j===undefined){ j=poz.length; anahtar.set(k,j); poz.push([p[0],p[1],p[2]]); }
    eslem[i]=j;
  }
  const gecerli=[];
  let ucgen=[];
  ucgenGiris.forEach((t,i)=>{
    const o=[eslem[t[0]],eslem[t[1]],eslem[t[2]]];
    if(o[0]===o[1]||o[1]===o[2]||o[0]===o[2]) return;
    ucgen.push(o); gecerli.push(etiketler?etiketler[i]:0);
  });
  const etiket=gecerli;

  const N=poz.length;
  const Q=Array.from({length:N},qSifir);
  const komsuUcgen=Array.from({length:N},()=>new Set());
  const yuzNormal=[];
  const duzlem=(t)=>{
    const A=poz[t[0]],B=poz[t[1]],C=poz[t[2]];
    let nx=(B[1]-A[1])*(C[2]-A[2])-(B[2]-A[2])*(C[1]-A[1]);
    let ny=(B[2]-A[2])*(C[0]-A[0])-(B[0]-A[0])*(C[2]-A[2]);
    let nz=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);
    const l=Math.hypot(nx,ny,nz);
    if(l<1e-12) return null;
    nx/=l;ny/=l;nz/=l;
    return [nx,ny,nz,-(nx*A[0]+ny*A[1]+nz*A[2]), l/2];
  };
  ucgen.forEach((t,ti)=>{
    const d=duzlem(t); yuzNormal[ti]=d;
    if(!d) return;
    /* alan ağırlığı: büyük duvar düzlemi küçük pervazdan daha çok söz sahibi */
    const q=qDuzlem(d[0],d[1],d[2],d[3],d[4]);
    for(const v of t){ qTopla(Q[v],q); komsuUcgen[v].add(ti); }
  });

  /* 2) KENARLAR + SINIR CEZASI */
  const kenar=new Map();                       /* "a,b" → [a,b] */
  const kenarYuz=new Map();                    /* "a,b" → üçgen sayısı */
  const ka=(a,b)=>a<b?a+','+b:b+','+a;
  ucgen.forEach((t,ti)=>{
    for(const [a,b] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
      const k=ka(a,b);
      kenar.set(k,[Math.min(a,b),Math.max(a,b)]);
      kenarYuz.set(k,(kenarYuz.get(k)||0)+1);
    }
  });
  /* Sınır kenarı (tek üçgene komşu): siluet ve bölge sınırı. O kenarı içeren
     düzleme dik bir "sanal duvar" kuadriği eklenerek pahalılaştırılıyor. */
  let sinirSayi=0;
  for(const [k,say] of kenarYuz){
    if(say!==1) continue;
    sinirSayi++;
    const [a,b]=kenar.get(k);
    const A=poz[a],B=poz[b];
    let ex=B[0]-A[0],ey=B[1]-A[1],ez=B[2]-A[2];
    const el=Math.hypot(ex,ey,ez)||1; ex/=el;ey/=el;ez/=el;
    /* kenara dik, komşu üçgenin düzlemine de dik bir düzlem */
    let ti=-1;
    for(const t of komsuUcgen[a]) if(komsuUcgen[b].has(t)){ ti=t; break; }
    const d=ti>=0?yuzNormal[ti]:null;
    if(!d) continue;
    let nx=ey*d[2]-ez*d[1], ny=ez*d[0]-ex*d[2], nz=ex*d[1]-ey*d[0];
    const nl=Math.hypot(nx,ny,nz)||1; nx/=nl;ny/=nl;nz/=nl;
    /* SINIR CEZASI AYARLANABİLİR.
       160 ile sınır neredeyse çivileniyordu. Malzeme etiketi dokudan geliyor ve
       mekânsal olarak gürültülü, yani kiriş–sıva sınırı düz bir bant değil
       testere dişi; ağır ceza o testere dişini olduğu gibi donduruyor ve duvar
       kemirilmiş görünüyor. Düşük ceza sınırın KENDİ üzerinde sadeleşip
       düzleşmesine izin veriyor — sınır sınır olarak kalıyor ama düzgünleşiyor. */
    const q=qDuzlem(nx,ny,nz,-(nx*A[0]+ny*A[1]+nz*A[2]), el*el*(sinirAgirlik===undefined?160:sinirAgirlik));
    qTopla(Q[a],q); qTopla(Q[b],q);
  }

  /* KÖŞE ETİKET MASKESİ: köşeye değen üçgenlerin bölgeleri, bit maskesi olarak.
     Aynı maskeye sahip iki köşe aynı sınır boyunca ilerliyor demektir ve
     birbirine çökebilir — sınır sadeleşir ama sınır olarak KALIR. Farklı maske
     ise iki farklı malzeme sınırının kesişimi; orası kilitleniyor. */
  const maske=new Int32Array(N);
  if(etiketler) ucgen.forEach((t,ti)=>{
    const bit=1<<Math.min(30,etiket[ti]);
    for(const v of t) maske[v]|=bit;
  });

  /* 3) ÇÖKERTME DÖNGÜSÜ */
  const olu=new Uint8Array(N);
  const surum=new Int32Array(N);               /* köşe her değiştiğinde artıyor */
  const yigin=new Yigin();
  const maliyet=(a,b)=>{
    const q=new Float64Array(10);
    for(let i=0;i<10;i++) q[i]=Q[a][i]+Q[b][i];
    const r=qEnIyi(q,poz[a],poz[b]);
    return {c:r.h, a, b, v:r.v, sa:surum[a], sb:surum[b]};
  };
  for(const [k,[a,b]] of kenar) yigin.ekle(maliyet(a,b));

  const ucgenOlu=new Uint8Array(ucgen.length);
  let kalanUcgen=ucgen.length;
  let atlanan=0;
  while(kalanUcgen>hedef && yigin.boy){
    const e=yigin.al();
    if(olu[e.a]||olu[e.b]) continue;
    if(e.sa!==surum[e.a]||e.sb!==surum[e.b]) continue;   /* bayat kayıt */
    if(etiketler && maske[e.a]!==maske[e.b]) continue;   /* bölge sınırı kilidi */
    /* ters dönme denetimi: b'yi a'ya katlayınca hiçbir üçgen ters dönmemeli */
    const etkilenen=new Set([...komsuUcgen[e.a],...komsuUcgen[e.b]]);
    let iyi=true;
    for(const ti of etkilenen){
      if(ucgenOlu[ti]) continue;
      const t=ucgen[ti];
      if((t[0]===e.a||t[0]===e.b)&&(t[1]===e.a||t[1]===e.b)) continue;  /* çökecek */
      if((t[1]===e.a||t[1]===e.b)&&(t[2]===e.a||t[2]===e.b)) continue;
      if((t[2]===e.a||t[2]===e.b)&&(t[0]===e.a||t[0]===e.b)) continue;
      const yeni=t.map(v=>(v===e.a||v===e.b)?-1:v);
      const P=[0,1,2].map(k=>yeni[k]<0?e.v:poz[yeni[k]]);
      let nx=(P[1][1]-P[0][1])*(P[2][2]-P[0][2])-(P[1][2]-P[0][2])*(P[2][1]-P[0][1]);
      let ny=(P[1][2]-P[0][2])*(P[2][0]-P[0][0])-(P[1][0]-P[0][0])*(P[2][2]-P[0][2]);
      let nz=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[1][1]-P[0][1])*(P[2][0]-P[0][0]);
      const l=Math.hypot(nx,ny,nz);
      const d=yuzNormal[ti];
      if(!d||l<1e-14){ iyi=false; break; }
      if((nx*d[0]+ny*d[1]+nz*d[2])/l < 0.05){ iyi=false; break; }   /* ters ya da iğne */
    }
    if(!iyi){ atlanan++; continue; }

    /* b → a */
    poz[e.a]=e.v; olu[e.b]=1; surum[e.a]++;
    qTopla(Q[e.a],Q[e.b]);
    for(const ti of komsuUcgen[e.b]) komsuUcgen[e.a].add(ti);
    const komsular=new Set();
    for(const ti of komsuUcgen[e.a]){
      if(ucgenOlu[ti]) continue;
      const t=ucgen[ti];
      for(let k=0;k<3;k++) if(t[k]===e.b) t[k]=e.a;
      if(t[0]===t[1]||t[1]===t[2]||t[2]===t[0]){ ucgenOlu[ti]=1; kalanUcgen--; continue; }
      const d=duzlem(t); if(d) yuzNormal[ti]=d;
      for(const v of t) if(v!==e.a&&!olu[v]) komsular.add(v);
    }
    for(const v of komsular) yigin.ekle(maliyet(e.a,v));
  }

  /* 4) TOPLA */
  const yeniIx=new Int32Array(N).fill(-1);
  const cPoz=[];
  const cUcgen=[], cEtiket=[];
  ucgen.forEach((t,ti)=>{
    if(ucgenOlu[ti]) return;
    if(t[0]===t[1]||t[1]===t[2]||t[2]===t[0]) return;
    const o=t.map(v=>{
      if(yeniIx[v]<0){ yeniIx[v]=cPoz.length; cPoz.push(poz[v]); }
      return yeniIx[v];
    });
    cUcgen.push(o); cEtiket.push(etiket[ti]);
  });
  return {poz:cPoz, ucgen:cUcgen, etiket:cEtiket, sinirSayi, atlanan};
}

module.exports={sadelestirQEM};
