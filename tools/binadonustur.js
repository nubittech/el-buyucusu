/* BİNA OBJ + DOKU → oyunun mesh biçimi (sadeleştirilmiş)

   Kullanım:
     node tools/binadonustur.js ~/Desktop/newmap --cikti assets/binalar.json

   İKİ SORUN VAR, İKİSİ DE BURADA ÇÖZÜLÜYOR:

   1) ÜÇGEN SAYISI. Üreticiden gelen binaların her biri 20.000 üçgen. Bir sokak
      haritasında 30 kopya = 600.000 üçgen; telefonda olacak iş değil. Köşe
      kümeleme (vertex clustering) ile ızgaraya oturtulup birleştiriliyor.
      Bina 1.9 birimlik kutuda geliyor ve oyunda ~6 birime büyütülüyor; ekranda
      150-300 piksel kaplıyor, o boyutta 20.000 üçgenin hiçbir karşılığı yok.

   2) UV YOK. Motorun tek doku kanalı prosedürel fırça; renk çizim başına tek
      uniform. Bina RENK BÖLGELERİNE ayrılıyor — bu binalarda doğal olarak zaten
      var: sıva, ahşap, kiremit, taş, fener. Fener bölgesi emissive işaretleniyor
      ve bloom onu kendiliğinden alıyor.

   DÜZ GÖLGELEME kasıtlı: kümeleme sonrası normaller ortalanırsa çatı kenarları
   yuvarlanıp erimiş görünüyor. Üçgen başına yüz normali hem keskin kalıyor hem
   de oyunun guaj/bantlı üslubuna oturuyor. */
const fs=require('fs'), path=require('path');
const {pngOku,kOrtalama,enYakin,hex,objOku}=require('./png.js');
const {sadelestirQEM}=require('./sadelestir.js');

/* Sadeleştirmenin ne kadar bozduğunu ölç: her özgün köşenin SONUÇ köşelerine
   en yakın uzaklığı. Yaklaşık bir Hausdorff — yüzeye değil köşeye bakıyor, ama
   "hedef üçgen sayısı kabul edilebilir mi"yi göz kararına bırakmamaya yetiyor.
   Izgara kovalarıyla arama: 10.000 × 3.000 kaba kuvvet gereksiz yere pahalı. */
function sapmaOlc(ucgenler,koseler,ciktiPoz){
  if(!ciktiPoz.length) return {enKotu:0, ortalama:0};
  let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
  for(const p of ciktiPoz) for(let k=0;k<3;k++){ if(p[k]<mn[k])mn[k]=p[k]; if(p[k]>mx[k])mx[k]=p[k]; }
  const H=Math.max(1e-4,(mx[0]-mn[0]+mx[1]-mn[1]+mx[2]-mn[2])/3/12);
  const kova=new Map(), an=(p)=>Math.floor(p[0]/H)+','+Math.floor(p[1]/H)+','+Math.floor(p[2]/H);
  ciktiPoz.forEach((p,i)=>{ const k=an(p); if(!kova.has(k)) kova.set(k,[]); kova.get(k).push(p); });
  const gorulen=new Set(); let enKotu=0, toplam=0, n=0;
  for(const t of ucgenler) for(const vi of t){
    if(gorulen.has(vi)) continue; gorulen.add(vi);
    const p=koseler[vi];
    const gx=Math.floor(p[0]/H),gy=Math.floor(p[1]/H),gz=Math.floor(p[2]/H);
    let en=Infinity;
    for(let r=1;r<=8&&!Number.isFinite(en);r++)
      for(let a=-r;a<=r;a++) for(let b=-r;b<=r;b++) for(let c=-r;c<=r;c++){
        if(r>1&&Math.max(Math.abs(a),Math.abs(b),Math.abs(c))!==r) continue;
        const l=kova.get((gx+a)+','+(gy+b)+','+(gz+c)); if(!l) continue;
        for(const q of l) en=Math.min(en, Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]));
      }
    if(!Number.isFinite(en)) continue;
    enKotu=Math.max(enKotu,en); toplam+=en; n++;
  }
  return {enKotu, ortalama:n?toplam/n:0};
}

/* --- ana akış --- */
const argv=process.argv.slice(2);
const kok=argv[0]||path.join(process.env.HOME,'Desktop','newmap');
let cikti='assets/binalar.json', K=6, HEDEF=900;
for(let i=1;i<argv.length;i++){
  if(argv[i]==='--cikti') cikti=argv[++i];
  else if(argv[i]==='--bolge') K=+argv[++i];
  else if(argv[i]==='--hedef') HEDEF=+argv[++i];
}

/* MALZEME PALETİ — dokudan DEĞİL elden.
   Atlas gece pişirmesi: parlaklık medyanı 255 üzerinden 14. O renkleri miras
   alsak motor kendi gece ışığını üstüne uygulayıp ikinci kez karartıyor ve
   bina siyah bir kütleye dönüyor. Doku "hangi malzeme"yi söylüyor, "hangi
   renk"i biz söylüyoruz — karakterde de aynı gerekçeyle böyle yapılmıştı.
   Değerler referans render'larından: krem sıva, koyu ahşap, arduvaz kiremit. */
const PALET={
  siva:   '#d6cfbd',
  ahsap:  '#4a382a',
  kiremit:'#46577a',
  tas:    '#8d8a82',
  fener:  '#ffcf7a',
};

const klasorler=fs.readdirSync(kok).filter(d=>{
  const p=path.join(kok,d);
  return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p,'base.obj'));
}).sort();
if(!klasorler.length){ console.error('bina klasörü yok: '+kok); process.exit(1); }

const binalar=[];
for(const ad of klasorler){
  const dizin=path.join(kok,ad);
  const o=objOku(path.join(dizin,'base.obj'));
  const doku=pngOku(path.join(dizin,'shaded.png'));
  const isikYol=path.join(dizin,'texture_emissive.png');
  const isik=fs.existsSync(isikYol)?pngOku(isikYol):null;

  const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
  for(const p of o.v) for(let k=0;k<3;k++){ if(p[k]<mn[k])mn[k]=p[k]; if(p[k]>mx[k])mx[k]=p[k]; }
  const boy=mx[1]-mn[1], en=mx[0]-mn[0], derin=mx[2]-mn[2];
  console.log(`\n=== ${ad} ===`);
  console.log(`  girdi   ${o.v.length} köşe, ${o.f.length} üçgen · ${en.toFixed(2)}×${boy.toFixed(2)}×${derin.toFixed(2)}`);

  /* ÜÇGEN RENGİ — TEK NOKTA YETMİYOR.
     Atlas UV adalarından oluşuyor ve adaların arası SİYAH dolgu. 20.000 üçgenin
     çoğu 2048'lik atlasta birkaç teksel kaplıyor; merkez örneği sık sık dolguya
     düşüyor ve üçgen "siyah" görünüyordu (ölçüm: üçgenlerin %30'u parlaklık<2).
     Çözüm: üçgenin içine doğru büzülmüş yedi noktadan örnekleyip siyahları
     eleyip medyanı almak. Hiçbiri tutmazsa üçgen BİLİNMEYEN kalıyor ve aşağıda
     3B'de en yakın bilinen komşusundan etiket alıyor. */
  const ORNEK_BARI=[[1/3,1/3,1/3],[0.6,0.2,0.2],[0.2,0.6,0.2],[0.2,0.2,0.6],
                    [0.45,0.45,0.1],[0.45,0.1,0.45],[0.1,0.45,0.45]];
  const ucRenk=[], bilinen=[];
  for(const t of o.f){
    const uv=t.map(([,ti])=>ti>=0?o.vt[ti]:null);
    const ornekler=[];
    if(uv[0]&&uv[1]&&uv[2]) for(const b of ORNEK_BARI){
      const u=uv[0][0]*b[0]+uv[1][0]*b[1]+uv[2][0]*b[2];
      const v=uv[0][1]*b[0]+uv[1][1]*b[1]+uv[2][1]*b[2];
      const c=doku.uv(u,v);
      if(c[0]+c[1]+c[2] > 9) ornekler.push(c);      /* dolgu değil */
    }
    if(!ornekler.length){ ucRenk.push(null); continue; }
    ornekler.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
    ucRenk.push(ornekler[ornekler.length>>1]);
    bilinen.push(ucRenk.length-1);
  }
  const bilinmeyen=ucRenk.filter(c=>!c).length;
  console.log(`  örnek   ${bilinen.length} üçgen dokudan okundu, ${bilinmeyen} bilinmeyen (komşudan alınacak)`);
  /* Fener: emissive maskesinden. Parlaklığa bakıp tahmin etmek beyaz sıvayı da
     yakalıyordu — maske varken ondan okumak kesin sonuç veriyor. */
  const parlak=o.f.map(t=>{
    if(!isik) return false;
    const uv=t.map(([,ti])=>ti>=0?o.vt[ti]:null);
    if(!uv[0]||!uv[1]||!uv[2]) return false;
    for(const b of ORNEK_BARI){
      const c=isik.uv(uv[0][0]*b[0]+uv[1][0]*b[1]+uv[2][0]*b[2],
                      uv[0][1]*b[0]+uv[1][1]*b[1]+uv[2][1]*b[2]);
      if((c[0]+c[1]+c[2])/3 > 40) return true;
    }
    return false;
  });
  const isikSayi=parlak.filter(Boolean).length;

  /* MALZEME SINIFLANDIRMASI — k-ortalama DEĞİL, doğrudan kural.
     Kümeleme denendi ve başarısız oldu: atlas gece pişirmesi, parlaklık medyanı
     255 üzerinden 14, ve NÖTR AÇIK sıva ile NÖTR KOYU taş kroma uzayında aynı
     noktaya düşüyor — sıva bölgesi hiç ayrışmıyordu. Oysa malzemeler kuralla
     zaten okunabiliyor:
       kiremit  mavi baskın        (b payı r payını geçiyor)
       ahşap    sıcak ve koyu
       sıva     nötr ve aydınlık
       taş      nötr ve orta
     Parlaklık MUTLAK değil BİNA İÇİNDE SIRALI karşılaştırılıyor; üç binanın
     pozlaması farklı ve sabit eşik birinde tutup ötekinde tutmuyordu. */
  const merkezi=(i)=>{ const t=o.f[i]; let c=[0,0,0];
    for(const [vi] of t) for(let k=0;k<3;k++) c[k]+=o.v[vi][k]/3; return c; };
  const lum=(c)=>(c[0]+c[1]+c[2])/3;
  const sirali=ucRenk.filter((c,i)=>c&&!parlak[i]).map(lum).sort((a,b)=>a-b);
  const yuzde=(l)=>{                            /* l'nin bina içindeki yüzdelik sırası */
    let lo=0,hi=sirali.length;
    while(lo<hi){ const m=(lo+hi)>>1; if(sirali[m]<l) lo=m+1; else hi=m; }
    return lo/(sirali.length||1);
  };
  /* HİSTOGRAM GERME. Malzemeyi ADIYLA ayırmayı bıraktım: sıva ile ahşap
     gölgede renk olarak ayırt edilemiyor (denendi, sıva payı %10 çıkıyordu,
     render'larda duvarlar baskın). Ama atlasın GÖRELİ sıralaması doğru — sıva
     ahşaptan gerçekten parlak, yalnız 255'in 14'üne sıkışmış. Sıralama
     yüzdeliğe çevrilip albedo aralığına geriliyor: en koyu %20 griye, en açık
     beyaza yakın. Böylece duvardaki kiriş deseni geri geliyor.
     Renk tonu örnekten korunuyor, doygunluk bir miktar açılıyor — gece
     pişirmesi maviyi de kısmış. */
  /* DOYGUN 1.45 denendi: kiremit arduvaz yerine gök mavisi (#8bd7fc), ahşap
     turuncu çıktı. Gece pişirmesi doygunluğu bir miktar kısıyor ama 1.45 fazla
     telafi ediyor. TAVAN da 0.97'den düşürüldü — motor üstüne kendi ışığını ve
     bloom'u ekliyor, beyaza yakın duvar patlıyordu. */
  const GAMA=0.85, TABAN=0.20, TAVAN=0.88, DOYGUN=1.12;
  function ac(c){
    const sr=yuzde(lum(c));
    const hedef=(TABAN+(TAVAN-TABAN)*Math.pow(sr,GAMA))*255;
    const l=lum(c)||1;
    const o3=[0,1,2].map(k=>{
      const oran=c[k]/l;                        /* ton korunuyor */
      return hedef*(1+(oran-1)*DOYGUN);
    });
    return o3.map(v=>Math.max(0,Math.min(255,v)));
  }
  const acikIx=[];
  for(let i=0;i<o.f.length;i++) if(ucRenk[i]&&!parlak[i]) acikIx.push(i);
  const acikRenk=new Map(acikIx.map(i=>[i,ac(ucRenk[i])]));
  const merkez=kOrtalama(acikIx.map(i=>acikRenk.get(i)),K);
  const K_FENER=K;
  const etiket=new Array(o.f.length).fill(-1);
  for(let i=0;i<o.f.length;i++){
    if(parlak[i]) etiket[i]=K_FENER;
    else if(ucRenk[i]) etiket[i]=enYakin(acikRenk.get(i),merkez);
  }
  /* Bilinmeyenler: 3B'de en yakın etiketli üçgenden devral. Izgara kovalarıyla
     arama — 6000 bilinmeyen × 14000 bilinen kaba kuvvette 84M karşılaştırma. */
  {
    const H=0.12, kova=new Map(), anah=(c)=>Math.floor(c[0]/H)+','+Math.floor(c[1]/H)+','+Math.floor(c[2]/H);
    const mrk=o.f.map((_,i)=>merkezi(i));
    for(let i=0;i<o.f.length;i++) if(etiket[i]>=0){
      const k=anah(mrk[i]); if(!kova.has(k)) kova.set(k,[]); kova.get(k).push(i);
    }
    let cozulen=0;
    for(let i=0;i<o.f.length;i++){
      if(etiket[i]>=0) continue;
      const c=mrk[i], gx=Math.floor(c[0]/H), gy=Math.floor(c[1]/H), gz=Math.floor(c[2]/H);
      let enIyi=-1, enD=1e9;
      for(let r=1;r<=6&&enIyi<0;r++){
        for(let a=-r;a<=r;a++) for(let b=-r;b<=r;b++) for(let d=-r;d<=r;d++){
          if(Math.max(Math.abs(a),Math.abs(b),Math.abs(d))!==r&&r>1) continue;
          const lst=kova.get((gx+a)+','+(gy+b)+','+(gz+d)); if(!lst) continue;
          for(const j of lst){ const m=mrk[j];
            const dd=(c[0]-m[0])**2+(c[1]-m[1])**2+(c[2]-m[2])**2;
            if(dd<enD){ enD=dd; enIyi=j; } }
        }
      }
      etiket[i]= enIyi>=0 ? etiket[enIyi] : 0;
      cozulen++;
    }
    if(cozulen) console.log(`  komşu   ${cozulen} bilinmeyen üçgen etiketlendi`);
  }

  /* Örneklenen rengin p80'i — yalnız RAPOR için. Paletle karşılaştırıp
     seçimin gerçekten malzemeye denk düştüğünü görmek istiyorum. */
  function orneklenen(b){
    const orn=[];
    for(let i=0;i<o.f.length;i++) if(etiket[i]===b&&ucRenk[i]) orn.push(ucRenk[i]);
    if(!orn.length) return [128,128,128];
    orn.sort((a,c)=>(a[0]+a[1]+a[2])-(c[0]+c[1]+c[2]));
    return orn[Math.min(orn.length-1, Math.floor(orn.length*0.80))];
  }
  const bolgeler=[];
  let ciktiUcgen=0;
  for(let b=0;b<=K_FENER;b++){
    /* objOku üçgenleri köşe başına [v,vt,vn] üçlüsü tutuyor; sadeleştirme
       yalnız konumla ilgilendiği için ham köşe indeksine indiriliyor. */
    const alt=o.f.filter((_,i)=>etiket[i]===b).map(t=>[t[0][0],t[1][0],t[2][0]]);
    if(!alt.length) continue;
    /* Hücre boyu bölgenin kendi hedefine göre: büyük bölge kaba, küçük bölge
       ince kümelenmeli, yoksa fener/tabela gibi ufak parçalar tamamen siliniyor. */
    const pay=alt.length/o.f.length;
    const hedefB=Math.max(24, Math.round(HEDEF*pay));
    const s=sadelestirQEM(o.v, alt, hedefB);
    const sap=sapmaOlc(alt, o.v, s.poz);
    /* düz gölgeleme: üçgen başına kendi yüz normali. Kümeleme sonrası
       normalleri ortalamak çatı kenarlarını yuvarlayıp eritiyordu; yüz normali
       hem keskin kalıyor hem oyunun bantlı guaj üslubuna oturuyor. */
    const p=[],n=[],ix=[];
    for(const t of s.ucgen){
      const A=s.poz[t[0]],B=s.poz[t[1]],C=s.poz[t[2]];
      const ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2];
      const vx=C[0]-A[0],vy=C[1]-A[1],vz=C[2]-A[2];
      let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      const l=Math.hypot(nx,ny,nz)||1; nx/=l;ny/=l;nz/=l;
      const t0=p.length/3;
      for(const V of [A,B,C]){ p.push(V[0],V[1],V[2]); n.push(nx,ny,nz); }
      ix.push(t0,t0+1,t0+2);
    }
    const renk = b===K_FENER ? PALET.fener : hex(merkez[b]);
    bolgeler.push({renk, isik:b===K_FENER?1:0,
      p:p.map(v=>+v.toFixed(4)), n:n.map(v=>+v.toFixed(3)), i:ix});
    ciktiUcgen+=s.ucgen.length;
    console.log(`  ${(b===K_FENER?'FENER':'bölge '+b).padEnd(8)} ${renk}  (ham ${hex(orneklenen(b))})`
      +`  ${String(alt.length).padStart(5)} → ${String(s.ucgen.length).padStart(4)} üçgen  %${(alt.length/o.f.length*100).toFixed(0).padStart(2)}`
      +`  sapma ort ${(sap.ortalama/boy*100).toFixed(2)}% en kötü ${(sap.enKotu/boy*100).toFixed(1)}%`);
  }
  console.log(`  ÇIKTI   ${ciktiUcgen} üçgen (%${(ciktiUcgen/o.f.length*100).toFixed(1)}), ${bolgeler.length} çizim`);

  binalar.push({ad, boy:+boy.toFixed(4), en:+en.toFixed(4), derin:+derin.toFixed(4),
    /* taban merkezi orijine gelsin: yerleştirirken x/z ortalanmış, y=0 zeminde */
    merkez:[+((mn[0]+mx[0])/2).toFixed(4), +mn[1].toFixed(4), +((mn[2]+mx[2])/2).toFixed(4)],
    bolge:bolgeler});
}

fs.writeFileSync(cikti, JSON.stringify({bina:binalar}));
const kb=fs.statSync(cikti).size/1024;
const top=binalar.reduce((s,b)=>s+b.bolge.reduce((t,r)=>t+r.i.length/3,0),0);
console.log(`\n${cikti}: ${binalar.length} bina, toplam ${top} üçgen, ${kb.toFixed(0)} KB\n`);
