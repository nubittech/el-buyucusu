# Gölge Ninja — Element Dövüş Sistemi

Tasarım dökümanı · v1 · 2 Ağustos 2026

Bu döküman prototipin üstüne gelen çekirdek dövüş sisteminin tasarımıdır.

---

## 0. Uygulama durumu — neresi CANLI, neresi tasarım

Faz 1 ve 2 tamamlandı. Oynanan sürümle bu dökümanın bazı bölümleri bilinçli
olarak ayrıştı; aşağıdaki tablo hangisinin geçerli olduğunu söyler.

| Konu | Dökümanda | **Canlı sürümde** |
|---|---|---|
| Mühür dizisi / kombo (3.4) | mühürler dizilir, 👉 kapatır | **KAPALI** — tek mühür şarj eder, 👉 ateşler, ateşleyince şarj biter |
| Beceri kademeleri (3.6) | 4 kademe, 20 beceri | yalnız **Kademe 1** (5 temel saldırı) erişilebilir |
| Aynı anda düşman (6) | en fazla 3 | **1** — tek tek geliyorlar |
| Ateşleme | dizi kapanınca otomatik | 👉 **tutulan tetik**: şarj dolu + silah pozu = atış |
| Kademe 1 şarjı | 350 ms | **250 ms** (ölçümle: 350 tek başına darboğazdı) |
| Tanıma | tek örnekli prototip | **öğrenilmiş kalibrasyon** — her poz kullanıcının elinden kaydediliyor, sigma cinsinden sınıflandırma |
| Poz onayı | kesintisiz 150 ms | **260 ms'lik oy penceresinde çoğunluk** (hareket toleransı için) |

Kombo mantığı **silinmedi**, `muhur.js` içinde `KOMBO=false` bayrağıyla kapalı.
Beceri tablosu, dizi motoru ve çarpışma çözümü olduğu gibi duruyor; tanıma
güvenilirliği yeterli görülünce tek satırla geri açılır. Bu yüzden 3.4 ve 3.6
bölümleri silinmedi — geri dönülecek tasarım onlar.

**Neden kapatıldı:** tanıma gerçek kamerada zorlanırken kombo her ek mühürle
hata olasılığını çarpıyordu. Önce tek mühür güvenilir hale getirildi.

---

## 1. Tasarım hedefi

Refleks ve okuma üstüne kurulu, **tekli düello** hissi veren bir el-jesti dövüş oyunu.
Oyuncu kamerayla el mührü yapar, rakibinin mührünü okur, doğru karşılığı yetiştirmeye
çalışır. Mermi yağmuru yok; her atış bir karar.

**Mevcut prototipten kalanlar:** render motoru, ninja modelleri (oyuncu + düşman),
arena ve siperler, oto-kilit kamera, MediaPipe el takibi altyapısı, düşmanın kol
kaldırma telegrafı.

**Kaldırılanlar:** kalkan (✋), tek tip ateş topu, 3 atışlık şarj sistemi, düşman spam'i.

---

## 2. Elementler ve avantaj döngüsü

Beş element, kapalı bir döngü. Her element **birini yener**, **birine yenilir**,
kalan **ikisine karşı nötrdür**.

```mermaid
graph LR
  A[🔥 Ateş] -->|yener| H[🌪 Hava]
  H -->|yener| Y[⚡ Yıldırım]
  Y -->|yener| T[🪨 Toprak]
  T -->|yener| S[💧 Su]
  S -->|yener| A
```

| Element | Yener | Yenilir | Nötr |
|---|---|---|---|
| 🔥 Ateş | Hava | Su | Yıldırım, Toprak |
| 🌪 Hava | Yıldırım | Ateş | Toprak, Su |
| ⚡ Yıldırım | Toprak | Hava | Su, Ateş |
| 🪨 Toprak | Su | Yıldırım | Ateş, Hava |
| 💧 Su | Ateş | Toprak | Hava, Yıldırım |

Nötr eşleşmelerin varlığı bilinçli: her karşılaşma taş-kağıt-makasla bitmesin,
bazen ham güç ve ustalık belirlesin.

---

## 3. Mühür sistemi

### 3.1 Beş mühür

| Element | Mühür | El şekli |
|---|---|---|
| 🔥 Ateş | 👌 **Baş parmak + işaret** | Uçlar birleşik, diğer üç parmak açık |
| 🌪 Hava | 🖐 **Açık avuç** | Beş parmak açık ve ayrık, avuç kameraya dönük |
| 💧 Su | 🤟 **Üç parmak** | İşaret + orta + yüzük açık; serçe ve baş parmak kapalı |
| ⚡ Yıldırım | 🤙 **Baş parmak + serçe** | İkisi açık, diğer üç parmak kapalı |
| 🪨 Toprak | 🤘 **İşaret + serçe (rock)** | İkisi açık, orta ve yüzük kapalı |

Bu setin ayırt edici gücü şurada: mühürler **hangi parmakların açık olduğunda**
ayrışıyor — MediaPipe'ın en güvenilir okuduğu sinyal bu. Açıklık deseni (işaret,
orta, yüzük, serçe) olarak:

```
Hava     1 1 1 1        Su       1 1 1 0
Toprak   1 0 0 1        Yıldırım 0 0 0 1  (+ baş parmak açık)
Ateş     0 1 1 1        (+ baş–işaret teması)
```

Yalnız iki çift tek parmakla ayrılıyor — Hava/Su (serçe) ve Toprak/Yıldırım (işaret) —
ama ikisinde de **baş parmak konumu** ikinci bir bağımsız sinyal veriyor: Yıldırım'da
baş parmak yana açık, Toprak'ta avuçta kapalı.

### 3.2 Ölçülen dayanıklılık

Seçim tahminle değil ölçümle doğrulandı: her mühür sentetik el iskeletiyle üretildi,
MediaPipe hata modeli altında 2500 örnek/mühür sınıflandırıldı.

Hata modeli kritik: bağımsız gauss gürültü MediaPipe'ı temsil etmiyor. Gerçekte baş
parmağın **örttüğü** parmak ucu görünmez olur, ağ onu tahmin eder ve hata hem büyür
hem de parmağın kökü yönünde sistematik kayar. Ölçüm bu kapanma etkisiyle yapıldı.

| Landmark gürültüsü | Doğruluk | En zayıf çift |
|---|---|---|
| σ = %2.5 | %100.0 | — |
| σ = %4.5 | %100.0 | — |
| σ = %7.0 | %99.4 | Ateş ↔ Hava (%98.8) |
| σ = %10.0 | %96.0 | Ateş ↔ Hava (%93.8) |

**Tek zayıf nokta Ateş ↔ Hava.** Sebebi: Ateş'te işaret parmağı baş parmağa değmek
için bükülür ama diğer üçü açıktır; ağır gürültüde işaret "açık" okunursa el açık
avuca benzer. Panzehir zaten elde: baş parmak–işaret ucu mesafesi (temas sinyali)
bağımsız ve çok güçlü bir ayraç, sınıflandırıcıda ağırlığı yüksek tutulacak.

**"Üç parmak" hangi üçü?** İki okuma da ölçüldü:

| Okuma | σ=%7 | σ=%10 |
|---|---|---|
| İşaret + orta + yüzük | **%99.4** | **%96.0** |
| Orta + yüzük + serçe | %96.8 | %90.0 |

İşaret+orta+yüzük seçildi: hem daha doğal hem ölçümde belirgin biçimde daha sağlam
(ikinci okuma Ateş ile karışıyor, çünkü ikisinde de işaret parmağı kapalı görünüyor).

> **Uyarı:** Bu rakamlar sentetik iskelet üzerinden. Gerçek MediaPipe hatası bu modelin
> tam kopyası değil. Faz 1'de gerçek kamerayla doğrulanmadan Faz 2'ye geçilmeyecek.

### 3.3 Tanıma kuralları

- **Zaman kilidi:** mühür ~150 ms sabit tutulmadan onaylanmaz. `v5.2`'de kalkan için
  yazılan asimetrik sönümleme aynen kullanılır: tutarken tek kare kaybı mührü düşürmez.
- **Ayırt edici sinyaller:** dört parmağın uzama oranı (hangi parmaklar açık) +
  baş parmak–işaret ucu mesafesi (temas var mı) + baş parmak açıklığı (yana açık mı,
  avuçta mı). `v5.2`'deki `analyzeHand` metrikleri doğrudan yeniden kullanılabilir;
  açık avuç (Hava) zaten kalibre edilmiş durumda.
- **Belirsizlik reddi:** en yakın iki prototip arasındaki fark belli bir eşiğin
  altındaysa **hiçbir mühür tetiklenmez**. Yanlış element atmaktansa hiç atmamak
  daha iyi — kalkandaki asıl sorun buydu.
- **Geçiş karesi bağışıklığı:** bir mühürden diğerine geçerken aradaki şekiller
  zaman kilidini dolduramadığı için tetiklenmez.

### 3.4 Mühür dizisi, silah pozu ve ateşleme

Saldırı tek mühürle bitmiyor. Mühürler **arka arkaya** yapılır, dizinin tamamı hangi
beceriyi ürettiğini belirler. Değişmeyen tek şey dizinin **kapatıcısı**:

> 👉 **Silah pozu** — işaret + orta parmak açık, yüzük ve serçe kapalı, baş parmak dik.
> Bu poz görüldüğü an mühür seti **kapanır** ve el ateşlemeye hazır hale gelir.

**Akış**

1. **Diz** — element mühürleri sırayla yapılır (🔥 · 💧 · 🤘 …). Her mühür zaman
   kilidiyle onaylanır ve diziye yazılır.
2. **Kapat** — 👉 silah pozu diziyi kapatır.
3. **Eşleştir** — kapanan dizi beceri tablosunda aranır.
4. **Yüklen** — eşleşme varsa beceri yüklenir; el silah tutuşunda bekler, elde
   elementin rengiyle enerji toplanır (v5.2'deki şarj görselinin devamı).
5. **Ateşle** — silah tutuşundan tetikleme ile atış çıkar.

**Kurallar**

- **Eşleşme yoksa** beceri yüklenmez: dizi silinir ve kısa bir toparlanma gecikmesi
  (~0.4 sn) uygulanır. Rastgele mühür savurmak cezalandırılır.
- **Diziler arası zaman aşımı:** iki mühür arası **900 ms**'yi geçerse dizi sıfırlanır.
- **En kısa dizi tek mühürdür:** 🔥 → 👉 = o elementin temel saldırısı. Yeni başlayan
  oyuncu tek mühürle oynayabilir; uzun diziler bileşik ve güçlü becerileri açar.
- **Silah pozu nişan da alır.** İşaret parmağının yönü hedefi belirler — `v5.2`'de
  zaten böyle çalışıyor, korunacak.

**Ölçüm — silah pozu diğer beş mühürle karışıyor mu?**

Silah dizinin kapatıcısı olduğu için her dizinin sonunda geliyor; bir element
mühründen silaha geçiş sık ve hızlı. En riskli görünen geçiş 💧 Su → 👉 Silah, çünkü
aradaki tek fark yüzük parmağının kapanması. Ölçüldü:

| | σ=%2.5 | σ=%4.5 | σ=%7.0 |
|---|---|---|---|
| 6 sınıflı doğruluk | %100.0 | %100.0 | %99.0 |
| **Su ↔ Silah ayrımı** | **%100.0** | **%100.0** | **%100.0** |

Risk gerçekleşmedi: Su'da yüzük parmağı tam açık, silahta tam kapalı — bu marjinal
değil, güçlü bir fark. Silah pozunun eklenmesi setin genel doğruluğunu düşürmüyor.

**Baş parmak dik olmalı.** İki tutuş karşılaştırıldı; baş parmak dik (klasik tabanca)
olan, kapalı olandan daha iyi:

| Silah tutuşu | Toprak 🤘 doğruluğu (σ=%7) |
|---|---|
| Baş parmak **dik** 👉 | %99.8 |
| Baş parmak kapalı | %98.3 |

Baş parmak kapalı olduğunda silah, Toprak (işaret+serçe) ile karışmaya başlıyor —
ikisi de baş parmağı avuçta tutan, iki parmağı açık pozlar haline geliyor.

### 3.5 Savunma mührü YOK — beş elementin hepsi saldırıdır

Ayrı bir savunma mührü, savunma modu ya da kalkan yok. **Beş mühür de saldırı üretir.**
Gelen bir saldırıya karşı yalnızca iki cevap vardır:

| Cevap | Nasıl | Maliyeti |
|---|---|---|
| **Karşı atış** | Kendi saldırını gelenin içine at — havada çarpışır (bkz. 4.2) | Doğru elementi seçmek + yetiştirmek gerekir |
| **Siper** | Arena objesinin arkasına gir | Konumunu kaybedersin, saldıramazsın |

Bu, savunmayı ayrı bir sistem olmaktan çıkarıp **saldırının kendisine** gömüyor:
karşılık vermek, aynı zamanda karşı saldırı başlatmaktır. Nişan alıp doğru elementi
seçmek hem savunma hem hücum hamlesi olur — pasif bir "bloke et" düğmesi yok.

Doğrudan sonucu: **tanınması gereken jest kümesi 5 mühür + silah pozu ile sınırlı
kalıyor.** Bağlam ayrımı da ortadan kalkıyor; her mühür her zaman aynı şeyi yapar.

**Tek elementli oyuncu ne yapar?** Karşı atış yalnızca kendi elementinin yendiği ya da
nötr olduğu saldırılara karşı işe yarar; kendisini yenen elemente karşı çarpışmayı
kaybeder. O durumda siper tek seçenektir. Bu bir eksiklik değil, ilerlemenin motoru:
ikinci elementi açmanın somut sebebi tam olarak budur.

> **Not:** "Karşı elementin mührüyle savunma" fikri tasarımdan çıkarıldı. İleride
> geri gelirse, mevcut çarpışma çözümü zaten altyapısını sağlıyor.

### 3.6 Beceri tablosu — ilk taslak

**Tasarım ilkesi: ezber değil türetme.** İki mühürlük 25 kombinasyonu tek tek
ezberletmek yerine, beceriler **döngüdeki ilişkiden** türetiliyor. Oyuncu tabloyu
değil üç kuralı öğreniyor:

> **Aynı element ×2** → güçlendirilmiş hâli
> **Yendiğin elementi ekle** → beslenmiş: hızlı ve delici
> **Seni yenen elementi ekle** → füzyon: hasar değil **kontrol**

#### Kademe 1 — Temel saldırılar (1 mühür)

Elementler burada birbirinden ayrışıyor; fark yalnızca avantaj döngüsünde değil.

| Dizi | Beceri | Hız | Hasar | Delme | Not |
|---|---|---|---|---|---|
| 🔥 👉 | **Alev Oku** | orta | orta | orta | dengeli |
| 🌪 👉 | **Rüzgar Bıçağı** | çok hızlı | düşük | düşük | taciz, kesme |
| 💧 👉 | **Su Kırbacı** | orta | orta | düşük | hafif hedef takibi |
| ⚡ 👉 | **Şimşek Ucu** | anlık | düşük | yüksek | kaçması çok zor |
| 🪨 👉 | **Taş Mermisi** | yavaş | yüksek | çok yüksek | görülür ama durdurulamaz |

#### Kademe 2A — Güçlendirilmiş (aynı element ×2)

| Dizi | Beceri | Etki |
|---|---|---|
| 🔥🔥 👉 | **Ejder Nefesi** | geniş koni, kısa menzil, çok yüksek hasar |
| 🌪🌪 👉 | **Kasırga** | iter — düşmanı siperin arkasından söker çıkarır |
| 💧💧 👉 | **Sel Dalgası** | geniş cephe, isabet edeni yavaşlatır |
| ⚡⚡ 👉 | **Gök Mızrağı** | anlık, en yüksek delme değeri |
| 🪨🪨 👉 | **Taş Duvar** | *saldırı değil:* önüne geçici siper diker |

**Taş Duvar** tasarımın çekirdeğine bağlanıyor: en garanti savunma siper ise, kendi
siperini dikebilmek toprak ustasının imzası olur.

#### Kademe 2B — Beslenmiş (yendiğin elementi ekle)

İkinci element birinciyi besler. En hızlı yüklenen ve en delici kademe.

| Dizi | Beceri | Etki |
|---|---|---|
| 🔥→🌪 👉 | **Alev Fırtınası** | hava ateşi körükler: hızlı + yüksek delme |
| 🌪→⚡ 👉 | **Fırtına Sarmalı** | geniş, iter ve sersemletir |
| ⚡→🪨 👉 | **Şarapnel Yıldırımı** | çarpınca parçalanır, çoklu isabet |
| 🪨→💧 👉 | **Taş Seli** | yavaş ama neredeyse durdurulamaz |
| 💧→🔥 👉 | **Kaynar Dalga** | isabet sonrası yanma hasarı bırakır |

#### Kademe 2C — Füzyon (seni yenen elementi ekle)

Zıt elementi katmak dengesiz bir karışım üretir: ham hasar yerine **kontrol**.

| Dizi | Beceri | Etki |
|---|---|---|
| 🔥→💧 👉 | **Buhar Perdesi** | görüşü kapatır, düşmanın nişanını bozar |
| 🌪→🔥 👉 | **Kor Girdabı** | alan hasarı, bölgeyi bir süre kapatır |
| ⚡→🌪 👉 | **İyon Alanı** | yavaşlatır, düşmanın mühür süresini uzatır |
| 🪨→⚡ 👉 | **Sarsıntı** | sersemletir ve **siperleri yıkar** |
| 💧→🪨 👉 | **Bataklık** | zemini yavaşlatır, kaçışı keser |

#### Kademe 3 — Zincirleme üstünlük (3 mühür)

Döngüde **ardışık üç element** — yani her biri bir sonrakini yenen zincir. Beş zincir,
beş nihai beceri. Kural yine türetilebilir: *"yendiğin elementi, sonra onun yendiğini."*

| Dizi | Zincir | Beceri |
|---|---|---|
| 🔥🌪⚡ 👉 | Ateş > Hava > Yıldırım | **Yanan Gökyüzü** |
| 🌪⚡🪨 👉 | Hava > Yıldırım > Toprak | **Fırtına Kıyameti** |
| ⚡🪨💧 👉 | Yıldırım > Toprak > Su | **Yeraltı Sarsıntısı** |
| 🪨💧🔥 👉 | Toprak > Su > Ateş | **Volkan** |
| 💧🔥🌪 👉 | Su > Ateş > Hava | **Buhar Kasırgası** |

Nihai beceriler çok yüksek güç ve delme taşır ama uzun yüklenir — dövüşün ortasında
açıkta denenmez. **Siper arkasına geçip yüklemek** doğru kullanımdır; bu da siperi
yalnızca savunma değil, saldırı hazırlığı aracı yapar.

#### Yükleme süresi ve risk dengesi

| Dizi uzunluğu | Yükleme | Risk |
|---|---|---|
| 1 mühür | ~0.35 sn | güvenli, dövüşün ortasında yapılabilir |
| 2 mühür | ~0.70 sn | orta — açık alanda risklidir |
| 3 mühür | ~1.20 sn | siper gerektirir |

Düşman telegrafı ~1.1 sn olduğu için 3 mühürlük dizi açıkta neredeyse her zaman
cezalandırılır. Tempo böylece kendini dengeliyor.

#### Açılma sırası

Beceri yalnızca dizideki **tüm elementlerde ustalık varsa** yüklenir. Bu, ilerlemeyi
kendiliğinden kademelendiriyor:

1. Tek element seçilir → Kademe 1 ve o elementin Kademe 2A becerisi açıktır
2. İkinci element açılır → o ikilinin 2B / 2C becerileri gelir
3. Üçüncü element açılır → ilgili Kademe 3 zinciri açılır

#### Rezerve: nötr çiftler

Döngüde birbirini yenmeyen 10 ikili (🔥+⚡, 🌪+💧 gibi) bu taslakta boş bırakıldı.
İleride hareket, tuzak ve destek becerileri için ayrıldı — tablo ilk sürümde
öğrenilebilir kalsın diye.

---

## 4. Saldırı, güç ve havada çarpışma

### 4.1 Mermi özellikleri

Her mermi şunları taşır:

| Alan | Anlamı |
|---|---|
| `element` | Beş elementten biri |
| `guc` | Etkin güç = ustalık seviyesi + mühür kalitesi |
| `sahip` | Atan taraf (oyuncu / düşman kimliği) |

**Mühür kalitesi:** dizinin ne kadar temiz ve hızlı yapıldığı. Poz onayları
gecikmeli ya da sınırda geçtiyse kalite düşer. Aynı ustalıkta iki oyuncudan mührü
daha temiz yapan üstün gelir — mekanik böylece "kim daha iyi mühür yapıyor"a bağlanır.

### 4.2 Çarpışma çözümü

İki mermi havada karşılaştığında:

1. **Element ilişkisine göre etkin güç hesaplanır**
   - A, B'yi yeniyorsa: `farkA = gucA * AVANTAJ - gucB`   (`AVANTAJ` ≈ 1.6)
   - Nötr eşleşme: `farkA = gucA - gucB`
   - **Aynı element:** `farkA = gucA - gucB` — yani doğrudan ustalık ve mühür kalitesi
     karşılaşır. *"Aynı tür elementler çarpıştığında güçlü olan mühür diğerini deler."*

2. **Sonuç eşiğe göre belirlenir**

| Durum | Sonuç |
|---|---|
| `|fark|` küçük (< `NOTR_ESIK`) | **Nötrleşme** — iki mermi de yok olur, çarpışma patlaması |
| `fark` büyük | **Delip geçme** — kazanan mermi gücü azalarak yoluna devam eder ve kaybedenin sahibine **otomatik kilitlenir** |

Delip geçen mermi hedefe kilitlendiği için kaçınmanın tek yolu **sipere girmektir** —
bu da "en garanti savunma objelerin arkası" ilkesini mekanik olarak zorunlu kılar.

### 4.3 Karşı atış

Gelen bir saldırıyı durdurmanın tek aktif yolu kendi saldırını içine atmaktır; ayrı
bir karşılama mekaniği yok, yukarıdaki çarpışma kuralları aynen işler. Pratikte bu
şu anlama gelir: **nişan ve zamanlama, savunmanın kendisidir.** Geç kalırsan ya da
yanlış elementi seçersen mermi seni bulur — geriye siper kalır.

---

## 5. Ustalık ve ilerleme

- Her element için ayrı **ustalık seviyesi** (0–5).
- Oyuna başlarken oyuncu **bir element seçer**, o element seviye 1'de başlar.
- Ustalık artışı: o elementle isabet, kazanılan havada çarpışma, ve temiz mühür kalitesi.
- Yeni element açılışı: belli bir toplam ustalık + refleks eşiği (ortalama tepki süresi)
  aşıldığında bir sonraki element saldırıya açılır.
- Ustalık etkisi: mermi gücü, mühür onay penceresi genişliği, yükleme süresi.

---

## 5b. Enerji ve şarj — TASARLANDI, kodda YOK

Sınırsız güç yok. Her beceri enerji yiyor; enerji yalnız **durarak** doluyor.

### Sayılar (yeni hesap, stat yükseltmesi olmadan)

| | |
|---|---|
| Bar kapasitesi | **4 temel saldırı** |
| Tam dolum | **2.0 sn** → bir birim 500 ms |
| Hareketsizlik eşiği | **1.0 sn** (bu süre dolmadan şarj başlamaz) |
| Boştan ilk beceriye | 1.5 sn |
| Boştan mermi çıkana | 1.92–1.97 sn (üstüne ölçülmüş 417–467 ms atış maliyeti) |

**Kesinti cezası eşiktedir.** Şarj sırasında kaçarsan 1.0 sn'lik eşik sıfırlanır.
Bu yüzden kesintili şarj çok verimsiz — asıl karar "dişini sık ve dur" ile
"kaç, az enerjiyle idare et" arasındadır.

**Hasar şarjı BOZMAZ.** Yalnız hasar yersin. Baskı altında hiç şarj olamama
kilidini bu önlüyor; bedel canın, dolayısıyla karar can↔enerji takası oluyor.

### Beceri maliyetleri

| Zincir | Şarj süresi | Enerji | Güç katı |
|---|---|---|---|
| 1 mühür (Temel) | 250 ms | 1 birim | 1.0 |
| 2 mühür | 700 ms | 2 birim | 1.5–1.6 |
| 3 mühür (zincir) | 1200 ms | 3 birim | 2.6 |

**Dikkat — kombo hasar başına DAHA PAHALI.** Dolu bar 4 temel = 4.0 güç
verirken, 2 kombo = 3.2 güç veriyor. Yani kombolar ham hasarla kendini
ödemiyor; değerlerini **etkiden** almak zorundalar (alan reddi, gecikmeli
düşüş, takip, siper delme). Bu kasıtlıdır: kombo "daha çok vurmak" değil,
"başka türlü vurmak" olmalı.

### Blok penceresi — sayıların yarattığı gerginlik

Düşman telegrafı 1100 ms. Telegraf başladığı anda oyuncunun durumu:

| Oyuncunun hâli | Temiz okuma | %40 kare kaybı |
|---|---|---|
| Bar dolu, hareket halinde | +633 ms yetişir | +444 ms yetişir |
| Durdu, 1.0 sn geçti (şarj yeni başladı) | **+133 ms yetişir** | −56 ms yetişmez |
| Durdu, 0.5 sn geçti | −367 ms | −556 ms |
| Yeni durdu, bar boş | −867 ms | −1056 ms |

Yani "son anda blok" **+133 ms**'lik bir paya sıkışıyor: garanti değil, refleks.
Kötü tanıma koşulunda pencere kapanıyor — tanıma kalitesi doğrudan oynanışa
bağlanıyor.

### Stat yükseltmeleri neyi değiştirir

| Yükseltme | Etki |
|---|---|
| Bar büyür (4 → 6) | daha uzun baskı, daha seyrek durma |
| Dolum hızlanır (2.0 → 1.4 sn) | mola kısalır |
| **Eşik düşer (1.0 → 0.6 sn)** | **blok payı +400 ms** — en kritik yükseltme |

Üçüncüsü yukarıdaki tabloyu doğrudan değiştirir: eşik 0.6 sn'ye inerse kötü
koşulda bile blok yetişir. Stat yükseltmesi soyut bir sayı değil, "son anda
kurtulabilir miyim" oluyor.

### Açık denge sorunu

Düşman 2.4–3.0 sn'de bir atıyor. Tam bar için 3 sn durmak yalnız **1 atış**
yedirtiyor (ortalama 16 hasar / 100 can). Bu ucuz olabilir. Dengeleyen iki şey:
duran oyuncunun ıskalanmaması (düşman kestirme yapmıyor), ve her kaçışın
1 sn eşiğe mal olması.

**Eksik:** düşman YZ'si şarjı görmüyor. Bugün oyuncu *mühür* şarj ederken
sipere kaçıyor (`index.html` `oyuncuHazir`); enerji şarjında **tersini**
yapmalı — baskıyı artırmalı. Bu eklenmeden mekanik dişsiz kalır.

---

## 5c. İki mühürlük kombo tablosu — TASLAK, biri kodda

İlk mühür OKULU seçiyor, ikincisi onu büküyor. 25 ikilinin tamamı elle
tasarlanıyor: kural tabanlı üretim (aynı/yener/yenilir) yalnız hasar katsayısı
veriyordu, o da §5b'deki matematiğe takılıyor — dolu bar 4 temel = 4.0 güç,
2 kombo = 3.2 güç. **Kombo ham hasarla kendini ödemiyor, ETKİYLE ödemek
zorunda.** Aşağıdakilerin hiçbiri "daha çok vurur" değil.

Okul kimlikleri mermi verilerinden geliyor (`muhur.js` ELEM):

| Element | Veri | Okul |
|---|---|---|
| 🔥 Ateş | hız 15, hasar 17, delme 1.00 | yıkım, kalıcı alan |
| 🌪 Hava | hız 23, hasar 10, delme 0.70 | konum, itme |
| 💧 Su | hız 16, hasar 15, takip 0.40 | kontrol, yavaşlatma |
| ⚡ Yıldırım | hız 30, hasar 11, delme 1.55 | anlık, delme, zincir |
| 🪨 Toprak | hız 10, hasar 26, delme 1.85 | savunma, engel |

### Tablo

| Dizi | Ad | Etki | Gereken sistem |
|---|---|---|---|
| 🔥🔥 | Ejder Nefesi | yakın menzilde koni püskürtme, geniş ama kısa | koni isabet |
| 🔥🌪 | Alev Fırtınası | isabette çevreye sıçrayan alev | patlama yarıçapı |
| 🔥💧 | Buhar Perdesi | çarpma noktasında görüş kapatan bulut | **görüş engeli** |
| 🔥⚡ | **Gök Ateşi** ✅ | altında halka, 1 sn sonra düşer | gecikmeli alan ✅ |
| 🔥🪨 | Lav Tuzağı | yere yapışan yanan alan, 4 sn | **kalıcı alan** |
| 🌪🔥 | Ateş Rüzgârı | düz hatta iten dalga | **itme** |
| 🌪🌪 | Kasırga | çevresinde dönen alan, yaklaşanı iter | kalıcı alan + itme |
| 🌪💧 | Sis | geniş görüş kapatma, İKİ taraf da göremez | görüş engeli |
| 🌪⚡ | Şimşek Adımı | rakibin arkasına anında geçiş | **ışınlanma** |
| 🌪🪨 | Kum Fırtınası | ilerleyen alan, rakibi sürükler | hareketli alan + itme |
| 💧🔥 | Kaynar Sıçrama | takipli mermi, isabette yanma | takip (var) + zamanlı hasar |
| 💧🌪 | Dalga | geniş yay, siperden söker | koni + itme |
| 💧💧 | Girdap | merkeze çeken alan | kalıcı alan + çekme |
| 💧⚡ | İletken | ıslanan hedefe sonraki yıldırım ×2 | **durum etkisi** |
| 💧🪨 | Çamur | yayılan alan, üstünden geçen yavaşlar | kalıcı alan + yavaşlatma |
| ⚡🔥 | Plazma | anında ulaşan ışın, siperi deler | **hitscan** |
| ⚡🌪 | Zincir | ilk hedeften ikinciye sekme | **sekme** |
| ⚡💧 | Boşalma | ıslak hedefte alan hasarı | durum etkisi |
| ⚡⚡ | Yıldırım Fırtınası | üç hızlı ardışık vuruş | çoklu atış |
| ⚡🪨 | Sarsıntı | isabette rakip kısa süre mühür yapamaz | **sersemletme** |
| 🪨🔥 | Magma Blok | önüne duvar, dokunanı yakar | **engel yaratma** |
| 🪨🌪 | Toz | kaldırdığı toz görüşü kapatır | görüş engeli |
| 🪨💧 | Bataklık | yavaşlatan geniş alan | kalıcı alan + yavaşlatma |
| 🪨⚡ | Manyetik Taş | mermileri kendine çeker | **mermi yönlendirme** |
| 🪨🪨 | Duvar | mermi kesen geçici siper | engel yaratma |

### Gereken sistemler — asıl maliyet burada

25 beceri 25 iş değil; **9 sistem** artı üstlerine ayar. Sistemler:

| Sistem | Kaç beceri kullanıyor | Not |
|---|---|---|
| Gecikmeli alan | 1 | ✅ yapıldı |
| Kalıcı alan (süreli, zemine yapışık) | 6 | en çok kazandıran |
| İtme / çekme | 5 | oyuncu ve düşman fiziği |
| Görüş engeli | 4 | **düşman YZ'si LOS okuyor** — YZ'yi de etkiler |
| Durum etkisi (ıslak, yanan, yavaş) | 5 | zamanlı, HUD gerektirir |
| Engel yaratma | 2 | OBS'e çalışma zamanı ekleme |
| Işınlanma | 1 | kamera geçişi gerekir |
| Hitscan / sekme | 2 | mermi yolundan ayrı |
| Sersemletme | 1 | mühür girdisini kilitler |

**Sıra önerisi** — sistem başına en çok beceri açan önce:
1. Kalıcı alan (6 beceri) — gecikmeli alanın doğal uzantısı
2. Durum etkisi (5) — ıslak/yanan/yavaş
3. İtme/çekme (5)
4. Görüş engeli (4) — YZ'ye de dokunduğu için dikkatli
5. Kalan tekil sistemler

**Uyarı:** görüş engeli düşman YZ'sinin `hasLOS` okumasını değiştiriyor. Sis
içinde düşman oyuncuyu göremezse `yaklas` durumuna geçip üstüne yürüyor —
yani sis, kaçış aracı değil çağırma aracı olabilir. Uygulanmadan önce
`tools/yzdurum.js` ile ölçülmeli.

---

## 6. Dövüş döngüsü ve tempo

- **Can:** hem oyuncu hem düşman can barına sahip. Tek isabet öldürmez; düello birkaç
  doğru okuma sürer.
- **Aynı anda en fazla 3 düşman** (PvE). Spam yok, sürekli yaylım ateşi yok.
- **Telegraf:** düşman mührünü yapmadan önce kolunu kaldırır ve elinde element rengiyle
  enerji toplar — `v5.2`'de bu telegraf zaten uygulandı, element rengi ona bağlanacak.
- **Tepki penceresi** en kritik ayar: telegraf süresi, oyuncunun iki pozluk mührü
  yetiştirmesine yetmeli.
  - Kolay: ~1.5 sn · Orta: ~1.1 sn · Zor: ~0.8 sn
- **Yanlış mühür cezası:** hasar değil, kısa bir toparlanma gecikmesi (~0.4 sn).
  Panikleyip rastgele mühür yapmak cezalandırılır ama oyunu bitirmez.
- **Takip hissi:** düşmanlar siperler arasında konum değiştirir, görüş hattı kesilince
  yaklaşır. Sürekli ateş etmez; fırsat kollar.

---

## 7. PvE düşman davranışı

| Tip | Element eğilimi | Davranış |
|---|---|---|
| Hayalet (mevcut) | Nötr / tek element | Süzülür, mesafe korur, uzaktan atar |
| Ninja (v5.2) | Sabit bir element | Yerde koşar, yakından taciz eder, siper kullanır |
| *(sonra)* Usta | İki element | Element değiştirerek okumayı zorlaştırır |

Düşman element seçimi görünür olmalı: paleti elementinin rengini taşır
(🔥 kızıl, 💧 mavi, 🪨 toprak sarısı, 🌪 açık yeşil, ⚡ mor-beyaz).
Böylece oyuncu daha çarpışma başlamadan hangi elementle karşılık vereceğini bilir.

---

## 8. PvP 1v1

Sonraki faz. Yukarıdaki çarpışma çözümü **deterministik** olduğu için lockstep
senkronizasyon uygulanabilir: iki taraf yalnızca onaylanmış mühür olaylarını
(element + kalite + zaman damgası) gönderir, simülasyon her iki tarafta aynı sonucu üretir.

Karar bekleyen konu: taşıma katmanı — WebRTC DataChannel (eşler arası, düşük gecikme)
ya da WebSocket röle (kurulumu kolay, sunucu gerekir).

---

## 9. Uygulama fazları

| Faz | İçerik | Durum |
|---|---|---|
| **1** | Mühür tanıma katmanı: 5 mühür + 👉 silah pozu, oy penceresi, öğrenilmiş kalibrasyon | ✅ **bitti** — `muhur.html` |
| **2** | Element çekirdeği: mermi, güç, havada çarpışma, delme/nötrleme, siper, can | ✅ **bitti** — `index.html` |
| **3** | PvE: düşman çeşitliliği, davranış, ustalık ve ilerleme | sırada |
| **4** | Kombo geri açılır (tanıma güvenilir olduğunda) | bekliyor |
| **5** | PvP 1v1: taşıma katmanı + lockstep | bekliyor |

Faz 1'de öğrenilen ders dökümana yazılmaya değer: **sentetik test düzeneği bir
noktadan sonra gerçeği tahmin etmeyi bıraktı** — %99 doğruluk raporlarken
gerçek oyunda "çoğunu okumuyor" durumu vardı. Modellenmeyenler: hareket
bulanıklığı, MediaPipe'ın takip önceli, gerçek el anatomisi, kamera farkları.
Çözüm eşik ayarlamak değil, **kullanıcının kendi elinden öğrenmek** oldu.
`tools/` altındaki ölçüm betikleri, yanlış çıkan hipotezler dahil duruyor.

---

## 10. Netleşmesi gereken konular

Bunlar Faz 1'i bloke etmiyor, Faz 2'den önce karara bağlanmalı:

1. **Can değerleri:** kaç isabet öldürür? Doğru okumayla kaç saniyelik düello hedefleniyor?
2. **Nişan:** oto-kilit mi kalsın, yoksa oyuncu silah pozuyla hedefi kendi mi seçsin?
3. **Ses:** her elementin ayırt edici sesi olacak mı? (Telegrafın duyulabilir olması
   refleks penceresini ciddi biçimde genişletir.)
4. **Yüklü beceri taşınabilir mi?** Beceri yüklendikten sonra ateşlemeden dolaşılabilir
   mi, yoksa belli bir süre sonra söner mi? Taşınabilirse siper arkasında yükleyip
   çıkmak temel taktik olur — muhtemelen istenen bu, ama süresi belirlenmeli.

**Kapanan konular** (3.7'deki beceri tablosuyla karara bağlandı):

- ~~Şarj var mı?~~ → Şarj yerine **yükleme**: dizi kapanınca beceri yüklenir, süresi
  dizi uzunluğuyla artar (0.35 / 0.70 / 1.20 sn). Ayrı bir basılı tutma mekaniği yok.
- ~~Elementler farklı davranıyor mu?~~ → **Evet.** Yıldırım anlık ve delici ama zayıf,
  Toprak yavaş ama durdurulamaz, Hava hızlı ve taciz edici, Su takipli, Ateş dengeli.
