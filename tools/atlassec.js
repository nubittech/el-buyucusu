/* HANGİ DOKU HARİTASI? — kararı ölçüme bırakır.
     node tools/atlassec.js <varlık klasörü>     → seçilen dosya adını basar

   Üretici PBR açıkken `texture_diffuse.png`, kapalıyken yalnız `shaded.png`
   veriyor. "PBR açık olsun, diffuse albedodur" diye düşünmek MANTIKLI ama
   ölçünce tutmuyor — iki varlıkta ezilmiş siyah payı:

     51cf5162   shaded %27.9   diffuse  %2.1     ← diffuse çok daha iyi
     751d4130   shaded %15.5   diffuse %29.8     ← diffuse daha kötü

   Yani bu üreticinin "diffuse"u güvenilir bir albedo değil. O yüzden dosya
   adına göre değil ÖLÇÜME göre seçiliyor ve kullanıcının indirme ayarı
   önemsizleşiyor.

   Ölçüt "ezilmiş siyah payı": parlaklığı 16'nın altında kalan teksel oranı.
   Bu bölgelerde pişmiş gölge bilgiyi tamamen yutmuş; motor kendi gece ışığını
   üstüne uygulayınca oralar geri gelmiyor ve bina siyah kütleye dönüyor.
   Atlas dolgusu (parlaklık<4) sayıma girmiyor, o boşluk zaten dolduruluyor. */
const fs=require('fs'), path=require('path');
const {pngOku}=require('./png.js');

function eziklik(yol){
  const im=pngOku(yol);
  let n=0, siyah=0;
  for(let y=0;y<im.boy;y+=4) for(let x=0;x<im.en;x+=4){
    const c=im.al(x,y), l=(c[0]+c[1]+c[2])/3;
    if(l<4) continue;                       /* atlas dolgusu, içerik değil */
    n++; if(l<16) siyah++;
  }
  return n? siyah/n : 1;
}

const dizin=process.argv[2];
const adaylar=['texture_diffuse.png','shaded.png']
  .map(f=>path.join(dizin,f)).filter(f=>fs.existsSync(f));
if(!adaylar.length){ process.stderr.write('doku bulunamadı: '+dizin+'\n'); process.exit(1); }

let enIyi=adaylar[0], enAz=Infinity;
for(const a of adaylar){
  const e=eziklik(a);
  if(process.env.AYRINTI) process.stderr.write(
    `  ${path.basename(a).padEnd(22)} ezilmiş siyah %${(e*100).toFixed(1)}\n`);
  if(e<enAz){ enAz=e; enIyi=a; }
}
process.stdout.write(enIyi);
