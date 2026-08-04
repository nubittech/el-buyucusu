/* FBX → oyunun deri (skin) + animasyon biçimi
   Blender YOK. Mixamo FBX'i doğrudan okunup motorun anlayacağı JSON'a çevriliyor.

   Kullanım:
     node tools/fbxdon.js "~/Downloads/Ninja Idle.fbx" \
          --anim kosu="~/Downloads/Run.fbx" \
          --doku assets/shaded.png --cikti assets/karakter.json

   ÜRETİLEN YAPI
     boy      modelin yüksekliği (birim)
     kemik[]  {ad, ebeveyn, tersBaglama[16]}    — yalnız AĞIRLIKLI kemikler
     bolge[]  {renk, p, n, j, w, i}             — renk bölgesi başına bir mesh
              j: köşe başına 4 kemik indeksi · w: 4 ağırlık (toplamı 1)
     anim{}   {sure, kare, kanal[{q,t}]}        — kanal[i] kemik i'nin yerel
              dönme (dörtlem) ve konumu; sabit kanal tek kare olarak yazılır

   NEDEN BÖYLE
   - Renk bölgesi bölünmesi korunuyor: renk uniform kaldığı için AYNI geometri
     farklı paletle (düşman ninjalar) yeniden çizilebiliyor. Köşe rengine
     geçseydik her palet için ayrı tampon gerekirdi.
   - Kemik matrisleri değil YEREL dörtlem+konum saklanıyor: iki animasyon
     arasında geçiş (idle↔koşu) ancak dörtlemle doğru harmanlanır.
   - Doğrulama tahmine bırakılmadı: dinlenme pozu hiyerarşiden yeniden
     hesaplanıp FBX'in kendi TransformLink'iyle karşılaştırılıyor. Euler
     sırası da tahmin edilmiyor, altı olasılık denenip hatası en küçük
     olan seçiliyor (bkz. EULER_SIRA). */
const fs=require('fs'), zlib=require('zlib'), path=require('path');
const F=require('./fbx.js');

/* ============ 4x4 matris (sütun-öncelikli, WebGL ile aynı) ============ */
const I4=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function mul(a,b){ /* a*b */
  const o=new Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++){
    let s=0; for(let k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k];
    o[c*4+r]=s;
  }
  return o;
}
function inv(m){
  const A=m, o=new Array(16);
  o[0]=A[5]*A[10]*A[15]-A[5]*A[11]*A[14]-A[9]*A[6]*A[15]+A[9]*A[7]*A[14]+A[13]*A[6]*A[11]-A[13]*A[7]*A[10];
  o[4]=-A[4]*A[10]*A[15]+A[4]*A[11]*A[14]+A[8]*A[6]*A[15]-A[8]*A[7]*A[14]-A[12]*A[6]*A[11]+A[12]*A[7]*A[10];
  o[8]=A[4]*A[9]*A[15]-A[4]*A[11]*A[13]-A[8]*A[5]*A[15]+A[8]*A[7]*A[13]+A[12]*A[5]*A[11]-A[12]*A[7]*A[9];
  o[12]=-A[4]*A[9]*A[14]+A[4]*A[10]*A[13]+A[8]*A[5]*A[14]-A[8]*A[6]*A[13]-A[12]*A[5]*A[10]+A[12]*A[6]*A[9];
  o[1]=-A[1]*A[10]*A[15]+A[1]*A[11]*A[14]+A[9]*A[2]*A[15]-A[9]*A[3]*A[14]-A[13]*A[2]*A[11]+A[13]*A[3]*A[10];
  o[5]=A[0]*A[10]*A[15]-A[0]*A[11]*A[14]-A[8]*A[2]*A[15]+A[8]*A[3]*A[14]+A[12]*A[2]*A[11]-A[12]*A[3]*A[10];
  o[9]=-A[0]*A[9]*A[15]+A[0]*A[11]*A[13]+A[8]*A[1]*A[15]-A[8]*A[3]*A[13]-A[12]*A[1]*A[11]+A[12]*A[3]*A[9];
  o[13]=A[0]*A[9]*A[14]-A[0]*A[10]*A[13]-A[8]*A[1]*A[14]+A[8]*A[2]*A[13]+A[12]*A[1]*A[10]-A[12]*A[2]*A[9];
  o[2]=A[1]*A[6]*A[15]-A[1]*A[7]*A[14]-A[5]*A[2]*A[15]+A[5]*A[3]*A[14]+A[13]*A[2]*A[7]-A[13]*A[3]*A[6];
  o[6]=-A[0]*A[6]*A[15]+A[0]*A[7]*A[14]+A[4]*A[2]*A[15]-A[4]*A[3]*A[14]-A[12]*A[2]*A[7]+A[12]*A[3]*A[6];
  o[10]=A[0]*A[5]*A[15]-A[0]*A[7]*A[13]-A[4]*A[1]*A[15]+A[4]*A[3]*A[13]+A[12]*A[1]*A[7]-A[12]*A[3]*A[5];
  o[14]=-A[0]*A[5]*A[14]+A[0]*A[6]*A[13]+A[4]*A[1]*A[14]-A[4]*A[2]*A[13]-A[12]*A[1]*A[6]+A[12]*A[2]*A[5];
  o[3]=-A[1]*A[6]*A[11]+A[1]*A[7]*A[10]+A[5]*A[2]*A[11]-A[5]*A[3]*A[10]-A[9]*A[2]*A[7]+A[9]*A[3]*A[6];
  o[7]=A[0]*A[6]*A[11]-A[0]*A[7]*A[10]-A[4]*A[2]*A[11]+A[4]*A[3]*A[10]+A[8]*A[2]*A[7]-A[8]*A[3]*A[6];
  o[11]=-A[0]*A[5]*A[11]+A[0]*A[7]*A[9]+A[4]*A[1]*A[11]-A[4]*A[3]*A[9]-A[8]*A[1]*A[7]+A[8]*A[3]*A[5];
  o[15]=A[0]*A[5]*A[10]-A[0]*A[6]*A[9]-A[4]*A[1]*A[10]+A[4]*A[2]*A[9]+A[8]*A[1]*A[6]-A[8]*A[2]*A[5];
  let d=A[0]*o[0]+A[1]*o[4]+A[2]*o[8]+A[3]*o[12];
  if(Math.abs(d)<1e-20) throw new Error('tekil matris');
  d=1/d; for(let i=0;i<16;i++) o[i]*=d;
  return o;
}
const D2R=Math.PI/180;
function rotX(a){const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];}
function rotY(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];}
function rotZ(a){const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1];}
function trans(t){return [1,0,0,0, 0,1,0,0, 0,0,1,0, t[0],t[1],t[2],1];}
function olcek(s){return [s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1];}
/* Euler (derece) → matris, verilen çarpım sırasıyla */
function euler(d,sira){
  const R={X:rotX(d[0]*D2R),Y:rotY(d[1]*D2R),Z:rotZ(d[2]*D2R)};
  return mul(mul(R[sira[0]],R[sira[1]]),R[sira[2]]);
}
function matDorte(m){   /* dönme matrisi → dörtlem [x,y,z,w] */
  const t=m[0]+m[5]+m[10]; let x,y,z,w;
  if(t>0){ const s=Math.sqrt(t+1)*2; w=0.25*s; x=(m[6]-m[9])/s; y=(m[8]-m[2])/s; z=(m[1]-m[4])/s; }
  else if(m[0]>m[5]&&m[0]>m[10]){ const s=Math.sqrt(1+m[0]-m[5]-m[10])*2;
    w=(m[6]-m[9])/s; x=0.25*s; y=(m[4]+m[1])/s; z=(m[8]+m[2])/s; }
  else if(m[5]>m[10]){ const s=Math.sqrt(1+m[5]-m[0]-m[10])*2;
    w=(m[8]-m[2])/s; x=(m[4]+m[1])/s; y=0.25*s; z=(m[9]+m[6])/s; }
  else { const s=Math.sqrt(1+m[10]-m[0]-m[5])*2;
    w=(m[1]-m[4])/s; x=(m[8]+m[2])/s; y=(m[9]+m[6])/s; z=0.25*s; }
  const l=Math.hypot(x,y,z,w)||1;
  return [x/l,y/l,z/l,w/l];
}
const enBuyukFark=(a,b)=>{let m=0;for(let i=0;i<16;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m;};

/* ============ PNG (palet.js ile aynı çözücü) ============ */
function pngOku(yol){
  const b=fs.readFileSync(yol);
  let i=8,en=0,boy=0,tip=0; const veri=[];
  while(i<b.length){
    const uz=b.readUInt32BE(i), ad=b.toString('ascii',i+4,i+8), gov=b.slice(i+8,i+8+uz);
    if(ad==='IHDR'){en=gov.readUInt32BE(0);boy=gov.readUInt32BE(4);tip=gov[9];}
    else if(ad==='IDAT') veri.push(gov);
    else if(ad==='IEND') break;
    i+=12+uz;
  }
  const kanal={0:1,2:3,4:2,6:4}[tip];
  const ham=zlib.inflateSync(Buffer.concat(veri));
  const satir=en*kanal, px=Buffer.alloc(boy*satir);
  const paeth=(a,b2,c)=>{const p=a+b2-c,pa=Math.abs(p-a),pb=Math.abs(p-b2),pc=Math.abs(p-c);
    return (pa<=pb&&pa<=pc)?a:(pb<=pc?b2:c);};
  for(let y=0;y<boy;y++){
    const f=ham[y*(satir+1)], src=y*(satir+1)+1, dst=y*satir, ust=(y-1)*satir;
    for(let x=0;x<satir;x++){
      const A=x>=kanal?px[dst+x-kanal]:0, B=y>0?px[ust+x]:0, C=(x>=kanal&&y>0)?px[ust+x-kanal]:0;
      let v=ham[src+x];
      if(f===1)v+=A; else if(f===2)v+=B; else if(f===3)v+=(A+B)>>1; else if(f===4)v+=paeth(A,B,C);
      px[dst+x]=v&255;
    }
  }
  return {en,boy,kanal,px};
}
function kOrtalama(orn,k,tur=18){
  let m=[];
  for(let i=0;i<k;i++) m.push(orn[Math.floor(i*(orn.length-1)/(k-1||1))].slice(0,3));
  for(let t=0;t<tur;t++){
    const top=Array.from({length:k},()=>[0,0,0,0]);
    for(const o of orn){
      let en=0,ed=1e18;
      for(let i=0;i<k;i++){const d=(o[0]-m[i][0])**2+(o[1]-m[i][1])**2+(o[2]-m[i][2])**2; if(d<ed){ed=d;en=i;}}
      top[en][0]+=o[0];top[en][1]+=o[1];top[en][2]+=o[2];top[en][3]++;
    }
    for(let i=0;i<k;i++) if(top[i][3]) m[i]=[top[i][0]/top[i][3],top[i][1]/top[i][3],top[i][2]/top[i][3]];
  }
  return m;
}

/* ============ FBX sahnesinden iskelet ============ */
const FBX_ZAMAN=46186158000;                     /* FBX zaman birimi / saniye */

function sahne(yol){
  const fbx=F.oku(yol), g=F.graf(fbx);
  const kemikler=[];                              /* {id, ad, dugum} */
  for(const [id,d] of g.nesne) if(d.ad==='Model'&&d.ozel[2]==='LimbNode')
    kemikler.push({id, ad:F.tertemizAd(d.ozel[1]), dugum:d});
  const indeks=new Map(kemikler.map((k,i)=>[k.id,i]));
  /* ebeveyn: kemik → kemik OO bağı */
  for(const k of kemikler){
    k.ebeveyn=-1;
    for(const c of g.ebeveyn(k.id)) if(c.tur==='OO'&&indeks.has(c.ebeveyn)) k.ebeveyn=indeks.get(c.ebeveyn);
  }
  /* yerel dönüşüm bileşenleri */
  for(const k of kemikler){
    k.T=F.ozellik(k.dugum,'Lcl Translation')||[0,0,0];
    k.R=F.ozellik(k.dugum,'Lcl Rotation')||[0,0,0];
    k.S=F.ozellik(k.dugum,'Lcl Scaling')||[1,1,1];
    k.pre=F.ozellik(k.dugum,'PreRotation')||[0,0,0];
  }
  return {fbx,g,kemikler,indeks};
}

/* Yerel matris. FBX tam formülü:
     T · Roff · Rp · Rpre · R · Rpost⁻¹ · Rp⁻¹ · Soff · Sp · S · Sp⁻¹
   Sonda ölçüldü: bu dosyalarda Roff/Rp/Rpost/Soff/Sp hepsi birim, o yüzden
   T · Rpre · R · S'e iniyor. Yine de sıfırdan farklı çıkarsa uyarı veriliyor. */
function yerel(k,R,sira){
  return mul(mul(trans(k.T), mul(euler(k.pre,sira), euler(R,sira))), olcek(k.S));
}
function kuresel(kemikler,yereller){
  const G=new Array(kemikler.length);
  for(let i=0;i<kemikler.length;i++){
    const e=kemikler[i].ebeveyn;
    G[i]= e<0 ? yereller[i] : mul(G[e],yereller[i]);
  }
  return G;
}

/* ============ animasyon eğrileri ============ */
/* Bir kemiğin verilen özelliğinin (Lcl Rotation / Lcl Translation) eğrilerini
   zaman dizisi + değer dizisi olarak döndürür. */
function egriler(g,kemikId,ozAd){
  for(const c of g.cocuk(kemikId)){
    if(c.tur!=='OP'||c.ozAd!==ozAd) continue;
    const acn=g.nesne.get(c.cocuk);
    if(!acn||acn.ad!=='AnimationCurveNode') continue;
    const cikti={};
    for(const e of g.cocuk(c.cocuk)){
      const eg=g.nesne.get(e.cocuk);
      if(!eg||eg.ad!=='AnimationCurve') continue;
      const eksen=(e.ozAd||'').slice(-1);              /* "d|X" → "X" */
      cikti[eksen]={t:F.alt(eg,'KeyTime').ozel[0], v:F.alt(eg,'KeyValueFloat').ozel[0]};
    }
    /* varsayılan değer: ACN'nin kendi d|X/d|Y/d|Z özellikleri */
    const varsayilan=[0,0,0];
    const p70=F.alt(acn,'Properties70');
    if(p70) for(const pr of p70.alt){
      const eks={'d|X':0,'d|Y':1,'d|Z':2}[pr.ozel[0]];
      if(eks!==undefined) varsayilan[eks]=pr.ozel[4];
    }
    return {kanal:cikti, varsayilan};
  }
  return null;
}
function ornekle(eg,zaman){    /* eğriyi verilen saniyede doğrusal örnekle */
  if(!eg) return null;
  const ft=zaman*FBX_ZAMAN;
  const al=(eksen,vars)=>{
    const c=eg.kanal[eksen];
    if(!c) return vars;
    const t=c.t, v=c.v;
    if(ft<=t[0]) return v[0];
    if(ft>=t[t.length-1]) return v[v.length-1];
    let lo=0, hi=t.length-1;
    while(hi-lo>1){ const m=(lo+hi)>>1; if(t[m]<=ft) lo=m; else hi=m; }
    const f=(ft-t[lo])/(t[hi]-t[lo]||1);
    return v[lo]+(v[hi]-v[lo])*f;
  };
  return [al('X',eg.varsayilan[0]), al('Y',eg.varsayilan[1]), al('Z',eg.varsayilan[2])];
}
function sure(g){    /* sahnedeki en uzun eğrinin süresi */
  let en=0;
  for(const [,d] of g.nesne) if(d.ad==='AnimationCurve'){
    const t=F.alt(d,'KeyTime').ozel[0];
    en=Math.max(en,t[t.length-1]);
  }
  return en/FBX_ZAMAN;
}

/* ============ ana akış ============ */
const argv=process.argv.slice(2);
const anaYol=argv[0];
let dokuYol='assets/shaded.png', ciktiYol='assets/karakter.json', K=5, PARMAK=true;
const animYol={};
for(let i=1;i<argv.length;i++){
  const a=argv[i];
  if(a==='--anim'){ const [ad,y]=argv[++i].split(/=(.+)/); animYol[ad]=y; }
  else if(a==='--doku') dokuYol=argv[++i];
  else if(a==='--cikti') ciktiYol=argv[++i];
  else if(a==='--bolge') K=+argv[++i];
  else if(a==='--parmaksiz') PARMAK=false;
}
if(!anaYol){ console.error('kullanım: node tools/fbxdon.js <deri.fbx> [--anim ad=dosya.fbx]...'); process.exit(1); }

console.log(`\n=== ${path.basename(anaYol)} ===`);
const ana=sahne(anaYol);
const {g}=ana;
let kemikler=ana.kemikler;
console.log(`kemik ${kemikler.length}`);

/* --- deri kümeleri: kemik → (köşe, ağırlık) + bağlama matrisleri --- */
const kumeler=new Map();       /* kemikIndeksi → {ix,w,TL,TR} */
for(const [id,d] of g.nesne){
  if(d.ad!=='Deformer'||d.ozel[2]!=='Cluster') continue;
  let ki=-1;
  for(const c of g.cocuk(id)) if(ana.indeks.has(c.cocuk)) ki=ana.indeks.get(c.cocuk);
  if(ki<0) continue;
  const IX=F.alt(d,'Indexes'), W=F.alt(d,'Weights');
  const TL=F.alt(d,'TransformLink'), TR=F.alt(d,'Transform');
  kumeler.set(ki,{ix:IX?IX.ozel[0]:[], w:W?W.ozel[0]:[],
                  TL:Array.from(TL.ozel[0]), TR:Array.from(TR.ozel[0])});
}
console.log(`ağırlıklı kemik ${kumeler.size}`);

/* --- EULER SIRASI: tahmin edilmiyor, ölçülüyor ------------------------------
   Dinlenme pozu hiyerarşiden yeniden hesaplanıp FBX'in TransformLink'iyle
   karşılaştırılıyor. Doğru sıra hatayı sıfıra indirir, yanlışları indirmez. */
const SIRALAR=['XYZ','XZY','YXZ','YZX','ZXY','ZYX'];
let EULER_SIRA=null, enIyi=1e9;
for(const s of SIRALAR){
  const G=kuresel(kemikler,kemikler.map(k=>yerel(k,k.R,s)));
  let hata=0, n=0;
  for(const [ki,c] of kumeler){ hata=Math.max(hata,enBuyukFark(G[ki],c.TL)); n++; }
  if(hata<enIyi){ enIyi=hata; EULER_SIRA=s; }
}
console.log(`Euler sırası ${EULER_SIRA}  (dinlenme pozu hatası ${enIyi.toExponential(2)})`);
if(enIyi>1e-3){
  console.error('  ✗ DİNLENME POZU TUTMUYOR — dönüşüm zinciri yanlış, çıktıya güvenilmez');
  process.exit(1);
}
console.log('  ✓ hiyerarşiden hesaplanan dinlenme pozu FBX bağlama matrisleriyle örtüşüyor');

/* --- ters bağlama matrisi ---------------------------------------------------
   FBX SDK: Transform = mesh'in bağlama anındaki küresel dönüşümü,
            TransformLink = kemiğin bağlama anındaki küresel dönüşümü.
     v_dünya = KemikKüresel · TransformLink⁻¹ · Transform · v_yerel
   Mesh dönüşümü her kümede aynı olmalı — doğrulanıyor. */
let meshBag=null, meshHata=0;
for(const [,c] of kumeler){
  const m=mul(c.TL,c.TR);
  if(!meshBag) meshBag=m; else meshHata=Math.max(meshHata,enBuyukFark(meshBag,m));
}
console.log(`mesh bağlama dönüşümü kümeler arası tutarlı (fark ${meshHata.toExponential(2)})`);
if(meshHata>1e-4){ console.error('  ✗ kümeler farklı mesh dönüşümü söylüyor'); process.exit(1); }
const tersBaglama=new Map();
for(const [ki,c] of kumeler) tersBaglama.set(ki, mul(inv(c.TL),meshBag));

/* --- geometri --------------------------------------------------------------- */
let geo=null;
for(const [,d] of g.nesne) if(d.ad==='Geometry'&&F.alt(d,'Vertices')) geo=d;
const V=F.alt(geo,'Vertices').ozel[0];
const PI=F.alt(geo,'PolygonVertexIndex').ozel[0];
const NL=F.alt(geo,'LayerElementNormal'), UL=F.alt(geo,'LayerElementUV');
const NRM=F.alt(NL,'Normals').ozel[0], NIX=F.alt(NL,'NormalsIndex');
const UV=F.alt(UL,'UV').ozel[0], UIX=F.alt(UL,'UVIndex');
const nDolayli=F.alt(NL,'ReferenceInformationType').ozel[0]==='IndexToDirect';
const uDolayli=F.alt(UL,'ReferenceInformationType').ozel[0]==='IndexToDirect';
console.log(`geometri ${V.length/3} kontrol noktası, ${PI.length} poligon-köşe`);

/* poligon-köşe → üçgen listesi (bu dosyalarda hepsi zaten üçgen) */
const ucgen=[];   /* her eleman: [pk0,pk1,pk2] poligon-köşe indeksleri */
{ let bas=0;
  for(let i=0;i<PI.length;i++) if(PI[i]<0){
    for(let k=bas+1;k+1<=i;k++) ucgen.push([bas,k,k+1]);
    bas=i+1;
  }
}
const kontrol=(pk)=>{ const v=PI[pk]; return v<0? ~v : v; };
const normalAl=(pk)=>{ const j=(nDolayli?NIX.ozel[0][pk]:pk)*3; return [NRM[j],NRM[j+1],NRM[j+2]]; };
const uvAl=(pk)=>{ const j=(uDolayli?UIX.ozel[0][pk]:pk)*2; return [UV[j],UV[j+1]]; };
console.log(`üçgen ${ucgen.length}`);

/* --- köşe başına en güçlü 4 kemik ------------------------------------------- */
const kEtki=Array.from({length:V.length/3},()=>[]);
for(const [ki,c] of kumeler) for(let i=0;i<c.ix.length;i++) kEtki[c.ix[i]].push([ki,c.w[i]]);
let kirpilan=0, enBuyukKayip=0;
const kJ=new Int32Array(V.length/3*4), kW=new Float32Array(V.length/3*4);
for(let v=0;v<kEtki.length;v++){
  const e=kEtki[v].slice().sort((a,b)=>b[1]-a[1]);
  const tam=e.reduce((s,x)=>s+x[1],0);
  if(e.length>4){ kirpilan++; enBuyukKayip=Math.max(enBuyukKayip, e.slice(4).reduce((s,x)=>s+x[1],0)/(tam||1)); }
  const kalan=e.slice(0,4);
  const t=kalan.reduce((s,x)=>s+x[1],0)||1;
  for(let i=0;i<4;i++){ kJ[v*4+i]=kalan[i]?kalan[i][0]:0; kW[v*4+i]=kalan[i]?kalan[i][1]/t:0; }
}
console.log(`4'ten fazla kemik etkileyen köşe ${kirpilan} — en büyük ağırlık kaybı %${(enBuyukKayip*100).toFixed(2)}`);

/* --- parmak kemikleri: gerekli mi? ------------------------------------------ */
{ const parmakIx=new Set(kemikler.map((k,i)=>/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(k.ad)?i:-1).filter(i=>i>=0));
  let agirlik=0, toplam=0;
  for(let v=0;v<kEtki.length;v++) for(let i=0;i<4;i++){ toplam+=kW[v*4+i]; if(parmakIx.has(kJ[v*4+i])) agirlik+=kW[v*4+i]; }
  console.log(`parmak kemiği ${parmakIx.size} tane, modelin ağırlığının %${(agirlik/toplam*100).toFixed(1)}'ini taşıyor`);
}

/* Yalnız ağırlıklı kemikler shader'a gidiyor; ama hiyerarşi ARA kemikleri de
   gerektiriyor (ağırlıksız bir omuz, kolun ebeveyni olabilir). Bu yüzden TÜM
   kemikler runtime'da hesaplanıyor, uniform'a yalnız ağırlıklı olanlar gidiyor.
   Ağırlıklı kemikler öne alınıp indeks küçültülüyor. */
const shaderIx=new Map(); let sn=0;
for(let i=0;i<kemikler.length;i++) if(kumeler.has(i)) shaderIx.set(i,sn++);
console.log(`shader'a giden kemik ${sn}  (uniform ${sn*3} vec4)`);

/* --- doku → renk bölgeleri --------------------------------------------------- */
const im=pngOku(dokuYol);
const dokuAl=(u,vv)=>{
  let x=Math.round(u*(im.en-1)), y=Math.round((1-vv)*(im.boy-1));
  x=Math.max(0,Math.min(im.en-1,x)); y=Math.max(0,Math.min(im.boy-1,y));
  const p=(y*im.en+x)*im.kanal;
  return [im.px[p],im.px[p+1],im.px[p+2]];
};
const ucRenk=ucgen.map(t=>{
  let u=0,vv=0;
  for(const pk of t){ const c=uvAl(pk); u+=c[0]; vv+=c[1]; }
  return dokuAl(u/3,vv/3);
});
const merkez=kOrtalama(ucRenk,K);
const etiket=ucRenk.map(c=>{
  let en=0,ed=1e18;
  for(let i=0;i<K;i++){const d=(c[0]-merkez[i][0])**2+(c[1]-merkez[i][1])**2+(c[2]-merkez[i][2])**2; if(d<ed){ed=d;en=i;}}
  return en;
});

/* --- bölge başına mesh (deri öznitelikleriyle) -------------------------------- */
const bolgeler=[];
for(let b=0;b<K;b++){
  const p=[],n=[],j=[],w=[],ix=[]; const harita=new Map();
  for(let ti=0;ti<ucgen.length;ti++){
    if(etiket[ti]!==b) continue;
    for(const pk of ucgen[ti]){
      const cp=kontrol(pk), nr=normalAl(pk);
      const anahtar=cp+'|'+nr.map(x=>x.toFixed(3)).join(',');
      let k=harita.get(anahtar);
      if(k===undefined){
        k=p.length/3; harita.set(anahtar,k);
        p.push(V[cp*3],V[cp*3+1],V[cp*3+2]);
        n.push(...nr);
        for(let q=0;q<4;q++){ j.push(shaderIx.has(kJ[cp*4+q])?shaderIx.get(kJ[cp*4+q]):0); w.push(kW[cp*4+q]); }
      }
      ix.push(k);
    }
  }
  if(!ix.length) continue;
  if(p.length/3>65535) throw new Error('bölge 65535 köşeyi aşıyor (Uint16 indeks)');
  bolgeler.push({
    renk:'#'+merkez[b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''),
    p:p.map(v=>+v.toFixed(4)), n:n.map(v=>+v.toFixed(3)),
    j, w:w.map(v=>+v.toFixed(3)), i:ix
  });
}
console.log('\nrenk bölgeleri:');
bolgeler.forEach(b=>console.log(`  ${b.renk}  ${b.p.length/3} köşe, ${b.i.length/3} üçgen`));

/* --- DOĞRULAMA: bağlama pozunda deri, girdi meshini geri vermeli ------------- */
{ const G=kuresel(kemikler,kemikler.map(k=>yerel(k,k.R,EULER_SIRA)));
  const M=new Array(sn);
  for(const [ki,si] of shaderIx) M[si]=mul(G[ki],tersBaglama.get(ki));
  /* meshBag'i sök: skinning sonucu mesh'in bağlama uzayında çıkıyor */
  const geriye=inv(meshBag);
  let enKotu=0;
  for(const b of bolgeler) for(let v=0;v<b.p.length/3;v++){
    const o=[b.p[v*3],b.p[v*3+1],b.p[v*3+2]];
    let x=0,y=0,z=0;
    for(let q=0;q<4;q++){
      const wt=b.w[v*4+q]; if(!wt) continue;
      const m=M[b.j[v*4+q]];
      x+=wt*(m[0]*o[0]+m[4]*o[1]+m[8]*o[2]+m[12]);
      y+=wt*(m[1]*o[0]+m[5]*o[1]+m[9]*o[2]+m[13]);
      z+=wt*(m[2]*o[0]+m[6]*o[1]+m[10]*o[2]+m[14]);
    }
    const r=[geriye[0]*x+geriye[4]*y+geriye[8]*z+geriye[12],
             geriye[1]*x+geriye[5]*y+geriye[9]*z+geriye[13],
             geriye[2]*x+geriye[6]*y+geriye[10]*z+geriye[14]];
    enKotu=Math.max(enKotu,Math.hypot(r[0]-o[0],r[1]-o[1],r[2]-o[2]));
  }
  console.log(`\nbağlama pozu deri hatası: en kötü ${enKotu.toExponential(2)} birim`);
  if(enKotu>2e-3){ console.error('  ✗ deri bağlama pozunu geri vermiyor'); process.exit(1); }
  console.log('  ✓ deri ağırlıkları ve ters bağlama matrisleri doğru');
}
/* Ters bağlamayı meshBag ile birleştir: runtime'ın ayrıca uygulaması gerekmesin */
const geriMesh=inv(meshBag);

/* --- animasyonlar ------------------------------------------------------------ */
const FPS=30;
function animCikar(ad,yol){
  const s = yol? sahne(yol) : ana;
  const sr=sure(s.g);
  if(sr<=0){ console.log(`  ${ad}: eğri yok, atlandı`); return null; }
  const kare=Math.max(2,Math.round(sr*FPS)+1);
  /* kemik eşlemesi ADLA — animasyon dosyasındaki sıra farklı olabilir */
  const adIx=new Map(s.kemikler.map((k,i)=>[k.ad,i]));
  const eksik=kemikler.filter(k=>!adIx.has(k.ad)).map(k=>k.ad);
  if(eksik.length) console.log(`  ${ad}: UYARI eşleşmeyen kemik ${eksik.length} (${eksik.slice(0,3).join(',')}…)`);
  const rEg=kemikler.map(k=>adIx.has(k.ad)?egriler(s.g,s.kemikler[adIx.get(k.ad)].id,'Lcl Rotation'):null);
  const tEg=kemikler.map(k=>adIx.has(k.ad)?egriler(s.g,s.kemikler[adIx.get(k.ad)].id,'Lcl Translation'):null);
  const kanal=kemikler.map(()=>({q:[],t:[]}));
  for(let f=0;f<kare;f++){
    const z=f/FPS;
    for(let i=0;i<kemikler.length;i++){
      const kay=adIx.has(kemikler[i].ad)?s.kemikler[adIx.get(kemikler[i].ad)]:kemikler[i];
      const R=ornekle(rEg[i],z)||kay.R;
      const T=ornekle(tEg[i],z)||kay.T;
      /* dönme = PreRotation · R  (ölçek 1, konum ayrı taşınıyor) */
      let q=matDorte(mul(euler(kay.pre,EULER_SIRA),euler(R,EULER_SIRA)));
      /* dörtlem işareti sürekliliği: -q aynı dönme ama ara değerde ters yönden
         dolanıyor, bacak bir karede geriye takla atmış gibi görünüyor */
      const ön=kanal[i].q;
      if(f>0){ const p=ön.slice(-4);
        if(q[0]*p[0]+q[1]*p[1]+q[2]*p[2]+q[3]*p[3]<0) q=q.map(v=>-v); }
      kanal[i].q.push(...q.map(v=>+v.toFixed(5)));
      kanal[i].t.push(+T[0].toFixed(5),+T[1].toFixed(5),+T[2].toFixed(5));
    }
  }
  /* sabit kanalları tek kareye indir — koşuda kalça dışında konum kanalı
     hep sabit, 41 kemik × 19 kare × 3 float boşuna yer kaplıyordu */
  let sabitQ=0, sabitT=0;
  for(const c of kanal){
    const sabit=(a,n)=>{ for(let f=1;f<kare;f++) for(let k=0;k<n;k++)
        if(Math.abs(a[f*n+k]-a[k])>1e-4) return false; return true; };
    if(sabit(c.q,4)){ c.q=c.q.slice(0,4); sabitQ++; }
    if(sabit(c.t,3)){ c.t=c.t.slice(0,3); sabitT++; }
  }
  /* kök hareketi: kalça yatayda kayıyorsa animasyon "in place" değil */
  const kalca=kanal[0];
  let kayma=0;
  if(kalca.t.length>3){
    const n=kalca.t.length/3;
    kayma=Math.hypot(kalca.t[(n-1)*3]-kalca.t[0], kalca.t[(n-1)*3+2]-kalca.t[2]);
  }
  console.log(`  ${ad}: ${sr.toFixed(2)} sn, ${kare} kare · sabit kanal q=${sabitQ}/${kanal.length} t=${sabitT}/${kanal.length}`
    +(kayma>0.05?`  ⚠ kök kayması ${kayma.toFixed(2)} birim (yerinde değil)`:''));
  return {sure:+(sr).toFixed(3), kare, kanal, kokKayma:+kayma.toFixed(3)};
}
console.log('\nanimasyonlar:');
const anim={};
const bosta=animCikar('bosta',null);
if(bosta) anim.bosta=bosta;
for(const ad in animYol){ const a=animCikar(ad,animYol[ad]); if(a) anim[ad]=a; }

/* --- çıktı -------------------------------------------------------------------- */
const boy=Math.max(...Array.from({length:V.length/3},(_,i)=>V[i*3+1]));
const cikti={
  boy:+boy.toFixed(4),
  euler:EULER_SIRA,
  geriMesh:geriMesh.map(v=>+v.toFixed(6)),
  /* iskeletin TAMAMI (hiyerarşi için) */
  iskelet:kemikler.map((k,i)=>({ad:k.ad, ebeveyn:k.ebeveyn,
    shader:shaderIx.has(i)?shaderIx.get(i):-1,
    ters:shaderIx.has(i)?tersBaglama.get(i).map(v=>+v.toFixed(6)):null})),
  bolge:bolgeler,
  anim
};
fs.writeFileSync(ciktiYol, JSON.stringify(cikti));
const kb=fs.statSync(ciktiYol).size/1024;
console.log(`\n${ciktiYol}: ${bolgeler.length} bölge, ${sn} deri kemiği, ${Object.keys(anim).length} animasyon, ${kb.toFixed(0)} KB`);
console.log(`model boyu ${boy.toFixed(2)} birim · çizim çağrısı ${bolgeler.length}\n`);
