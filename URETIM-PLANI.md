Everything is verified. Two findings nobody in either report caught — I'll build the plan around them.

**GÖLGE NİNJA — v1.0 ÜRETİM PLANI**
*Yapımcı kararı · 4 Ağustos 2026 · yedi alan planı ve iki denetim raporu hakem edildi*

---

## 0. HAKEM NOTU — planlamadan önce doğrulanan üç şey

Yedi planın ve iki denetimin ortak dayanağını kendim koşturdum. İki yeni bulgu çıktı; plan onların üstüne kuruldu.

**(a) Oynanış denetimi haklı: "elementi oku" penceresi yok.** `index.html:2109` → `ctx.fillText(MU.BY[e.el].el, p.x, y-5)` — düşmanın elementi, can barının üstünde emoji olarak, doğduğu andan itibaren **her karede** yazılı. Telegraf yayı (2112-2124) yalnız "ne zaman" der. Ve `muhur.js:286-308` `!KOMBO` dalında şarjın zaman aşımı **yok**: `D.beceri` yalnız ateşle ya da `cancelSpell()` ile sıfırlanıyor. Yani oyuncu elementi okur, karşılığını hazırlar, süresiz bekler. Sanat'ın ΔE≥45 programı, VFX'in beş element silueti ve Ses'in beş ritim deseni — **12 gün, çözülmüş bir soruna gidiyor.**

**(b) YENİ BULGU — atış penceresi zaten var ve kodda gizli.** `ates()` (1549) LOCK'un **o anki** konumuna nişan alıyor, lead yok. İsabet yarıçapı 0.95 (1853). Düşmanın durumuna göre yanal ıska (en hızlı ninja, 4.86 b/sn):

| durum | Toprak (10 b/s) | Ateş (15) | Su (16) | Hava (23) | Yıldırım (30) |
|---|---|---|---|---|---|
| `dolan` 10 br | 4.86 ✗ | 3.24 ✗ | 3.04 ✗ | 2.11 ✗ | 1.62 ✗ |
| `siper` 10 br | 3.89 ✗ | 2.59 ✗ | 2.43 ✗ | 1.69 ✗ | 1.30 ✗ |
| **`hazirlan`** 10 br | **0.49 ✓** | **0.32 ✓** | **0.30 ✓** | **0.21 ✓** | **0.16 ✓** |
| `yaklas` (radyal) | 0.00 ✓ | 0.00 ✓ | 0.00 ✓ | 0.00 ✓ | 0.00 ✓ |

Düşman `dolan` ya da `siper`deyken **hiçbir element isabet etmiyor** (Yıldırım 6 birimde sınırda: 0.97). `hazirlan`da (hız ×0.25, yanal ×0.4 — satır 1769) **hepsi isabet ediyor.** Ölçülen %21.3 isabet oranı (afb7a20) tam olarak bu. Oyun zaten bir **pusu/zamanlama düellosu**; oyuncuya bunu söyleyen tek bir piksel yok.

**(c) YENİ BULGU — telegraf siperden sonra çöküyor.** `index.html:1796` → `else if(e.cd<=0 && !los){ e.cd=0.35; }`. Düşman siperdeyken cd sürekli 0.35'e kuruluyor. LOS geri geldiği an cd ∈ [0, 0.35] ve `e.telegraf = 1 - cd/1.1` (1786) zaten **%68-100 dolu**. Oyuncunun payı **0-350 ms**; ölçülen atış maliyeti 417-467 ms (temiz), 656 ms (%40 kare kaybı). **Siperden çıkan düşmana karşılık yetiştirmek matematiksel olarak imkânsız.** Üstelik oyuncu şarjlıyken düşman zaten sipere kaçıyor (1759) — yani oyun, oyuncu doğru oynadığında onu cezalandırıyor. Yedi planın hiçbiri bunu bulmadı. **Bu, oyundaki en büyük tek adaletsizlik ve 3 satırlık bir düzeltme.**

Ayrıca doğrulandı: `S.aim` (1499) yazılıyor, **hiçbir yerde okunmuyor** — ölü kod, nişan alma yok. Hakimiyet matrisi 4/3/1/0/0 birebir doğru; delme etkin güçten çıkarılınca beşi de 1/4 ve beş bağ da +0.60. `kareOlc` (wkwebview-test.html:135-140) boş rAF sayıyor — **61 fps oyunun hızı değil.** `paketle.js:41-44` TEST=1 ile `index.html`'i ölçüm sayfasıyla değiştiriyor, koruma yok. `AppDelegate.swift` gövdesi boş.

---

## 1. KARAR ÖZETİ

Gölge Ninja, beş rakiplik bir merdivende oynanan **tek-düşmanlı zamanlama düellosudur.** Oyunun okuması "hangi element geliyor" değil — o cevap zaten ekranda yazılı ve öyle kalacak; okuma **"ne zaman ateş edersem tutar"**dır ve kodda ölçülebilir biçimde zaten vardır (düşman `hazirlan` durumundayken, yani kendi telegrafı sırasında). v1.0'ın işi bu gizli döngüyü **görünür, adil ve bitirilebilir** yapmaktır: telegraf çöküşü onarılır (0-350 ms → tam 1100 ms), zemin halkasıyla atış penceresi ilan edilir, mermiye nişan payı verilir (Toprak bugün hareketli hedefe ilkesel olarak ıskalıyor), element döngüsü çarpışmada düzeltilir (4/3/1/0/0 → 1/1/1/1/1), ve el kaybında şarj artık iptal edilmez — böylece kol inebilir. Üstüne üç ellik karşılaşma yapısı, beş rakiplik merdiven, element açılımı ve okuma karnesi gelir. **Kesilen: iskeletli karakter, müzik, kombo, beş element görsel/işitsel kimliği, ikinci arena, PvP.** Sanat, ses ve VFX bütçesinin tamamı "hangi element" sorusundan çekilip **"şimdi mi, sonra mı"** sorusuna yatırılır. Toplam kapsam **65 iş günü**; tek geliştiricide gerçekçi takvim **5-7 ay**.

**Dürüst cevap, gizlenmeden:** v1.0 eli uzamsal bir girdi yapmıyor. Otomatik kilit kalıyor, serbest nişan gelmiyor (tek düşman + 417 ms taban gecikme = nişan almak angarya olur). El, v1.0'da bir **taahhüt girdisi** oluyor: hangi mührü seçtin, ne kadar tuttun, kolun yukarıda mı aşağıda mı. "Düğme yerine el" sınırı tam olarak burada aşılıyor — daha fazlası v1.1'in işi.

---

## 2. KAPSAM

### v1.0'A GİRENLER

| # | Kalem | Nereden |
|---|---|---|
| 1 | Cihazda gerçek kare bütçesi ölçümü | Teknik P0-1 (her iki denetim de "önce bu" dedi) |
| 2 | rAF koruması, hata güncesi, `tani.html` | Teknik P0-3 |
| 3 | Kayıt katmanı v1: tek anahtar, şema sürümü, NaN reddi | Teknik P0-2 |
| 4 | Tek kaynaklı sürüm damgası + `paketle.js` sertleştirme | Teknik P0-4 + Yayın P0-5 (birleştirildi) |
| 5 | Oynanış telemetrisi (JSON halka tamponu) | Kreatif P0-2 + UX P0-1 (birleştirildi) |
| 6 | Element döngüsü onarımı (delme etkin güçten çıkar) | Kreatif P0-1 |
| 7 | **Telegraf çöküşü onarımı** | yeni bulgu |
| 8 | **Nişan payı (intercept lead) + `S.aim` ölü kodunun silinmesi** | yeni bulgu |
| 9 | **El kaybında şarj iptal edilmez → kol iner** | yeni karar |
| 10 | Zemin halkaları: telegraf, atış penceresi, siper güvenliği | VFX P1 → **P0'a terfi** |
| 11 | Havada çarpışma sonucu okunabilirliği (nötr ↔ deldi) | VFX P0 (kapsam daraltıldı) |
| 12 | Düşman element değiştirme, merdivene bağlı | Kreatif + oynanış denetimi #7 |
| 13 | Karşılaşma yapısı: 3 el + tur arası boşluk | Kreatif P0-3 |
| 14 | Rakip merdiveni: 5 rakip, programlı element ve zorluk | Kreatif P0-4 + P1 |
| 15 | Element açılımı + kalıcı ilerleme | Kreatif P0-5 |
| 16 | Bitiş ekranı: okuma karnesi | Kreatif P0-6 |
| 17 | Kamera kapısı + izin reddi kurtarma ekranı | UX P0-2 + Yayın P0-2 (birleştirildi) |
| 18 | Red sinyalini oyuna bağla (`red:'uzak'/'belirsiz'`) | UX P0-3 |
| 19 | Kalıcı jest referansı + sentetik el ikonları | UX P0-4 |
| 20 | Öğretici karşılaşma (kalibrasyon içinde, 4 adım) | UX P0-5 + P1 |
| 21 | `muhur.html` 30 Hz + manevra bölgesi el bağımsız + duraklatma | UX P1 |
| 22 | Haptik katmanı (`@capacitor/haptics`) | VFX + UX + Yayın (üç kez sayılmıştı, bir kez yapılıyor) |
| 23 | Ses altyapısı + 10 örneklik set | Ses P0-1,2,3 (kapsam daraltıldı) |
| 24 | `progFx` + parçacık halka tamponu | VFX P0 (bütçe-pozitif) |
| 25 | İkon, splash, gizlilik manifesti, platform daraltma | Yayın P0 |
| 26 | GitHub Pages: oyun kapatılır, gizlilik politikası açılır | Yayın P0-3 |
| 27 | Mağaza varlıkları + tanıtım modu + İngilizce review notes | Yayın P0-8,9 + P1 |
| 28 | TestFlight internal → external + gönderim kapısı | Yayın P1 + P2 |
| 29 | **Poz geçiş maliyeti matrisi (5×5, cihazda)** | oynanış denetimi #6 |

### v1.0'A GİRMEYENLER — ve neden

| Kesilen | Gün | Gerekçe |
|---|---|---|
| **İskeletli rig + animasyon seti + mesh yükleyici** | 23.5 | Sanat P1'in ön koşulu olan motor işini Teknik zaten kesti ve dürüst maliyetini 7.5 gün yazdı. 16 gün var olmayan bir motora teslim ediliyordu. Yerine "köşe-palet yuvası" (4g, M5'te opsiyonel) çizim çağrısı kazancının %90'ını veriyor. |
| **Beş element görsel kimliği + gri tonlama geçişi** | 8 | `index.html:2109` elementi emoji olarak sürekli yazıyor. Renk/siluet ayrımı, cevabı zaten ekranda olan bir soruyu çözüyor. Ayrımın gerçekten olmadığı yer havada çarpışma sonucu — bütçe oraya taşındı (kalem 11). |
| **Beş element telegraf ses deseni** | 4 | Aynı gerekçe. Yerine **iki** ses: "telegraf başladı" ve "son 300 ms". Okuma zaman okuması. |
| **Müzik (2 döngü + sting) + ambiyans** | 8 | Ses alanının kendi "maskeleme doğrulaması" kalemi, müziğin telegraf sesini bastırıp planın tek ölçülebilir iddiasını iptal edebileceğini yazıyor. Sessiz kalmaktansa bilgiyi korumak yeğdir. v1.1. |
| **Kombo'yu geri açmak (Kademe 2)** | 3 | Ses ve VFX 20 becerinin karşılığını açıkça kesti; açılırsa oyuncu sessiz ve görsel olarak ayırt edilemez içerik alır. `TASARIM.md §0`'ın kapatma gerekçesi (tanıma hatası çarpılıyor) hâlâ geçerli. |
| **Işık ölçümü (video → 2D canvas → getImageData)** | 1.5 | GPU→CPU senkronu tetikler; ağır karede kalan pay p95'te 0.4 ms. Kadraj uyarısı landmark'tan bedava alınır, parlaklık ölçülmez. |
| **3 cihaz × 5 ışık test matrisi** | 3 | İkinci cihaz yok, lüksmetre yok. 1 cihaz × 3 ışık koşulu (aydınlık oda / loş / arkadan aydınlatma), lüks değeri yerine tekrarlanabilir kurulum fotoğrafı. |
| **İkinci/üçüncü arena + mağaza kilit karesi + gündüz teması** | 10 | Gündüz teması: bloom eşiği 0.94, gölge tonu, kaya albedosu — hepsi yalnız geceye göre ölçüldü (60b5761, ff71aca). İkinci palet bütün görsel işi ikiye katlar. Arena çeşitliliği v1.1. |
| **Tohumlu RNG / determinizm** | 1.5 | PvP kesildi; hata yeniden üretimi için telemetri (kalem 5) yeterli. |
| **PvP, mühür kalitesinin güce girmesi, Kademe 3, sonsuz mod, ustalık güç çarpanı** | — | Yedi planın ortak kararı, aynen korunuyor. |
| **iPad, yatay yön, iOS 15/16, Mac, Vision Pro, lokalizasyon, analitik/SDK** | — | Yayın alanının kesme listesi aynen korunuyor. Test edemediğimiz iddiayı taşımıyoruz. |
| **Paket küçültme projesi** | — | Fizibilite denetimi haklı: iOS<16.4 kesilince `vision_wasm_nosimd_internal.wasm` (8.86 MB) silinebilir; paket ses+VFX'e rağmen **bugünkünden küçük** çıkar (~23 MB). Ayrı bir iş kalemi gerekmiyor, kalem 25'in içinde bir satır. |

### KESİLMEYEN AMA DENETÇİLERİN KESMEK İSTEDİĞİ TEK ŞEY

**`G.score` tamamen silinmiyor.** Kreatif skoru kesiyordu; oynanış denetimi haklı olarak "skoru kesmek tek uyarlanır YZ'yi siliyor" dedi (`1342 ustaOlabilir=G.score>=30`, `1744-1748 oyuncuFavori()` → usta oyuncunun favorisini yenen elemente geçiyor — tek-element spam'ini cezalandıran **tek** sistem). **Karar:** skor HUD'dan ve bitiş ekranından kalkar (`index.html:91, 1858, 2176`), yerine karne gelir; ama sayaç içeride **ilerleme sayacı** olarak kalır ve `oyuncuFavori()` element değiştirme davranışı korunup merdiven basamağına bağlanır (3. rakipten itibaren aktif). Uyarlanır rakip ölmüyor, görünürlüğü değişiyor.

---

## 3. KİLOMETRE TAŞLARI

Her taş sonunda cihazda **oynanabilir** bir yapı var. Sıra bağımlılık zorunluluğu.

---

### M0 — ÖLÇÜM VE EMNİYET AĞI · 9 gün
*Bu taş bitmeden hiçbir optimizasyon kararı verilmez. Her iki denetim de bunu şart koştu.*

**İşler:** kare bütçesi enstrümantasyonu (2.5g) · rAF koruması + hata güncesi + `tani.html` (1.5g) · kayıt katmanı v1 + NaN regresyon testi (2.5g) · sürüm damgası + `paketle.js` sertleştirme + LICENSE/NOTICE (1.5g) · telemetri halka tamponu + JSON dökümü (1g)

**Bitti-ölçütü:**
- Cihazda 120 sn oturumda **ağır kare** (çıkarım yapılan) ve **boş kare** ayrı ayrı raporlanıyor; çıkarım dışı iş p50/p95/p99 sayı olarak biliniyor. *Bugün bu sayı hiç yok — ölçülmüş olması tek başına kabul koşulu.*
- `tick()`e enjekte edilen yapay istisna kare döngüsünü durdurmuyor; yığın izi `tani.html`'de görünüyor.
- 9 yerine 7 uzunluklu `mu/sd` dizisi içeren kalibrasyonla `siniflandir()` **null** dönüyor (bugün `red:null` ile `'fire'` dönüyor — Node regresyon testi depoda kalıyor).
- `package.json` · `MARKETING_VERSION` · oyun içi etiket birebir aynı dizge; uyuşmazlıkta `paketle.js` sıfırdan farklı çıkış kodu veriyor. `TEST=1` ile üretilmiş `www/` üzerinden Release arşivi **hata ile duruyor**. `unzip -l | grep -c wkwebview` = 0.
- 10 dakikalık oturumun sonunda `tani.html`'den JSON dökümü alınabiliyor: atış sayısı, isabet oranı, düşman durumuna göre atış dağılımı, el-yukarıda aralıkları.

---

### M1 — DÖVÜŞ DÜRÜSTLÜĞÜ · 11 gün
*Oyunun bugün yalan söylediği yerler. Bu taş bittiğinde oyun hâlâ sonsuz akış, ama adil.*

**İşler:**
- **Element döngüsü onarımı (2g).** `muhur.js:220-227` etkin güç `guc × avantaj` olur, delme çıkar. Doğruladım: beş bağ da +0.60, hakimiyet 1/4 × 5. **Delme yok olmuyor, rolü değişiyor:** `kalanGuc = |fark| × delme[kazanan]` (bugün böleniyordu — bölmek yüksek delmeyi cezalandırıyor). Yeni değerler: Toprak 1.11, Yıldırım 0.93, Ateş 0.60, Su 0.48, Hava 0.42. "Elementler birbirine benzer" riskinin cevabı bu: delme artık *delip geçtikten sonra ne kadar vuruş kaldığını* belirliyor. Ayrıca `AVANTAJ` doğrudan isabete de uygulanır (`index.html:1854`), yoksa okuma yalnız mermilerin buluştuğu %26-56'lık durumda ödüllenir.
- **Telegraf çöküşü onarımı (0.5g).** LOS `false→true` geçişinde `e.cd = Math.max(e.cd, TELEGRAF/1000 + 0.15)`. Siperden çıkan düşman her zaman tam telegraf verir.
- **Nişan payı (1.5g).** `ates()` (1549) hedefin hız vektörüyle kesişim noktası hesaplar (iki adımlı iterasyon yeter). `S.aim` ve `1499`'daki yazma silinir. Lead **kusursuz değil**: `dolan` durumundaki yön değişimi (1768, `Math.random()<0.004`) hatayı uçuş süresiyle orantılı bırakır — yani Yıldırım hâlâ güvenilir, Toprak hâlâ pencere ister. Zamanlama gradyanı korunuyor.
- **Kol iner (1g).** `index.html:1502` artık `cancelSpell()` değil `cancelVotes()` çağırır: oy tamponu ve aday temizlenir, **şarj korunur**. Oyuncu mührü yapar, kolunu indirir, başparmakla manevra eder, ateşlemek için kolunu kaldırır. `TASARIM.md §10-4`'ün açık sorusu böyle kapanıyor: yüklü beceri taşınabilir, süresiz.
- **Düşman element değiştirme (1.5g).** `oyuncuFavori()` korunur, `G.score` bağı kesilir, merdiven basamağına bağlanır. Şarj süresizken maliyet buradan gelir: beklersen düşman elementini değiştirebilir.
- **Zemin halkaları (2.5g).** Düşmanın ayağının dibinde üç halka, üçü de mevcut `GEO.torus`/`GEO.disc` ile — **yeni program yok, `2068`'deki kilit halkası kalıbı var.** (1) telegraf dolum halkası, (2) **atış penceresi halkası** — düşman `hazirlan`/`yaklas`'tayken yanar, `dolan`/`siper`'de söner: oyuna bugüne kadar hiç söylenmemiş kuralın ilanı, (3) siper güvenliği — `hasLOS()` (1325) zaten hesaplanıyor, hiç gösterilmiyor.
- **Çarpışma sonucu okunabilirliği (2g).** `1811` nötr ve `1816` deldi bugün yalnız ölçek+renkle ayrışıyor (1.5 beyaz / 1.2 renkli). Nötr = çarpışma eksenine dik simetrik halka. Deldi = kaybedenin hız vektörünün tersine asimetrik saçılma + kazananın izinin kalınlaşması. **Yön ayrımı, renk ayrımı değil.**

**Bitti-ölçütü:**
- `node tools/denge.js`: beş elementin her biri **tam 1/4** deliyor, beş bağ da doğru çözülüyor. (Bugün 4/3/1/0/0, biri ters, biri görünmez.)
- Siperden çıkan düşmanın telegrafı **hiçbir örnekte %10'dan dolu başlamıyor** — 50 siper çıkışında ölçülür. (Bugün %68-100.)
- 10 birim mesafede `dolan` durumundaki düşmana atılan Toprak mermisinin isabet oranı ≥ %40. (Bugün matematiksel olarak %0.)
- Element başına saniyedeki beklenen hasar beş element arasında **±%25 bandında** (20 dakikalık kayıtlı oynanıştan, telemetri ile).
- Kesintisiz el-yukarıda süresi 20 dakikalık oturumda **hiçbir noktada 45 saniyeyi aşmıyor** — telemetride el görünürlük aralıklarından ölçülür.
- 30 kliplik kör testte "benim mermim yaşadı mı" sorusu çarpışmadan 300 ms sonraki tek kareden **≥ %90** doğru cevaplanıyor.

---

### M2 — MAÇ · 13 gün
*Oyun bitmeye başlıyor.*

**İşler:** karşılaşma yapısı, 3 el + tur arası boşluk (6g) · rakip merdiveni, 5 rakip (3g) · element açılımı + ilerleme kaydı (2g) · bitiş ekranı / okuma karnesi (2g)

Merdiven programı — element zar değil: **1.** oyuncunun yendiği element (okuma öğretilir) · **2.** nötr (ham dövüş) · **3.** oyuncuyu yenen element — tek elementle geçilemeyen tasarlanmış duvar (`TASARIM.md §3.5` bunu zaten öngörüyor) · **4-5.** açılan ikinci elementle çözülür, element değiştirme burada devreye girer. Telegraf merdiveni **1500 / 1300 / 1100 / 950 / 850 ms**; 850'nin altına inilmiyor (ölçülen atış maliyeti %25 kare kaybında 529 ms → pay 321 ms). Düşman canı sabit 100 kalır; tur uzunluğu telegraf ve `bekle` ile ayarlanır.

**Bitti-ölçütü:**
- Bir el medyanı 40-60 sn, bir karşılaşma medyanı 3:00-3:45 (20 kayıtlı karşılaşmadan).
- Her tur arasında elin hiç gerekmediği **≥ 10 saniyelik** boşluk var; o boşlukta çıkarım 30 Hz'den 8 Hz'e düşüyor (ısı sübabı).
- 20 karşılaşmada oyuncunun kazanma oranı **%40-70** bandında. %0 ya da %100 uçlarında merdiven geçersiz.
- Doğru karşılık oranı 1. rakipte ≥ %35, 5. rakipte ≥ %55 ve rakip numarasıyla **monoton artıyor**.
- Uygulama kapatılıp açıldığında açık elementler ve merdiven indeksi korunuyor; kalibrasyonu sıfırlamak ilerlemeyi **silmiyor** (ayrı localStorage anahtarı — şema M0'da donduruldu).
- Beş rakibin beşi de baştan sona, tek oturumda, kesintisiz oynanabiliyor.

---

### M3 — İLK DENEYİM · 11 gün
*Yeni oyuncu ilk 60 saniyede oyuna girebiliyor.*

**İşler:** kamera kapısı + izin reddi kurtarma (2g) · red sinyalini oyuna bağla (1g) · kalıcı jest referansı + sentetik el ikonları (2g) · öğretici karşılaşma, 4 adım (5g) · `muhur.html` 30 Hz + manevra bölgesi + duraklatma (1g)

**Öğretici döngü kırılması — UX'in çözmediği riski çözüyorum.** UX planı "öğretici kalibrasyonu içine alsın" diyor ama kendi risk maddesi "PROTO0 ile ilk 🔥 adımı onaylatılamaz, öğretici kilitlenir" diyor. **Karar: öğreticinin her adımı önce KAYIT, sonra ONAY.** Adım şu sırayla çalışır: (1) pozu göster, (2) 3 saniye tut → `kayitBasla`/`kayitOrnek`/`kayitBitir` ile kaydet (tanıma onayı **gerekmez**, yalnız el görünmesi gerekir), (3) kayıt bittiği an o poz artık öğrenilmiş, (4) şimdi onaylatmasını iste. Kilitlenme yolu kapanıyor. Altı poz yerine **dört adım**: 🔥 (element) → 👉 (silah) → ateş → siper. Kalan üç element açılımla gelir ve o an mikro-kayıt yapılır.

**Bitti-ölçütü:**
- Kamera izni diyaloğu ekrandayken `enemies.length===0`, `G.can===100`. (Bugün t=2.2 s'de düşman doğuyor, girişsiz oyuncu 20-25 s'de ölüyor.)
- Kamera reddedildiğinde: kırpılmamış ≥3 satır Türkçe açıklama, ≥44×44 pt "Ayarları Aç" ve "Tekrar dene"; "Tekrar dene" gerçekten `getUserMedia` çağırıyor (`started` sıfırlanıyor) ve izin sonradan verilince oyun **aynı oturumda** başlıyor. 3/3 denemede.
- 5 gerçek yeni oyuncuda medyan "Başlat → ilk onaylı mühür" ≤ 25 sn, "→ ilk isabetli atış" ≤ 60 sn.
- Öğretici tamamlandığında `MU.kalSayim() ≥ 2` ve seçilen elementin kaydı var; medyan tamamlanma ≤ 90 sn; hiçbir adımda çıkışsız kalınmıyor.
- 20 kasıtlı belirsiz pozun 20'sinde ≤200 ms içinde ekranda sebep var ("emin değilim" / "iki poz arasındasın" + iki aday emoji).
- Kalibrasyon sayfasında çıkarım ≤ 32 Hz (bugün ~61 — `muhur.html:340` hâlâ eski kapıyı kullanıyor).
- Sol yarıda başlatılan ilk sürükleme karakteri hareket ettiriyor; seçilen yarı oturum boyunca sabit.

---

### M4 — DUYU · 9 gün
*Geri bildirim kanalları açılıyor. Bilgi taşıyan kadarı, fazlası değil.*

**İşler:** SPIKE — iOS ses oturumu + haptik doğrulama (1.5g) · haptik katmanı (1g) · `ses.js` çekirdek + olay bağlama (2.5g) · 10 örneklik ses seti (2g) · `progFx` + parçacık halka tamponu (2g)

Ses seti — **10 örnek, beş element kimliği değil**: telegraf başladı · telegraf son 300 ms · mühür onaylandı · şarj doldu · red (belirsiz) · atış · havada nötrleşme · havada delme · düşmana isabet · oyuncuya hasar. Elementler arası ayrım `ELEM[el].hasar`'a bağlı `playbackRate`/filtre ile bedava gelir.

Parçacık tamponu bütçe-**pozitif**: mevcut patlama küresi (`2070-2073`) 8 birimde 1.8 Mpx dolduruyor (CULL_FACE kapalı, ön+arka yüz) ve o pikseller ana shader'ın 9 bağımlı doku okumasından geçip `391`'de atılıyor. Yerine geçen 96 parçacıklı burst ~0.02 Mpx.

**Bitti-ölçütü:**
- Cihazın **donanım sessiz anahtarı açıkken** oyun sesi duyuluyor (ikili geç/kal).
- `getUserMedia` (1431) çağrısından hemen önce ve sonra çalınan aynı test tonunun RMS farkı ≤ 1 dB.
- Atış olayından duyulabilir sese gecikme **≤ 40 ms** (240 fps yavaş çekimde ≤ 10 kare).
- Sekiz haptik olayının hepsi cihazda hissediliyor, gecikme ≤ 50 ms. (Bugün `navigator.vibrate` iOS WKWebView'da yok — 10 çağrı noktası ölü.)
- Ses açıkken 10 dakikalık oturumda kare hızı M0'daki tabanın ≥ %97'si, ses grafiği p95'e ≤ 0.5 ms ekliyor.
- Tek patlamanın en geniş karesinde harmanlanan piksel ≤ 0.10 Mpx (bugün 1.8 Mpx). Ekranda 3 patlama + 2 iz varken çizim çağrısı **değişmiyor**.
- Paket artışı ≤ 3.0 MB; `nosimd` wasm silindikten sonra net paket ≤ 24 MB.

---

### M5 — GÖNDERİM · 12 gün

**İşler:** ikon + splash (2g) · GitHub Pages dönüşümü + gizlilik politikası (1.5g) · `PrivacyInfo.xcprivacy` + Info.plist + platform daraltma (2g) · ASC kaydı, gizlilik/yaş/bölge/tacir beyanı (1.5g) · mağaza varlıkları + tanıtım modu (3g) · İngilizce review notes + demo video (0.5g) · TestFlight internal→external + gönderim kapısı (1.5g)

**Kamera kapısı ↔ izinsiz gösteri çelişkisi — hakem kararı:** Kamera kapısı kazanır (UX P0). Yayın'ın "iki YZ düşmanı dövüşsün" modu **yapılmaz** (1789-1793 doğrudan `P`'yi hedefliyor, hedef sahibi soyutlaması yeni iş). Yerine: izin reddi ekranında **"Nasıl oynanıyor" düğmesi** → M5'te zaten çekilen 20 saniyelik App Preview videosunu uygulama içinde oynatır. Sıfır yeni oynanış kodu, aynı 4.2 azaltması, ve reviewer boş ekran görmüyor.

**Bitti-ölçütü:**
- İkon ve splash Capacitor markasını içermiyor; açılışta beyaz kare sayısı 240 fps kayıtta **0**.
- Uçak modunda temiz kurulumda: açılıyor, kalibre ediliyor, bir karşılaşma sonuna kadar oynanıyor, 10 dakikada uygulamaya ait **0 bayt** ağ trafiği.
- `find ios -name "*.xcprivacy"` uygulama hedefinde 1 dosya; Privacy Report'ta "Tracking: No", toplanan veri listesi boş; ITMS-91xxx uyarısı yok.
- `nubittech.github.io/el-buyucusu` artık oyunu **sunmuyor**; gizlilik politikası URL'i 200 dönüyor ve `muhurProto`/`muhurKal2` anahtarlarını adıyla anıyor.
- iPad'e kurulum başarısız; telefon çevrilince arayüz dönmüyor; desteklenen en düşük iOS fiilen test edilmiş.
- Kör test: 5 kişiye mağaza sayfası sessiz ve 3 saniye gösterilir, ≥4'ü "el hareketiyle oynanıyor" diyor.
- TestFlight external: ≥8 farklı el, ≥4 farklı oda; her testçi kalibrasyonu tamamlayıp **en az bir karşılaşmayı sonuna kadar** oynayabiliyor. Beta App Review geçildi.
- 15 dakikalık kesintisiz oyun: 15. dakikanın ortalama fps'i 1. dakikanın ≥ %90'ı.

---

### TOPLAM

**65 iş günü saf kapsam.** Tek geliştirici + YZ asistanı için gerçekçi takvim: fizibilite denetiminin 1.8-2.2× çarpanıyla **117-143 takvim iş günü ≈ 5.5-7 ay**. Bu sayı hata ayıklamayı, cihaz iterasyonunu ve App Review kuyruğunu içerir. 197 günlük ham toplam 132 gün kesildi; kesilenlerin gerekçesi §2'de.

---

## 4. İLK 2 HAFTA — gün gün

| Gün | İş | Somut çıktı |
|---|---|---|
| **1** | Kare bütçesi enstrümantasyonu — kod. `tick()` içine ağır/boş kare ayrımı, `performance.now()` damgaları, p50/p95/p99 halka tamponu. `wkwebview-test.html`'e stres modu. | `tools/kare.js` + oyun içi sayaç |
| **2** | Cihazda ölçüm. iPhone 16 Pro Max, 120 sn, 1 düşman + mermi + telegraf açık. Çıkarım dışı işin p95'i yazılır. | Sayı deposunda: `OLCUM-kare.md` yerine commit gövdesi |
| **3** | `tick()` try/catch, `window.onerror`, `unhandledrejection`, `1489`'daki boş catch'in doldurulması, 20 kayıtlık localStorage halkası, `tani.html`. | Yapay istisna kare döngüsünü durdurmuyor |
| **4** | Kayıt katmanı v1: tek anahtar `gn.v1`, şema sürümü, `mu/sd` uzunluk doğrulaması, bozuk kayıtta güvenli red + yeniden kalibrasyona yönlendirme. `ilerleme:{}` boş dondurulur. | Node regresyon testi: 7 uzunluklu vektörle `siniflandir()` null |
| **5** | Kayıt katmanı bitiş: `muhurProto`/`muhurKal2` → `gn.v1` göçü, cihazda doğrulama, kalibrasyonu kaybetmeden yükseltme. | Eski kurulumdan yükseltme kalibrasyonu koruyor |
| **6** | Sürüm damgası tek kaynak (`package.json` → `paketle.js` → `MARKETING_VERSION` + oyun içi + `muhur.js?v=`). `TEST=1` Release kilidi. `wkwebview-test.html` paketten çıkar. `LICENSE` + `NOTICE` (MediaPipe Apache-2.0 §4). | `paketle.js` uyuşmazlıkta exit 1 |
| **7** | Telemetri halka tamponu: atış, isabet, düşman durumu, çarpışma sonucu, el görünürlük aralıkları, tur süresi. `tani.html`'den JSON dökümü. `tools/tempo.js`. | 10 dk oynanıştan JSON |
| **8** | **Element döngüsü onarımı.** `muhur.js:220-227` delme çıkar, `kalanGuc = |fark| × delme`. `index.html:1854` AVANTAJ doğrudan isabete. `tools/denge.js` yazılır. | `denge.js`: beş element 1/4 |
| **9** | **Telegraf çöküşü onarımı** (`1796` civarı, LOS geçişinde cd tabanı) + **nişan payı** (`ates()` kesişim hesabı, `S.aim` ölü kod silinir). | Siper çıkışında telegraf hep tam; Toprak hareketli hedefe isabet ediyor |
| **10** | **Kol iner**: `1502` → `cancelVotes()`, şarj korunur. Ardından cihazda 20 dakikalık oynanış + telemetri okuması: el-yukarıda aralıkları, düşman durumuna göre atış dağılımı. | M1'in geri kalanı için ölçülmüş taban |

Gün 8-10 M1'in ilk üç kalemidir; M0 gün 7'de biter. Bu sıralama bilinçli: **döngü onarımı, telemetri kurulduktan sonra** yapılıyor ki "önce/sonra" karşılaştırması sayıyla yapılabilsin.

---

## 5. VARLIK KAYNAKLARI

### Kesin (ad, lisans, maliyet biliniyor)

| Varlık | Lisans | Maliyet | Not |
|---|---|---|---|
| Web Audio API | platform | 0 | Ses altyapısının tamamı bununla yazılır |
| MediaPipe Tasks Vision (vendorlanmış) | Apache-2.0 | 0 | **`NOTICE` dosyası eklenecek — §4 gereği, bugün yok** |
| @capacitor/core · /ios · /cli 8.5.0 | MIT | 0 | Kurulu |
| Apple Developer Program | — | 99 USD/yıl | Takım GHWW9UP94F aktif; **yenileme tarihi doğrulanmalı** |
| Blender 4.x | GPL | 0 | Yalnız ikon/splash için; karakter işi v1.0'da yok |
| Kenney.nl UI Audio / Impact Sounds | CC0 | 0 | Onay/red/şarj sesleri için birinci aday. Arcade tarzı — yalnız arayüz katmanı |
| Sonniss GDC Game Audio Bundle | royalty-free, ticari serbest, atıf yok, **yeniden dağıtım yasak** | 0 | Telegraf ve dövüş sesleri için ana ham malzeme. **İndirilen yılın lisans PDF'i okunup `SES-LISANS.md`'ye tarihiyle işlenmeli** |
| freesound.org | dosya başına değişir | 0 | **Yalnız CC0 ve CC-BY filtresiyle.** CC-BY-NC ve Sampling+ ticari kullanımda kırmızı çizgi, arama sonuçlarında yan yana çıkıyorlar |
| Parçacık/VFX dokusu | — | 0 bayt | `gl_PointCoord` + yarıçap maskesi (`index.html:663-666` kalıbı). Hiçbir doku dosyası yok |
| El şekli ikonları | — | ~2 KB | `tools/genproto.js:8-25` sentetik iskeletleri JSON'a dökülüp `BONES`/`drawPip` ile çizilir. Dış varlık yok |
| iOS Ekran Kaydı + iMovie | — | 0 | App Preview ve ekran görüntüleri; cihaz 440×956@3x = 1320×2868, 6.9" yuvasıyla birebir |

### ARAŞTIRILMALI (uydurmuyorum)

- **`@capacitor/haptics` sürüm numarası.** MIT, ücretsiz, kurulu değil. Capacitor 8.5.0 ile uyumlu sürüm npm'den doğrulanmalı. Bu, M4'ün ilk saatinde yapılacak ilk iş.
- **`@capacitor/app` ile `app-settings:` şemasının iOS'ta açılıp açılmadığı.** Açılmıyorsa "Ayarları Aç" düğmesi kalkar, yerine metinle yol tarifi (ek maliyet 0).
- **`hand_landmarker.task` model kartı kullanım şartları.** Kütüphane Apache-2.0 ama model dosyasının şartları farklı olabilir. Gönderimden önce okunmalı.
- **WKWebView'da Opus/Ogg çözülüyor mu.** Çözülüyorsa aynı kalitede ~%30 paket tasarrufu. Ölçülmeden AAC-LC (.m4a) taban kabul edilir. M4 SPIKE'ında ölçülür.
- **Eski iOS simülatör runtime'ı indirilebilirliği.** Dağıtım hedefi kararı buna bağlı (`xcrun simctl list runtimes` şu an yalnız 26.2 gösteriyor).
- **ZapSplat / Epidemic Sound / Artlist fiyat ve kapsam.** Kritik uyarı: bu servislerin standart abonelikleri geleneksel olarak video içeriğine yöneliktir; lisans metninde **"video games" / "interactive media"** ibaresi yazılı olarak doğrulanmadan satın alınmamalı.
- **Test cihazı (375×667 pt sınıfı, iPhone SE 3 / iPhone 13) ikinci el fiyatı.** `.rules` max-width 340px + `.ov2` padding 2×28 = 396 px; 375 pt genişlikte taşıyor. TestFlight testçileri tanıma başarısını verir ama fps/termal veremez.

### BİLİNÇLİ OLARAK KULLANILMAYANLAR

Howler.js (asıl zor problem AVAudioSession, onu çözmüyor) · three.js / gl-matrix (motorsuz mimariye aykırı) · Sentry / Crashlytics (bizim arıza biçimimiz donmuş rAF, native raporlayıcı görmez; ayrıca "Veri Toplanmıyor" beyanını bozar) · üçüncü taraf analitik (kamera izni alan uygulamada gizlilik + App Store beyan yükü) · üçüncü taraf parçacık kütüphanesi (`progKar` 635-704 boru hattının cihazda çalışan kanıtı).

---

## 6. RİSK KAYDI — en tehlikeli beş

**R1 · Kare bütçesi zaten dolu çıkar.** *Etki: yıkıcı.* Fizibilite denetiminin aritmetiği net: çıkarım senkron ve 30 Hz olduğu için ağır karede geriye 16.4−12.6 = 3.8 ms (p95'te 0.4 ms) kalıyor. Oyun gerçekten 60 fps sürdürüyorsa çizim+mantık zaten <4 ms'dir ve **yeni sistem için yer yoktur**. *Azaltma:* M0-1 her şeyin önünde (Gün 1-2). Bütçe dolu çıkarsa sırayla ve **tek tek** ölçerek: (a) GL tuvalinin DPR'si 2→1.5 — **sadece bu, aynı anda render ölçeği düşürülmez** (iki plan aynı pikseli iki kez satıyordu; efektif 0.60 ölçek 3× ekranda kabul edilemez), 2B kaplama tuvali DPR 2'de kalır (`index.html:209-210` ayrıştırılır), (b) bloom 1/4 → 1/8 (hale genişler, 60b5761 bunu zaten sanat kazancı sayıyor), (c) `#kagit` soft-light katmanı (1.68 Mpx bileşik geçiş) kaldırılır. Her adımdan sonra yeniden ölçülür; kazanç yoksa geri alınır.

**R2 · App Store Guideline 4.2 reddi.** *Etki: yüksek, olasılık gerçek.* Bugün ikonda ve splash'te Capacitor'ın kendi logosu var, `wkwebview-test.html` pakette, ve **aynı oyun `nubittech.github.io/el-buyucusu` adresinde HTTP 200 ile yayında**. *Azaltma:* M5'in tamamı bu risk için. Savunmanın omurgası ölçülebilir: kamera + cihaz-içi ML + haptik üçlüsü, sıfır ağ trafiği (uçak modunda tam oynanabilirlik), beş rakiplik bitirilebilir merdiven, kalıcı ilerleme. Web kopyası kapatılır. Red gelirse cevap **gönderimden önce** yazılmış olur (gönderim kapısı kalemi).

**R3 · Reviewer kalibrasyon yapmadan oynar, tanıma çalışmaz → "we were unable to review" (2.1).** *Etki: yüksek.* `muhur.js:102` öğrenilmiş mod ancak altı poz da kayıtlıysa açılıyor; aksi halde sentetik `PROTO0` kullanılıyor ve `TASARIM.md §9` sentetik düzeneğin gerçeği tahmin etmeyi bıraktığını yazıyor. *Azaltma:* M3'ün öğretici akışı kalibrasyonu **zorunlu ve kaçınılmaz** yapıyor (kayıt-önce-onay-sonra sırası kilitlenmeyi de çözüyor); İngilizce review notes bu akışı tarif eder; demo video reviewer'ın elini nasıl tutacağını gösterir.

**R4 · Poz geçiş maliyeti ölçülmemiş; delme kaldırılınca yeni baskın strateji Su olur.** *Etki: orta-yüksek.* `POSES` (muhur.js:16-22): `water` = işaret+orta+yüzük, `gun` = işaret+orta → **tek parmaklık** geçiş. `bolt` = başparmak+serçe → **üç parmaklık** geçiş, ve ara durumlar `earth` (işaret+serçe) olarak okunabilir; 260 ms'lik oy penceresinde bu şarjı **değiştirir** (isimsiz bir hata modu). Delme etkin güçten çıkınca elementler havada eşitlenir ve geriye kalan ayrım hız/hasar/takip + **parmak maliyeti** olur. *Azaltma:* M1 sonunda 1 günlük ölçüm: 5×5 poz geçiş matrisi, cihazda, geçiş başına 20 deneme — süre ve yanlış tetikleme oranı. Sonuç merdiven tasarımına girer; gerekirse `bolt` pozu yeniden atanır (bu, kalibrasyon şeması v1'de sürümlü olduğu için güvenli).

**R5 · Kol yorgunluğu çözülemez ve oyun fiziksel olarak oynanamaz kalır.** *Etki: yüksek.* Telefon bir elde, mühür eli havada — **iki kol yukarıda**. Kreatif'in 40-60 sn tur + ≥10 sn boşluk önerisi yalnız %17 rahatlama. *Azaltma:* asıl çözüm M1'deki tek satır — `1502`'de el kaybında şarj **iptal edilmez**, yalnız oy tamponu temizlenir. Böylece el yalnız mühür yaparken ve ateşlerken kadrajda olmak zorunda; aradaki manevra başparmakla yapılır ve kol iner. Tur arası boşluk ikinci savunma hattı olur, birinci değil. Ölçüt: 20 dakikalık oturumda kesintisiz el-yukarıda süresi hiçbir noktada 45 sn'yi aşmıyor. **Bu ölçüt tutmazsa v1.0 kapsamı yeniden açılır** — jest oyununda oynanamayan bir format sanat tercihi değil, kusurdur.

---

## 7. KULLANICININ KENDİSİNİN YAPMASI GEREKENLER

Bunların hiçbirini ben ya da asistan yapamaz — hesap, para, imza veya senin kararın gerekiyor.

1. **Apple Developer Program yenileme tarihini ve hesap rolünü doğrula.** Takım GHWW9UP94F ("Mert Bayram") aktif görünüyor ama dağıtım sertifikası üretmek için Account Holder ya da Admin rolü gerekiyor. Anahtarlıkta **"Apple Distribution" sertifikası yok** — yalnız iki "Apple Development" kimliği var.
2. **App Store Connect'te `com.nubittech.golgeninja` kaydını sen aç.** Elimizdeki profil joker (`iOS Team Provisioning Profile: *`); açık bir App ID kaydı yok.
3. **AB tacir (DSA) beyanı kararını ver.** Bireysel hesapta mağazada satıcı adı senin adın olur ve DSA beyanı **kişisel adres ve telefonunu herkese açık yapar**. Şirket hesabına geçmek istiyorsan bu, gönderimden önce halledilmeli — sonradan taşımak zor.
4. **GitHub Pages kararını ver.** `nubittech.github.io/el-buyucusu` şu an oyunun oynanabilir kopyasını sunuyor ve depo açık. Kapatmak senin deponun kararı; ben yalnız 4.2 riskini bildiriyorum.
5. **`nosimd` wasm'ı silmek için App Store Connect'teki iOS sürüm dağılımına bak** (varsa geçmiş uygulamalarından). iOS<16.4 payı önemsizse dağıtım hedefi yükseltilir, 8.86 MB düşer ve hiç test etmediğimiz bir kod yolu ortadan kalkar.
6. **Ses kaynağı bütçesini onayla.** Ücretsiz yol (Sonniss + CC0 freesound + Kenney) 0 TL ama zaman alır. Ücretli hedefli paket (yalnız telegraf + çarpışma seti) fiyatı araştırılmalı — satın alma kararı senin.
7. **10 gözlemli test kullanıcısı bul** (M3 ölçütü) ve **≥8 farklı el / ≥4 farklı oda** için TestFlight external testçisi topla (M5 ölçütü). Tanıdık çevreyle maliyet 0.
8. **Karakter modelcisi tutulacak mı kararı — v1.0 için HAYIR.** Bu planda iskeletli karakter kesildi. Yine de teklif almak istersen kapsam sabittir: tek karakter, ≤3.200 üçgen, ≤24 kemik, köşe rengi (doku YOK), 6 klip, .glb. Aynı kapsam üç yere verilirse fiyatlar karşılaştırılabilir olur.

---

## 8. AÇIK SORULAR — cevabı planı değiştirir

1. **Emoji kalsın mı?** Plan "kalsın" diyor: 13 px, `alpha = max(0.25, 14/z)` ile uzakta sönüyor, ve bilgiyi bedavaya taşıyor. Ama emojiyi kaldırmak (ya da yalnız telegraf sırasında göstermek) elementi gerçek bir okumaya çevirir — ve o zaman Sanat/VFX/Ses'in kesilen 12 günü **geri gelir**. Karar M1 telemetrisinden sonra verilmeli: doğru karşılık oranı zaten %80'in üstündeyse emoji koltuk değneği demektir. **Ölçmeden karar verme.**
2. **Şarj gerçekten süresiz mi kalsın?** `TASARIM.md §10-4` bunu açık soru olarak bırakmış. Ben süresiz diyorum (kol yorgunluğu, R5). Bedeli düşmanın element değiştirmesiyle ödeniyor. Alternatif — şarjın 8-10 saniyede sönmesi — refleks baskısı yaratır ama kolu yukarıda tutmaya zorlar. Bu ikisi **doğrudan çelişiyor** ve ikisi birden olamaz.
3. **Merdiven bitince ne var?** Sonsuz mod kesildi. "Daha zor merdiven tekrarı" mı, yoksa v1.0 beş rakiple bitip orada mı duracak? Cevap bitiş ekranının ve mağaza metninin ne vaat edeceğini belirliyor.
4. **Tanıtım/kayıt modu oyun içinde kalsın mı?** Mağaza görselleri için büyütülmüş PiP gerekiyor (`drawPip` 1509-1525 zaten iskeleti mührün renginde çiziyor). Bu bileşen ürüne de girerse oyun içi "elimi görüyor mu" sorusunu çözer ama ekran alanı yer. Kalırsa duraklatma ekranına konur.
5. **Kalibrasyonu localStorage dışına yedekleyelim mi?** `@capacitor/filesystem` (MIT, 0 TL) aday. Kalibrasyon kaybı oyunu oynanamaz yapıyor ve WKWebView localStorage'ının depolama baskısı altında temizlenme riski var. M0-4 sırasında ölçülüp karara bağlanacak; gereksizse eklenmeyecek.
6. **Poz geçiş matrisi `bolt`u kullanılamaz gösterirse ne yapılır?** Pozu yeniden atamak (örneğin `bolt` = başparmak+işaret+serçe) tanıyıcıyı ve kalibrasyonu etkiler. Şema sürümlü olduğu için teknik olarak güvenli ama **kullanıcı yeniden kalibre etmek zorunda kalır**. Bu bedel kabul edilebilir mi?

---

*Bu plan yedi alan planından 132 günlük iş kesti, beş kalemdeki mükerrer sayımı (haptik, sürüm damgası, kamera kapısı, kare ölçümü, telemetri) tekilleştirdi ve iki denetimin işaret ettiği beş çelişkiyi karara bağladı. Kesilmeyen tek denetçi önerisi `G.score`'un tamamen silinmesiydi; gerekçesi §2'de. Plandaki her sayı ya dosyadan okundu ya bu oturumda betikle üretildi.*