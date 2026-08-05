/* PNG çözücü + k-ortalama — paylaşılan modül.
   Aynı çözücü palet.js, objdonustur.js ve fbxdon.js içinde ayrı ayrı duruyordu;
   dördüncü kopyayı yazmak yerine buraya alındı. Eskiler çalıştığı için
   dokunulmadı, yeni araçlar buradan alıyor.

   Bağımlılık yok: Node'un zlib'i inflate'i yapıyor, geriye satır filtrelerini
   çözmek kalıyor (8-bit, interlace yok). */
const fs=require('fs'), zlib=require('zlib');

function pngOku(yol){
  const b=fs.readFileSync(yol);
  if(b.readUInt32BE(0)!==0x89504e47) throw new Error('PNG değil: '+yol);
  let i=8,en=0,boy=0,derinlik=0,tip=0; const veri=[];
  while(i<b.length){
    const uz=b.readUInt32BE(i), ad=b.toString('ascii',i+4,i+8), gov=b.slice(i+8,i+8+uz);
    if(ad==='IHDR'){ en=gov.readUInt32BE(0); boy=gov.readUInt32BE(4);
                     derinlik=gov[8]; tip=gov[9];
                     if(gov[12]!==0) throw new Error('interlace desteklenmiyor'); }
    else if(ad==='IDAT') veri.push(gov);
    else if(ad==='IEND') break;
    i+=12+uz;
  }
  if(derinlik!==8) throw new Error('yalnız 8-bit');
  const kanal={0:1,2:3,4:2,6:4}[tip];
  if(!kanal) throw new Error('renk tipi '+tip+' desteklenmiyor');
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
  const al=(x,y)=>{
    x=Math.max(0,Math.min(en-1,x|0)); y=Math.max(0,Math.min(boy-1,y|0));
    const p=(y*en+x)*kanal;
    return kanal<3 ? [px[p],px[p],px[p]] : [px[p],px[p+1],px[p+2]];
  };
  /* UV ile örnekle — OBJ'de V ekseni ters */
  const uv=(u,v)=>al(Math.round(u*(en-1)), Math.round((1-v)*(boy-1)));
  return {en,boy,kanal,px,al,uv};
}

/* k-ortalama. Başlangıç merkezleri örnek dizisinden EŞİT ARALIKLA seçiliyor:
   rastgele seçim her çalıştırmada farklı bölge sırası veriyordu ve palet
   eşlemesi kayıyordu. */
function kOrtalama(orn,k,tur=20){
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
const enYakin=(c,m)=>{
  let en=0,ed=1e18;
  for(let i=0;i<m.length;i++){const d=(c[0]-m[i][0])**2+(c[1]-m[i][1])**2+(c[2]-m[i][2])**2;
    if(d<ed){ed=d;en=i;}}
  return en;
};
const hex=(c)=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');

/* --- OBJ okuyucu (üçgenlenmiş) --- */
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
      for(let i=1;i+1<p.length;i++) f.push([p[0],p[i],p[i+1]]);   /* yelpaze ile üçgenle */
    }
  }
  return {v,vt,vn,f};
}

module.exports={pngOku,kOrtalama,enYakin,hex,objOku};
