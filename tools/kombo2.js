/* KOMBO GÜVENİLİRLİĞİ — oylama penceresi dahil
   Kombo açılınca her mühür ayrı ayrı doğru okunmak zorunda; hatalar çarpılıyor.
   Ama oyun tek kareye bakmıyor: OY_MS=260 ms'lik pencerede çoğunluk aranıyor,
   bu da tek kare doğruluğunu ciddi biçimde yukarı çekiyor. Gerçek sayı için
   oylamayı da simüle ediyoruz.

   İki başarısızlık türü ayrı sayılıyor:
     RED    — hiçbir şey tetiklenmedi. Ucuz: oyuncu tekrar dener.
     YANLIŞ — BAŞKA bir beceri çıktı. Pahalı: yanlış element gider, tur kaybedilir. */
const realLog = console.log; console.log = () => {};
const H = require('./handtest.js');
console.log = realLog;
const { finger } = H;
require('../muhur.js');
const M = globalThis.MUHUR;

const TOUCH_CURL=0.42, TUCK=[-0.20,0.80,0.10], FULL=[-0.92,0.90,0.18];
const GUN_LO=[-0.50,0.95,0.12], GUN_HI=[-0.85,1.12,0.16];
function build({touch=[],folded=[],thumbTuck=false,thumbUp=false,thumbOpen=1,fan=12}){
  const curl={i:0,m:0,r:0,p:0};
  for(const f of touch) curl[f]=TOUCH_CURL;
  for(const f of folded) curl[f]=0.92;
  const FANS={i:-fan,m:0,r:fan,p:fan*2.1};
  const ch={}; for(const f of ['i','m','r','p']) ch[f]=finger(f,curl[f],FANS[f]);
  let tip;
  if(touch.length){tip=[0,0,0];for(const f of touch){const t=ch[f][3];for(let k=0;k<3;k++)tip[k]+=t[k]/touch.length;}tip[2]+=0.06;}
  else if(thumbTuck) tip=TUCK.slice();
  else if(thumbUp) tip=GUN_LO.map((v,k)=>v+(GUN_HI[k]-v)*thumbOpen);
  else tip=TUCK.map((v,k)=>v+(FULL[k]-v)*thumbOpen);
  const base=[-0.35,0.25,0.05], th=[base];
  for(let k=1;k<=3;k++){const t=k/3,bow=Math.sin(t*Math.PI)*0.10;
    th.push([base[0]+(tip[0]-base[0])*t-bow, base[1]+(tip[1]-base[1])*t, base[2]+(tip[2]-base[2])*t+bow]);}
  const lm3=[[0,0,0],...th];
  for(const f of ['i','m','r','p']) lm3.push(...ch[f]);
  return lm3.map(([x,y,z])=>({x:0.5+x*0.09,y:0.90-y*0.09,z:0}));
}
const DEF={fire:{touch:['i']},air:{serbest:1},water:{folded:['p'],thumbTuck:true},
  bolt:{folded:['i','m','r'],serbest:1},earth:{folded:['m','r'],thumbTuck:true},
  gun:{folded:['r','p'],thumbUp:true,serbest:1}};
function örnek(n,ac){const d={...DEF[n]};delete d.serbest;if(DEF[n].serbest)d.thumbOpen=ac;return build(d);}
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const d2v=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TIPS={8:5,12:9,16:13,20:17};
function jitter(lm,s){const sc=d2v(lm[0],lm[9])||1e-6;const o=lm.map(p=>({x:p.x,y:p.y,z:0}));
 for(let i=0;i<o.length;i++){let k=sc*s;
  if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
   o[i].x+=vx/vl*sc*0.10;o[i].y+=vy/vl*sc*0.10;}
  o[i].x+=gauss()*k;o[i].y+=gauss()*k;}return o;}

function kisitli(res,acik){
  const ds=res.ds.filter(d=>acik.includes(d.id));
  if(!ds.length) return null;
  if(ds[0].d>res.esik) return null;
  if(ds.length>1&&(ds[1].d/(ds[0].d||1e-6))<res.oranEsik) return null;
  return ds[0].id;
}

/* TEK MÜHRÜN ONAYLANMASI — muhur.js'in oylama kuralının aynısı.
   30 Hz'de 260 ms ≈ 8 kare; onay için OY_PAY oranı ve OY_ASGARI sayısı gerekiyor. */
const OY_PAY=0.55, OY_ASGARI=5, KARE=8;
function muhurOnayi(hedef, acik, sg){
  const oylar=[];
  for(let i=0;i<KARE;i++){
    const res=M.siniflandir(M.feat(jitter(örnek(hedef,0.35+Math.random()*0.65),sg)));
    oylar.push(kisitli(res,acik));
  }
  const say={}; let en=null,enN=0;
  for(const o of oylar){ if(!o) continue; say[o]=(say[o]||0)+1; if(say[o]>enN){enN=say[o];en=o;} }
  if(!en) return null;
  if(enN<OY_ASGARI) return null;
  if(enN/oylar.length<OY_PAY) return null;
  return en;                       /* onaylanan mühür (hedeften farklı olabilir!) */
}

const AD={gun:'silah',fire:'ateş',water:'su',air:'hava',bolt:'yıldırım',earth:'toprak'};
const KADEME=[['gun','fire','water'],
              ['gun','fire','water','bolt','air'],
              ['gun','fire','water','bolt','air','earth']];
const N=3000;

for(const sg of [0.045,0.070]){
  console.log(`\nσ=%${(sg*100).toFixed(1)} · ${N} deneme · oylama penceresi ${KARE} kare\n`);
  console.log('  açık poz   zincir     istenen   RED    YANLIŞ BECERİ');
  console.log('  '+'-'.repeat(52));
  for(const acik of KADEME){
    const el=acik.filter(a=>a!=='gun');
    for(const uzunluk of [1,2,3]){
      if(uzunluk>el.length) continue;
      /* YALNIZ TANIMLI ZİNCİRLER. Rastgele zincir seçmek beceri tablosunun
         boşluğunu ölçüyordu (25 ikiliden 15'i, 125 üçlüden 5'i tanımlı),
         tanımayı değil. Oyuncu da zaten var olmayan bir beceriyi denemez. */
      const havuz=[];
      const gez=(pre)=>{ if(pre.length===uzunluk){ if(M.beceriBul(pre)) havuz.push([...pre]); return; }
                         for(const e of el) gez([...pre,e]); };
      gez([]);
      if(!havuz.length){ console.log(`  ${String(acik.length).padStart(2)}         ${uzunluk} mühür   — tanımlı zincir yok`); continue; }
      let dogru=0,red=0,yanlis=0;
      for(let k=0;k<N;k++){
        const hedef=havuz[(Math.random()*havuz.length)|0];
        const okunan=[];
        let kirik=false;
        for(const h of hedef){
          const o=muhurOnayi(h,acik,sg);
          if(!o){ kirik=true; break; }
          okunan.push(o);
        }
        if(kirik){ red++; continue; }
        const bH=M.beceriBul(hedef), bO=M.beceriBul(okunan);
        if(!bO){ red++; }                                  /* eşleşmeyen dizi = ceza, ucuz */
        else if(bH && bO.ad===bH.ad) dogru++;
        else yanlis++;                                     /* BAŞKA beceri çıktı */
      }
      const et=(uzunluk===1?'tek mühür':uzunluk+' mühür  ')+' ('+havuz.length+' zincir)';
      console.log(`  ${String(acik.length).padStart(2)}   ${et.padEnd(22)} %${(dogru/N*100).toFixed(1).padStart(5)}  %${(red/N*100).toFixed(1).padStart(5)}  %${(yanlis/N*100).toFixed(2).padStart(5)}`);
    }
    console.log('');
  }
}
console.log('Not: "istenen" oranı düşük görünse de RED ucuz — oyuncu tekrar dener.');
console.log('Karar verici sayı YANLIŞ BECERİ: istemediğin şey gider, tur kaybedilir.\n');
