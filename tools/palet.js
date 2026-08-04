/* KARAKTER DOKUSUNUN PALETİ
   Motorda UV/doku yok; model düz renk bölgelerine ayrılacak. Soru: kaç bölge
   yeter, hangi renkler? Doku çözülüp baskın renkler çıkarılıyor.

   PNG çözücü elle yazıldı — bağımlılık eklememek için. Node'un zlib'i işi
   yapıyor, geriye filtre çözme kalıyor (8-bit RGB, interlace yok). */
const fs=require('fs'), zlib=require('zlib');

function pngOku(yol){
  const b=fs.readFileSync(yol);
  if(b.readUInt32BE(0)!==0x89504e47) throw new Error('PNG değil');
  let i=8, en=0, boy=0, derinlik=0, tip=0;
  const veri=[];
  while(i<b.length){
    const uz=b.readUInt32BE(i), ad=b.toString('ascii',i+4,i+8);
    const govde=b.slice(i+8,i+8+uz);
    if(ad==='IHDR'){ en=govde.readUInt32BE(0); boy=govde.readUInt32BE(4);
                     derinlik=govde[8]; tip=govde[9];
                     if(govde[12]!==0) throw new Error('interlace destelenmiyor'); }
    else if(ad==='IDAT') veri.push(govde);
    else if(ad==='IEND') break;
    i+=12+uz;
  }
  if(derinlik!==8) throw new Error('yalnız 8-bit');
  const kanal={0:1,2:3,4:2,6:4}[tip];
  if(!kanal) throw new Error('renk tipi '+tip+' desteklenmiyor');
  const ham=zlib.inflateSync(Buffer.concat(veri));
  const satir=en*kanal, cikti=Buffer.alloc(boy*satir);
  /* filtre çözme: her satır bir filtre baytıyla başlıyor */
  const paeth=(a,b2,c)=>{const p=a+b2-c,pa=Math.abs(p-a),pb=Math.abs(p-b2),pc=Math.abs(p-c);
    return (pa<=pb&&pa<=pc)?a:(pb<=pc?b2:c);};
  for(let y=0;y<boy;y++){
    const f=ham[y*(satir+1)];
    const src=y*(satir+1)+1, dst=y*satir, ust=(y-1)*satir;
    for(let x=0;x<satir;x++){
      const A=x>=kanal?cikti[dst+x-kanal]:0;
      const B=y>0?cikti[ust+x]:0;
      const C=(x>=kanal&&y>0)?cikti[ust+x-kanal]:0;
      let v=ham[src+x];
      if(f===1)v+=A; else if(f===2)v+=B; else if(f===3)v+=(A+B)>>1;
      else if(f===4)v+=paeth(A,B,C);
      cikti[dst+x]=v&255;
    }
  }
  return {en,boy,kanal,px:cikti};
}

/* k-ortalama: dokunun baskın renkleri. Ağırlık = o rengin kapladığı alan. */
function kOrtalama(ornekler,k,tur=14){
  let m=[];
  for(let i=0;i<k;i++) m.push(ornekler[Math.floor(i*(ornekler.length-1)/(k-1||1))].slice());
  for(let t=0;t<tur;t++){
    const top=Array.from({length:k},()=>[0,0,0,0]);
    for(const o of ornekler){
      let en=0,ed=1e18;
      for(let i=0;i<k;i++){
        const d=(o[0]-m[i][0])**2+(o[1]-m[i][1])**2+(o[2]-m[i][2])**2;
        if(d<ed){ed=d;en=i;}
      }
      top[en][0]+=o[0]; top[en][1]+=o[1]; top[en][2]+=o[2]; top[en][3]++;
    }
    for(let i=0;i<k;i++) if(top[i][3]) m[i]=[top[i][0]/top[i][3],top[i][1]/top[i][3],top[i][2]/top[i][3]];
    m.forEach((c,i)=>c[3]=top[i][3]);
  }
  return m.sort((a,b)=>b[3]-a[3]);
}

const yol=process.argv[2]||'assets/shaded.png';
const im=pngOku(yol);
console.log(`\n${yol} — ${im.en}×${im.boy}, ${im.kanal} kanal\n`);

/* Örnekle: her 4. piksel yeter, 262k örnek. Saydam/boş alanları atla. */
const orn=[];
for(let y=0;y<im.boy;y+=4) for(let x=0;x<im.en;x+=4){
  const o=(y*im.en+x)*im.kanal;
  const r=im.px[o],g=im.px[o+1],b=im.px[o+2];
  if(im.kanal===4 && im.px[o+3]<128) continue;
  /* atlas boşluğu genelde saf siyah/beyaz — istatistiği bozmasın */
  if(r<6&&g<6&&b<6) continue;
  if(r>250&&g>250&&b>250) continue;
  orn.push([r,g,b]);
}
console.log(`  örnek: ${orn.length}\n`);

for(const k of [4,6,8]){
  console.log(`  ${k} BÖLGE:`);
  const m=kOrtalama(orn,k);
  for(const c of m){
    const hex='#'+[c[0],c[1],c[2]].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
    const pay=(c[3]/orn.length*100).toFixed(1);
    console.log(`    ${hex}  %${pay.padStart(5)}   rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`);
  }
  console.log('');
}
