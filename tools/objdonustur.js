/* OBJ + DOKU → oyunun mesh biçimi
   Renderer'da UV yok, renk draw çağrısı başına tek uniform. O yüzden model
   RENK BÖLGELERİNE ayrılıyor: her köşe UV'sinden örnekleniyor, renkler
   kümeleniyor, üçgenler kümelere bölünüyor. Sonuç: bölge başına bir mesh,
   bölge başına bir draw. ~5 bölge = 5 çağrı; mevcut primitif ninja 23 çağrı
   yiyordu, yani bu DAHA UCUZ.

   Doku yalnız "hangi bölge" sorusunu cevaplıyor. "Hangi renk" sorusunu biz
   cevaplıyoruz (PALET), çünkü shaded.png'de ışık pişmiş — onu miras almak
   guaj gölgelemesiyle çarpılıp çamura dönerdi. */
const fs=require('fs'), zlib=require('zlib'), path=require('path');

/* --- PNG (palet.js ile aynı çözücü) --- */
function pngOku(yol){
  const b=fs.readFileSync(yol);
  let i=8,en=0,boy=0,derinlik=0,tip=0; const veri=[];
  while(i<b.length){
    const uz=b.readUInt32BE(i), ad=b.toString('ascii',i+4,i+8), gov=b.slice(i+8,i+8+uz);
    if(ad==='IHDR'){en=gov.readUInt32BE(0);boy=gov.readUInt32BE(4);derinlik=gov[8];tip=gov[9];}
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

/* --- OBJ --- */
function objOku(yol){
  const v=[],vt=[],vn=[],f=[];
  for(const s of fs.readFileSync(yol,'utf8').split('\n')){
    if(s.startsWith('v ')){const p=s.split(/\s+/);v.push([+p[1],+p[2],+p[3]]);}
    else if(s.startsWith('vt ')){const p=s.split(/\s+/);vt.push([+p[1],+p[2]]);}
    else if(s.startsWith('vn ')){const p=s.split(/\s+/);vn.push([+p[1],+p[2],+p[3]]);}
    else if(s.startsWith('f ')){
      const p=s.trim().split(/\s+/).slice(1).map(t=>{
        const a=t.split('/'); return [(+a[0])-1, a[1]?(+a[1])-1:-1, a[2]?(+a[2])-1:-1];
      });
      for(let i=1;i+1<p.length;i++) f.push([p[0],p[i],p[i+1]]);   /* fan ile üçgenle */
    }
  }
  return {v,vt,vn,f};
}

function kOrtalama(orn,k,tur=18){
  let m=[];
  for(let i=0;i<k;i++) m.push(orn[Math.floor(i*(orn.length-1)/(k-1||1))].slice(0,3));
  for(let t=0;t<tur;t++){
    const top=Array.from({length:k},()=>[0,0,0,0]);
    for(const o of orn){
      let en=0,ed=1e18;
      for(let i=0;i<k;i++){const d=(o[0]-m[i][0])**2+(o[1]-m[i][1])**2+(o[2]-m[i][2])**2;
        if(d<ed){ed=d;en=i;}}
      top[en][0]+=o[0];top[en][1]+=o[1];top[en][2]+=o[2];top[en][3]++;
    }
    for(let i=0;i<k;i++) if(top[i][3]) m[i]=[top[i][0]/top[i][3],top[i][1]/top[i][3],top[i][2]/top[i][3]];
  }
  return m;
}

const objYol=process.argv[2]||'assets/base.obj';
const pngYol=process.argv[3]||'assets/shaded.png';
const K=+(process.argv[4]||5);
const cikti=process.argv[5]||'assets/karakter.json';

const o=objOku(objYol), im=pngOku(pngYol);
console.log(`\n${path.basename(objYol)}: ${o.v.length} köşe, ${o.f.length} üçgen`);
console.log(`${path.basename(pngYol)}: ${im.en}×${im.boy}\n`);

const dokuAl=(u,vv)=>{
  let x=Math.round(u*(im.en-1)), y=Math.round((1-vv)*(im.boy-1));   /* OBJ'de V ters */
  x=Math.max(0,Math.min(im.en-1,x)); y=Math.max(0,Math.min(im.boy-1,y));
  const p=(y*im.en+x)*im.kanal;
  return [im.px[p],im.px[p+1],im.px[p+2]];
};

/* Üçgen başına renk: üç köşenin UV ortalaması. Köşe başına yapıp sonra
   üçgeni bölmek dikişlerde parça parça bölge yaratıyordu. */
const ucRenk=o.f.map(t=>{
  let u=0,vv=0,n=0;
  for(const [,ti] of t) if(ti>=0){ u+=o.vt[ti][0]; vv+=o.vt[ti][1]; n++; }
  return n? dokuAl(u/n,vv/n) : [128,128,128];
});
const merkez=kOrtalama(ucRenk,K);
console.log('Bulunan bölgeler (dokudan, ışık pişmiş halde):');
const sayac=new Array(K).fill(0);
const etiket=ucRenk.map(c=>{
  let en=0,ed=1e18;
  for(let i=0;i<K;i++){const d=(c[0]-merkez[i][0])**2+(c[1]-merkez[i][1])**2+(c[2]-merkez[i][2])**2;
    if(d<ed){ed=d;en=i;}}
  sayac[en]++; return en;
});
merkez.forEach((c,i)=>{
  const hex='#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  console.log(`  ${i}: ${hex}  ${sayac[i]} üçgen  %${(sayac[i]/o.f.length*100).toFixed(1)}`);
});

/* --- bölge başına mesh --- */
const bolgeler=[];
for(let b=0;b<K;b++){
  const poz=[],nor=[],ix=[]; const harita=new Map();
  for(let ti=0;ti<o.f.length;ti++){
    if(etiket[ti]!==b) continue;
    for(const [vi,,ni] of o.f[ti]){
      const anahtar=vi+'/'+ni;
      let k=harita.get(anahtar);
      if(k===undefined){
        k=poz.length/3; harita.set(anahtar,k);
        poz.push(...o.v[vi]);
        nor.push(...(ni>=0?o.vn[ni]:[0,1,0]));
      }
      ix.push(k);
    }
  }
  if(!ix.length) continue;
  bolgeler.push({
    renk:'#'+merkez[b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''),
    p:poz.map(v=>+v.toFixed(4)), n:nor.map(v=>+v.toFixed(3)), i:ix
  });
}
const boy=Math.max(...o.v.map(p=>p[1]));
fs.writeFileSync(cikti, JSON.stringify({boy, bolge:bolgeler}));
console.log(`\n${cikti}: ${bolgeler.length} bölge, ${(fs.statSync(cikti).size/1024).toFixed(0)} KB`);
console.log(`model boyu ${boy.toFixed(2)} birim · çizim çağrısı ${bolgeler.length} (primitif ninja 23'tü)\n`);
