/* ARAZİ PLANI — kasaba düzenini üstten SVG olarak çizer.
   Oyunda üstten bakmak işe yaramıyor: sis 58 birimde kapandığı için harita
   boyu bir kamera yüksekliğinden bakınca her şey gökyüzüne soluyor. Düzeni
   değerlendirmek (ve varlık yerleşimini planlamak) için düz bir plan lazım.

   Veri oyundan çekiliyor: OBS kutuları ve BINA_YER listesi tarayıcıda
   üretiliyor, buraya JSON olarak veriliyor. Böylece plan gerçekten SEVK EDİLEN
   düzeni gösteriyor, ayrı bir taklidini değil.

     node tools/plan.js <veri.json> [cikti.svg]
*/
const fs=require('fs');
const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const cikti=process.argv[3]||'plan.svg';

const AR=d.AR, PAY=6, S=900;
const K=S/((AR+PAY)*2);
const X=v=>((v+AR+PAY)*K).toFixed(1), Z=v=>((v+AR+PAY)*K).toFixed(1);
const L=v=>(v*K).toFixed(1);

const p=[];
p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`);
p.push(`<rect width="${S}" height="${S}" fill="#0d1119"/>`);
/* zemin */
p.push(`<rect x="${X(-AR)}" y="${Z(-AR)}" width="${L(AR*2)}" height="${L(AR*2)}" fill="#575347"/>`);
/* sokak ızgarası */
const [BAS,ADIM,SOKAK]=d.IZGARA;
for(let i=0;i<=3;i++){
  const s=BAS-SOKAK/2+i*ADIM;
  p.push(`<rect x="${X(s-SOKAK/2)}" y="${Z(-AR)}" width="${L(SOKAK)}" height="${L(AR*2)}" fill="#6b6659"/>`);
  p.push(`<rect x="${X(-AR)}" y="${Z(s-SOKAK/2)}" width="${L(AR*2)}" height="${L(SOKAK)}" fill="#6b6659"/>`);
}
/* meydan */
const m0=BAS+ADIM;
p.push(`<rect x="${X(m0)}" y="${Z(m0)}" width="${L(d.BLOK)}" height="${L(d.BLOK)}" fill="#847d6b"/>`);
p.push(`<circle cx="${X(m0+d.BLOK/2)}" cy="${Z(m0+d.BLOK/2)}" r="${L(1.4)}" fill="#ffcf7a"/>`);
p.push(`<text x="${X(m0+d.BLOK/2)}" y="${Z(m0+d.BLOK/2)-L(2.4)}" fill="#ffcf7a" font-size="15" font-family="sans-serif" text-anchor="middle">MEYDAN</text>`);
/* engeller */
for(const o of d.obs){
  const renk=o.w?'#98a1b4':'#cbbba0';
  p.push(`<rect x="${X(o.a)}" y="${Z(o.b)}" width="${L(o.c-o.a)}" height="${L(o.d-o.b)}" fill="${renk}"/>`);
}
/* bina cephe yönleri */
for(const b of d.bina){
  const x2=b.x+Math.sin(b.yaw)*3.2, z2=b.z+Math.cos(b.yaw)*3.2;
  p.push(`<line x1="${X(b.x)}" y1="${Z(b.z)}" x2="${X(x2)}" y2="${Z(z2)}" stroke="#e8a33c" stroke-width="2"/>`);
}
/* kapı */
p.push(`<rect x="${X(-4)}" y="${Z(-AR-1.2)}" width="${L(8)}" height="${L(1.6)}" fill="#8a5c2e"/>`);
p.push(`<text x="${X(0)}" y="${Z(-AR)+22}" fill="#e8a33c" font-size="14" font-family="sans-serif" text-anchor="middle">KAPI</text>`);
/* ölçek çubuğu: 10 birim */
p.push(`<rect x="24" y="${S-34}" width="${L(10)}" height="4" fill="#e9eefb"/>`);
p.push(`<text x="24" y="${S-42}" fill="#e9eefb" font-size="13" font-family="sans-serif">10 birim (karakter boyu 1.85)</text>`);
p.push(`<text x="24" y="30" fill="#e9eefb" font-size="17" font-family="sans-serif">Kasaba · ${AR*2}×${AR*2} birim · ${d.bina.length} bina · sokak ${SOKAK} · meydan ${d.BLOK}×${d.BLOK}</text>`);
p.push('</svg>');
fs.writeFileSync(cikti,p.join('\n'));
console.log(cikti+' yazıldı');
