/* BİNA OBJ → dokulu mesh (UV korunarak sadeleştirilmiş)

   Kullanım:
     sh   tools/binaatlas.sh ~/Desktop/newmap      # atlasları hazırla
     node tools/binadoku.js  ~/Desktop/newmap --hedef 1400

   NEDEN RENK BÖLGESİ DEĞİL DOKU
   Önceki sürüm binayı renk bölgelerine ayırıp her bölgeye tek düz renk
   veriyordu, çünkü motorda UV yoktu. Bu yol ölçümle tükendi:
     · Atlas malzemeyi değil YÜZEY DETAYINI kodluyor (sıvanın üstünde boyalı
       taş yamaları var), bu yüzden sıva/ahşap ayrımı asla temiz çıkmadı;
       yumuşatma 4048 sınır kenarında doyup kaldı.
     · Detayın kendisi zaten dokudaydı: 2048² atlas = 4,2 Mpx boyalı bilgi.
       Onu atıp 2-3 düz renkle değiştirince pencere, kafes, arma, ahşap deseni
       toptan yok oluyordu.
     · Geometriden telafi etmeye çalışmak pahalı: 6.000 üçgende bina doğru
       görünüyor ama 77 kopya 460.000 üçgen demek.
   Doku ile pencere BOYALI olduğu için üçgen sayısından bağımsız olarak dümdüz
   kalıyor, yani hem doğru görünüyor hem ucuz.

   UV NASIL TAŞINIYOR — ÖNEMLİ
   İlk deneme köşeleri (konum, UV) çiftine göre kaynatıyordu. Sonuç felaketti:
   her UV dikişi mesh'i ikiye bölüyor, mesh manifold olmaktan çıkıyor ve
   sadeleştirici her UV adasını bağımsız çökertip adaları birbirinden
   ayırıyor — bina paramparça oluyordu.

   Doğrusu: geometri KONUMA göre kaynatılıyor (mesh manifold kalıyor, hiçbir
   şey yırtılmıyor), UV ise köşeye değil ÜÇGEN KÖŞESİNE bağlı kalıyor. Üçgen
   hayatta kaldığı sürece kendi üç UV'sini taşıyor; köşeleri yer değiştirse
   bile doku yalnız hafifçe geriliyor, kopmuyor. Ortalama sapma modelin
   boyunun %3'ü olduğu için gerilme gözle görülmüyor.

   Sadeleştiriciye etiket olarak ÜÇGEN İNDEKSİ veriliyor ama kısıt kapalı
   (kisitla=false): etiket burada bir sınır değil, "bu çıktı üçgeni hangi
   girdi üçgeninden geldi" bilgisi. */
const fs=require('fs'), path=require('path');
const {objOku}=require('./png.js');
const {sadelestirQEM}=require('./sadelestir.js');

const argv=process.argv.slice(2);
const kok=argv[0]||path.join(process.env.HOME,'Desktop','newmap');
let cikti='assets/binalar.json', HEDEF=1400;
for(let i=1;i<argv.length;i++){
  if(argv[i]==='--cikti') cikti=argv[++i];
  else if(argv[i]==='--hedef') HEDEF=+argv[++i];
}

const klasorler=fs.readdirSync(kok).filter(d=>{
  const p=path.join(kok,d);
  return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p,'base.obj'));
}).sort();
if(!klasorler.length){ console.error('bina klasörü yok: '+kok); process.exit(1); }

const binalar=[];
for(const ad of klasorler){
  const o=objOku(path.join(kok,ad,'base.obj'));
  const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
  for(const p of o.v) for(let k=0;k<3;k++){ if(p[k]<mn[k])mn[k]=p[k]; if(p[k]>mx[k])mx[k]=p[k]; }
  const boy=mx[1]-mn[1], en=mx[0]-mn[0], derin=mx[2]-mn[2];

  /* Geometri KONUMA göre; UV üçgen köşesinde kalıyor */
  const ucV=o.f.map(t=>[t[0][0],t[1][0],t[2][0]]);
  const ucIx=o.f.map((_,i)=>i);
  const s=sadelestirQEM(o.v, ucV, HEDEF, ucIx, undefined, false, false);

  /* Çıktı: her üçgen kendi üç UV'siyle yazılıyor, yani köşeler ÜÇGEN BAŞINA
     çoğaltılıyor. Paylaşılan köşe olmadığı için gölgeleme de düz oluyor —
     doku detayı zaten yüzeyi taşıdığından bu üslupla uyumlu. */
  const p=[],n=[],u=[],i=[];
  s.ucgen.forEach((t,k)=>{
    const kaynakUc=o.f[s.etiket[k]];
    const A=s.poz[t[0]],B=s.poz[t[1]],C=s.poz[t[2]];
    const ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2];
    const vx=C[0]-A[0],vy=C[1]-A[1],vz=C[2]-A[2];
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    const l=Math.hypot(nx,ny,nz)||1; nx/=l;ny/=l;nz/=l;
    const t0=p.length/3;
    [A,B,C].forEach((P,c)=>{
      p.push(+P[0].toFixed(4),+P[1].toFixed(4),+P[2].toFixed(4));
      n.push(+nx.toFixed(3),+ny.toFixed(3),+nz.toFixed(3));
      const ti=kaynakUc[c][1];
      const T=ti>=0?o.vt[ti]:[0,0];
      u.push(+T[0].toFixed(4),+T[1].toFixed(4));
    });
    i.push(t0,t0+1,t0+2);
  });
  if(p.length/3>65535) throw new Error(ad+': 65535 köşe sınırı aşıldı');

  console.log(`${ad}: ${o.f.length} → ${s.ucgen.length} üçgen (%${(s.ucgen.length/o.f.length*100).toFixed(1)}), `
    +`${s.poz.length} köşe, kırık kenar ${s.kirikSayi}`);

  binalar.push({ad, boy:+boy.toFixed(4), en:+en.toFixed(4), derin:+derin.toFixed(4),
    merkez:[+((mn[0]+mx[0])/2).toFixed(4), +mn[1].toFixed(4), +((mn[2]+mx[2])/2).toFixed(4)],
    doku:`assets/${ad}.webp`, p, n, uv:u, i});
}

fs.writeFileSync(cikti, JSON.stringify({bina:binalar}));
const kb=fs.statSync(cikti).size/1024;
const top=binalar.reduce((s,b)=>s+b.i.length/3,0);
console.log(`\n${cikti}: ${binalar.length} bina, ${top} üçgen, ${kb.toFixed(0)} KB`);
console.log(`atlaslar: ${binalar.map(b=>b.doku).join(', ')}\n`);
