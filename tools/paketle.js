#!/usr/bin/env node
/* Web varlıklarını www/ altına toplar — Capacitor'ın webDir'i orası.
   Oyun dosyaları kökte kalıyor çünkü GitHub Pages kökten yayın yapıyor;
   www/ türetilmiş bir çıktı, sürüm kontrolüne girmiyor. */
const fs=require('fs'), path=require('path');
const kok=path.join(__dirname,'..'), hedef=path.join(kok,'www');

const DOSYALAR=['index.html','muhur.html','muhur.js','wkwebview-test.html'];
const KLASORLER=['mediapipe'];

function kopyalaKlasor(src,dst){
  fs.mkdirSync(dst,{recursive:true});
  for(const ad of fs.readdirSync(src)){
    const s=path.join(src,ad), d=path.join(dst,ad);
    if(fs.statSync(s).isDirectory()) kopyalaKlasor(s,d);
    else fs.copyFileSync(s,d);
  }
}
function boyut(p){
  if(!fs.existsSync(p)) return 0;
  const st=fs.statSync(p);
  if(!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((t,a)=>t+boyut(path.join(p,a)),0);
}

fs.rmSync(hedef,{recursive:true,force:true});
fs.mkdirSync(hedef,{recursive:true});

let toplam=0, eksik=[];
for(const f of DOSYALAR){
  const s=path.join(kok,f);
  if(!fs.existsSync(s)){ eksik.push(f); continue; }
  fs.copyFileSync(s,path.join(hedef,f));
  toplam+=boyut(s);
}
for(const k of KLASORLER){
  const s=path.join(kok,k);
  if(!fs.existsSync(s)){ eksik.push(k+'/'); continue; }
  kopyalaKlasor(s,path.join(hedef,k));
  toplam+=boyut(s);
}
/* TEST=1 ile derlersen uygulama doğrudan WKWebView doğrulama sayfasını açar.
   Motorun native kabukta yüklendiğini oyunu başlatmadan ölçmek için. */
if(process.env.TEST==='1'){
  fs.copyFileSync(path.join(kok,'wkwebview-test.html'), path.join(hedef,'index.html'));
  console.log('TEST MODU: giriş sayfası wkwebview-test.html');
}

const mb=(toplam/1048576).toFixed(1);
console.log(`www/ hazır — ${DOSYALAR.length-eksik.length} dosya + ${KLASORLER.length} klasör, ${mb} MB`);
for(const k of KLASORLER){
  const b=boyut(path.join(hedef,k));
  if(b) console.log(`  ${k}/  ${(b/1048576).toFixed(1)} MB`);
}
if(eksik.length){ console.error('EKSİK: '+eksik.join(', ')); process.exit(1); }
