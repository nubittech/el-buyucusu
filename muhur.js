/* =============================================================
   MÜHÜR — paylaşılan tanıma katmanı, element tablosu ve dizi motoru
   muhur.html (test alanı) ve index.html (oyun) aynı kodu kullanır;
   kalibrasyon da aynı localStorage anahtarından okunur.

   NOT: bu dosyayı kullanan sayfalarda id'leri önekleyin. Tarayıcı id'li her
   elemanı window üstünde global yapar; MediaPipe'ın Emscripten glue kodu
   `typeof dbg == 'undefined'` / `err` gibi adlara bakıp kendi fonksiyonlarını
   tanımlar — id="dbg" ya da id="err" varsa model "dbg is not a function" ile çöker.
   ============================================================= */
(function (global) {
'use strict';

/* --- pozlar: sıra ÖNEMLİ, özellik vektörüyle eşleşiyor --- */
const POSES=[
  {id:'fire', el:'🔥', ad:'Ateş',     jest:'baş parmak + işaret'},
  {id:'air',  el:'🌪', ad:'Hava',     jest:'açık avuç'},
  {id:'water',el:'💧', ad:'Su',       jest:'işaret + orta + yüzük'},
  {id:'bolt', el:'⚡', ad:'Yıldırım', jest:'baş parmak + serçe'},
  {id:'earth',el:'🪨', ad:'Toprak',   jest:'işaret + serçe'},
  {id:'gun',  el:'👉', ad:'Silah',    jest:'işaret + orta (baş parmak serbest)'},
];
const BY={};for(const p of POSES)BY[p.id]=p;

/* Sentetik iskeletten üretilen prototip özellik vektörleri (tools/retune.js).
   air / bolt / gun'da baş parmak hiçbir yere değmiyor, açıklığı kişiden kişiye
   değişiyor; bu üçünün prototipi tek uç duruş değil %35–%100 aralığının
   ORTALAMASI — tek uçta üretilince doğal tutuşlar reddediliyordu. */
const PROTO0={
 fire:[1.0556,1.3382,1.3196,1.2601,0,0.7885,1.1016,1.3999,1.2276],
 air:[1.3181,1.3382,1.3196,1.2601,1.0732,1.4592,1.7112,1.8818,1.4602],
 water:[1.3181,1.3382,1.3196,0.7397,1.1498,1.2939,1.3512,0.7924,0.8737],
 bolt:[0.6714,0.6456,0.6692,1.2601,0.5522,0.8421,1.125,1.8818,1.4602],
 earth:[1.3181,0.6456,0.6692,1.2601,1.1498,0.2489,0.5311,1.3819,0.8737],
 gun:[1.3181,1.3382,0.6692,0.7397,0.8995,1.2549,1.0027,1.262,1.3132]};

/* açıklık sinyali en güvenilir → ağırlıklı. 5. terim baş–işaret teması:
   Ateş↔Hava tek zayıf çift olduğu için ağırlığı yüksek tutuldu. */
const W=[1.6,1.6,1.6,1.6,1.5,1,1,1,1.3];
/* SİLAH için ayrı ağırlık. Silahın açıklık deseni (işaret+orta) altı poz içinde
   benzersiz; baş parmağın yeri ise kişiden kişiye ve atıştan atışa değişiyor,
   yani silah için ayırt edici değil, gürültü. Ölçümde eşit ağırlıkla silah
   yönelim+baş parmak taramasında yalnız %54.8 tanınıyordu; baş parmak terimleri
   kısılınca %100'e çıktı. */
const W_GUN=[1.9,1.9,1.9,1.9,0.3,0.3,0.3,0.3,0.3];
const AGIRLIK=id=>id==='gun'?W_GUN:W;
/* Eşikler gerçekçi varyasyon altında ayarlandı; taramada mesafe eşiği neredeyse
   etkisiz çıktı, ayrımı oran yapıyor. */
const RED_MESAFE=1.8, RED_ORAN=1.30;
const KILIT_MS=150;   /* poz bu kadar sabit tutulmadan onaylanmaz */
const DIZI_MS=900;    /* mühürler arası zaman aşımı */
const CEZA_MS=400;    /* eşleşmeyen dizi cezası */
const KAL_ANAHTAR='muhurProto';

let PROTO=JSON.parse(JSON.stringify(PROTO0));
function kalibrasyonYukle(){
  try{const s=localStorage.getItem(KAL_ANAHTAR);if(s)Object.assign(PROTO,JSON.parse(s));}catch(e){}
  return PROTO;
}
function kalibrasyonKaydet(id,lm){
  PROTO[id]=feat(lm);
  try{localStorage.setItem(KAL_ANAHTAR,JSON.stringify(PROTO));}catch(e){}
}
function kalibrasyonSifirla(){
  PROTO=JSON.parse(JSON.stringify(PROTO0));
  try{localStorage.removeItem(KAL_ANAHTAR);}catch(e){}
}
const kalibreMi=id=>JSON.stringify(PROTO[id])!==JSON.stringify(PROTO0[id]);
kalibrasyonYukle();

/* --- özellik vektörü --- */
const d2v=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function feat(lm){
  const pw=d2v(lm[5],lm[17])||1e-6;
  const ext=(t,p)=>d2v(lm[t],lm[0])/(d2v(lm[p],lm[0])||1e-6);
  return [ext(8,6),ext(12,10),ext(16,14),ext(20,18),
    d2v(lm[4],lm[8])/pw,d2v(lm[4],lm[12])/pw,d2v(lm[4],lm[16])/pw,d2v(lm[4],lm[20])/pw,
    d2v(lm[4],lm[17])/pw];
}
const uzaklik=(a,b,w)=>{const q=w||W;let s=0;for(let k=0;k<9;k++){const d=(a[k]-b[k])*q[k];s+=d*d;}return Math.sqrt(s);};

/* en yakın prototip + belirsizlik reddi:
   yanlış mühür atmaktansa hiç atmamak yeğdir */
function siniflandir(f){
  const ds=POSES.map(p=>({id:p.id,d:uzaklik(f,PROTO[p.id],AGIRLIK(p.id))})).sort((a,b)=>a.d-b.d);
  const red = ds[0].d>RED_MESAFE ? 'uzak'
            : (ds[1].d/(ds[0].d||1e-6))<RED_ORAN ? 'belirsiz' : null;
  return {ds,id:red?null:ds[0].id,red};
}

/* =============================================================
   ELEMENTLER
   ============================================================= */
const YENER={fire:'air',air:'bolt',bolt:'earth',earth:'water',water:'fire'};
const YENILIR={air:'fire',bolt:'air',earth:'bolt',water:'earth',fire:'water'};
/* Kademe 1 davranışları: fark yalnız döngüde değil, mermide de olsun */
const ELEM={
  fire :{ad:'Ateş',    renk:0xff6a2a, hiz:15, hasar:17, delme:1.00, takip:0.00},
  air  :{ad:'Hava',    renk:0x8fffd4, hiz:23, hasar:10, delme:0.70, takip:0.00},
  water:{ad:'Su',      renk:0x37a6ff, hiz:16, hasar:15, delme:0.80, takip:0.40},
  bolt :{ad:'Yıldırım',renk:0xc9a6ff, hiz:30, hasar:11, delme:1.55, takip:0.00},
  earth:{ad:'Toprak',  renk:0xc59a4a, hiz:10, hasar:26, delme:1.85, takip:0.00},
};

/* --- beceri tablosu: liste değil, döngüden türetiliyor --- */
const TEMEL={fire:'Alev Oku',air:'Rüzgar Bıçağı',water:'Su Kırbacı',bolt:'Şimşek Ucu',earth:'Taş Mermisi'};
/* NOT: Ardışık aynı mühür bastırıldığı için (bkz. dizi motoru) bu kademeye şu an
   ULAŞILAMIYOR. Beceriler duruyor; ileride boştaki 10 nötr çifte taşınabilir. */
const GUCLU={fire:'Ejder Nefesi',air:'Kasırga',water:'Sel Dalgası',bolt:'Gök Mızrağı',earth:'Taş Duvar'};
const BESLI={fire:'Alev Fırtınası',air:'Fırtına Sarmalı',bolt:'Şarapnel Yıldırımı',earth:'Taş Seli',water:'Kaynar Dalga'};
const FUZYON={fire:'Buhar Perdesi',air:'Kor Girdabı',bolt:'İyon Alanı',earth:'Sarsıntı',water:'Bataklık'};
const ZINCIR={fire:'Yanan Gökyüzü',air:'Fırtına Kıyameti',bolt:'Yeraltı Sarsıntısı',earth:'Volkan',water:'Buhar Kasırgası'};
const YUKLEME=[0,350,700,1200];
const KAT={Temel:1.0,'Güçlendirilmiş':1.6,'Beslenmiş':1.6,'Füzyon':1.5,'Zincirleme üstünlük':2.6};

function beceriBul(dz){
  const n=dz.length;
  if(n===1) return {ad:TEMEL[dz[0]],tur:'Temel',ms:YUKLEME[1],el:dz[0],kat:KAT.Temel};
  if(n===2){
    const [a,b]=dz;
    if(a===b)          return {ad:GUCLU[a], tur:'Güçlendirilmiş',ms:YUKLEME[2],el:a,kat:KAT['Güçlendirilmiş']};
    if(YENER[a]===b)   return {ad:BESLI[a], tur:'Beslenmiş',     ms:YUKLEME[2],el:a,kat:KAT['Beslenmiş']};
    if(YENILIR[a]===b) return {ad:FUZYON[a],tur:'Füzyon',        ms:YUKLEME[2],el:a,kat:KAT['Füzyon']};
    return null;                                  /* nötr çiftler rezerve */
  }
  if(n===3){
    const [a,b,c]=dz;
    if(YENER[a]===b&&YENER[b]===c)
      return {ad:ZINCIR[a],tur:'Zincirleme üstünlük',ms:YUKLEME[3],el:a,kat:KAT['Zincirleme üstünlük']};
    return null;
  }
  return null;
}

/* =============================================================
   HAVADA ÇARPIŞMA ÇÖZÜMÜ
   Avantajlı / güçlü olan ya nötrler ya da delip geçip hedefe kilitlenir.
   Aynı element çarpıştığında doğrudan güç (ustalık + beceri kademesi) karar verir.
   ============================================================= */
const AVANTAJ=1.6, NOTR_ESIK=0.35;
function carpismaCoz(a,b){
  const ea=a.guc*ELEM[a.el].delme*(YENER[a.el]===b.el?AVANTAJ:1);
  const eb=b.guc*ELEM[b.el].delme*(YENER[b.el]===a.el?AVANTAJ:1);
  const fark=ea-eb;
  if(Math.abs(fark)<NOTR_ESIK) return {sonuc:'notr'};
  const kazanan=fark>0?a:b, kaybeden=fark>0?b:a;
  return {sonuc:'deldi',kazanan,kaybeden,kalanGuc:Math.abs(fark)/(ELEM[kazanan.el].delme||1)};
}

/* =============================================================
   DİZİ MOTORU
   Her kare guncelle() çağır; olan biteni olay listesi olarak döndürür.
   ============================================================= */
function yeniDizi(){
  return {aday:null,kilitMs:0,onayli:null,dizi:[],sonMuhur:0,
    beceri:null,yukMs:0,yukTotal:0,cezaUntil:0,son:null};
}
function diziSifirla(D){ D.dizi=[];D.sonMuhur=0; }

function guncelle(D,id,dt,now){
  const olaylar=[];
  if(now<D.cezaUntil){ D.aday=null;D.kilitMs=0;return olaylar; }

  /* zaman kilidi — asimetrik: tutarken tek kare kaybı düşürmez */
  if(id&&id===D.aday) D.kilitMs=Math.min(KILIT_MS+120,D.kilitMs+dt);
  else if(id){ D.aday=id;D.kilitMs=dt; }
  else D.kilitMs=Math.max(0,D.kilitMs-dt*1.6);
  if(!D.kilitMs) D.aday=null;

  const onayli=(D.aday&&D.kilitMs>=KILIT_MS)?D.aday:null;
  /* Beceri yüklenirken dizi KİLİTLİ: el doğal olarak silah pozundan çıkarken
     araya giren bir mühür yüklemeyi iptal ediyordu. Yükleme bir kez başladıysa
     bitecek — açıkta geçen o süre zaten riskin kendisi. */
  const yukleniyor = D.beceri && D.yukMs < D.yukTotal;
  if(onayli&&onayli!==D.onayli&&!yukleniyor){    /* yalnız YENİ onayda tetikle */
    if(onayli==='gun'){
      if(D.dizi.length){
        const b=beceriBul(D.dizi);
        if(b){ D.beceri=b;D.yukTotal=b.ms;D.yukMs=0;D.son=null;diziSifirla(D);
               olaylar.push({tip:'yuklemeBasladi',beceri:b}); }
        else { diziSifirla(D);D.beceri=null;D.yukMs=0;D.cezaUntil=now+CEZA_MS;
               D.son='bu dizi bir beceriye karşılık gelmiyor';
               olaylar.push({tip:'basarisiz',sebep:D.son}); }
      }
    } else if(D.dizi.length>=3){
      diziSifirla(D);D.beceri=null;D.yukMs=0;D.cezaUntil=now+CEZA_MS;
      D.son='dizi en fazla 3 mühür';
      olaylar.push({tip:'basarisiz',sebep:D.son});
    } else if(D.dizi.length&&D.dizi[D.dizi.length-1]===onayli){
      /* Aynı mührün ardışık tekrarı YOK. El sabit dururken tanıma bir an
         kesilip yeniden kilitlenince aynı mühür ikinci kez ekleniyordu; dizi
         🔥🔥🔥 olup hiçbir beceriye karşılık gelmiyor, 👉 de "eşleşme yok"
         veriyordu. Tekrar bastırılıyor, süre de tazeleniyor. */
      D.sonMuhur=now;
    } else {
      D.dizi.push(onayli);D.sonMuhur=now;D.beceri=null;D.yukMs=0;D.son=null;
      olaylar.push({tip:'muhur',id:onayli});
    }
  }
  D.onayli=onayli;

  /* Zaman aşımı mühürler ARASI tereddüt içindir, pozu tutma süresi için değil:
     bir mührü uzun tutmak diziyi düşürmemeli. Onaylı poz varken sayaç tazelenir. */
  if(onayli) D.sonMuhur=now;
  else if(D.dizi.length&&now-D.sonMuhur>DIZI_MS){
    diziSifirla(D);D.son='dizi zaman aşımına uğradı';
    olaylar.push({tip:'zamanAsimi'});
  }
  if(D.beceri&&D.yukMs<D.yukTotal){
    D.yukMs=Math.min(D.yukTotal,D.yukMs+dt);
    if(D.yukMs>=D.yukTotal) olaylar.push({tip:'yuklendi',beceri:D.beceri});
  }
  return olaylar;
}

global.MUHUR={
  POSES,BY,PROTO0,W,RED_MESAFE,RED_ORAN,KILIT_MS,DIZI_MS,CEZA_MS,
  get PROTO(){return PROTO;},
  feat,uzaklik,siniflandir,
  kalibrasyonYukle,kalibrasyonKaydet,kalibrasyonSifirla,kalibreMi,
  YENER,YENILIR,ELEM,beceriBul,AVANTAJ,NOTR_ESIK,carpismaCoz,
  yeniDizi,guncelle,diziSifirla,
};
})(typeof window!=='undefined'?window:globalThis);
