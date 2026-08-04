/* SÖZDİZİMİ BEKÇİSİ — index.html'in gömülü script'i derleniyor mu?

   NEDEN VAR: bu projede iki kez aynı şey oldu. Yeni bir const, dosyanın çok
   uzağındaki bir const'la aynı adı taşıyınca ("KAR", sonra "UD") TÜM gömülü
   script bir SyntaxError'la ölüyor — tarayıcı hiçbir şey çalıştırmıyor, ekran
   boş kalmıyor (HTML duruyor), yalnız oyun başlamıyor. Belirti "motor
   bekleniyor…" yazısında takılı kalmak; sebebi görmek için konsola bakmak
   gerekiyor ve konsol da boş olabiliyor.

   new Function(src) tam olarak tarayıcının yaptığı ayrıştırmayı yapıyor:
   çalıştırmıyor, yalnız derliyor. Ad çakışması, kapanmamış parantez, kaçak
   virgül — hepsi burada patlıyor.

   paketle.js bunu çağırıyor, yani hatalı bir sürüm telefona hiç gitmiyor. */
const fs=require('fs'), path=require('path');

function denetle(yol){
  const h=fs.readFileSync(yol,'utf8');
  const parcalar=[...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  const hatalar=[];
  for(const p of parcalar){
    const bas=h.slice(0,p.index).split('\n').length;
    try{ new Function(p[1]); }
    catch(e){
      /* Hatanın satırını bul: parçayı satır satır kısaltıp ilk hangi noktada
         mesajın değiştiğine bakmak güvenilmez. Bunun yerine motorun verdiği
         satırı gömülü script'in başlangıcına ekliyoruz. */
      const m=/<anonymous>:(\d+)/.exec(e.stack||'');
      const satir = m ? bas + (+m[1]) - 1 : bas;
      hatalar.push({yol, satir, mesaj:e.message});
    }
  }
  return hatalar;
}

const dosyalar=process.argv.slice(2);
if(!dosyalar.length) dosyalar.push(path.join(__dirname,'..','index.html'));
let hepsi=[];
for(const d of dosyalar) hepsi=hepsi.concat(denetle(d));
if(hepsi.length){
  for(const h of hepsi) console.error(`✗ ${path.basename(h.yol)}:${h.satir}  ${h.mesaj}`);
  console.error('\nGömülü script derlenmiyor — tarayıcıda HİÇBİR ŞEY çalışmaz.');
  process.exit(1);
}
console.log(`sözdizimi tamam (${dosyalar.map(d=>path.basename(d)).join(', ')})`);
