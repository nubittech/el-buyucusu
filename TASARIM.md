# Gölge Ninja — Element Dövüş Sistemi

Tasarım dökümanı · v1 · 2 Ağustos 2026

Bu döküman prototipin (v5.2) üstüne gelen çekirdek dövüş sisteminin tasarımıdır.
Kod yazılmadan önce kararların netleşmesi için hazırlandı.

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

- **Zaman kilidi:** mudra ~150 ms sabit tutulmadan onaylanmaz. `v5.2`'de kalkan için
  yazılan asimetrik sönümleme aynen kullanılır: tutarken tek kare kaybı mührü düşürmez.
- **Ayırt edici sinyaller:** dört parmağın uzama oranı (hangi parmaklar açık) +
  baş parmak ucunun dört parmak ucuna mesafesi (hangisine değiyor). `v5.2`'deki
  `analyzeHand` metrikleri doğrudan yeniden kullanılabilir; Abhaya zaten kalibre edildi.
- **Belirsizlik reddi:** en yakın iki prototip arasındaki fark belli bir eşiğin
  altındaysa **hiçbir mühür tetiklenmez**. Yanlış element atmaktansa hiç atmamak
  daha iyi — kalkandaki asıl sorun buydu.
- **Geçiş karesi bağışıklığı:** bir mudradan diğerine geçerken aradaki şekiller
  zaman kilidini dolduramadığı için tetiklenmez.

### 3.4 Savunma: karşı elementin mührü

Savunma için ayrı bir mühür alfabesi **yok**. Gelen saldırıya karşı, onu yenen
elementin mührünü yaparsın:

| Gelen saldırı | Yapman gereken mühür |
|---|---|
| 🔥 Ateş | 💧 Su — 🤟 üç parmak |
| 🌪 Hava | 🔥 Ateş — 👌 baş parmak + işaret |
| ⚡ Yıldırım | 🌪 Hava — 🖐 açık avuç |
| 🪨 Toprak | ⚡ Yıldırım — 🤙 baş parmak + serçe |
| 💧 Su | 🪨 Toprak — 🤘 işaret + serçe |

Bu seçimin büyük avantajı: tanınması gereken jest sayısı **10 değil 5**. Aynı mühür
bağlama göre saldırı ya da savunma okunur — havada sana gelen bir mermi varsa savunma,
yoksa saldırı.

### 3.5 Tek elementli oyuncu sorunu ve çözümü

**Gerilim:** Oyuncu tek elementle başlıyor. Savunma karşı elementin mührünü
gerektiriyorsa, tek elementli oyuncu yalnızca **bir** element türüne karşı
savunabilir — diğer dördüne karşı çaresiz kalır.

**Çözüm — savunma serbest, saldırı ustalığa bağlı:**

- **Savunma mührü ilk andan itibaren beş element için de yapılabilir.** Savunmada mühür
  hasar vermez, yalnızca gelen saldırıyı karşılar; bu yüzden "ustalık" şartı aranmaz.
- **Saldırı yalnızca ustalaşılmış elementlerle yapılabilir.** İlerleme burada:
  saldırı çeşitliliği ve gücü açılır.
- Ustalaşılmamış bir elementle yapılan savunma **zayıftır**: yalnızca merminin
  yeterince erken karşılanması hâlinde nötrler, geç kalınırsa sıyırma hasarı geçer.
  Ustalaşılmış elementle savunma hem daha geniş zaman penceresine sahiptir hem de
  karşı-itme (rakibi geri savurma) yapar.
- **Siper her zaman geçerli.** Mühür yetiştiremediğin an arena objelerinin arkasına
  girmek en garanti savunmadır — tasarımın açık kaçış valfi budur.

Böylece tek elementli oyuncu hayatta kalabilir, ilerleme hâlâ anlamlıdır, ve
"refleks arttıkça çoklu element" hedefi korunur.

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

### 4.3 Savunma mührü çarpışması

Savunma mührü, kendi elementinde ve savunanın gücüyle bir **karşılama mermisi** üretir;
sonra yukarıdaki aynı kurallar işler. Yani savunma ayrı bir sistem değil, saldırının
özel hâli. Tek fark: savunma mermisi menzil olarak kısadır ve savunanın önünde oluşur.

---

## 5. Ustalık ve ilerleme

- Her element için ayrı **ustalık seviyesi** (0–5).
- Oyuna başlarken oyuncu **bir element seçer**, o element seviye 1'de başlar.
- Ustalık artışı: o elementle isabet, başarılı savunma, ve temiz mühür kalitesi.
- Yeni element açılışı: belli bir toplam ustalık + refleks eşiği (ortalama tepki süresi)
  aşıldığında bir sonraki element saldırıya açılır.
- Ustalık etkisi: mermi gücü, mühür onay penceresi genişliği, savunma zaman penceresi.

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
Böylece oyuncu daha çarpışma başlamadan hangi savunmaya hazırlanacağını bilir.

---

## 8. PvP 1v1

Sonraki faz. Yukarıdaki çarpışma çözümü **deterministik** olduğu için lockstep
senkronizasyon uygulanabilir: iki taraf yalnızca onaylanmış mühür olaylarını
(element + kalite + zaman damgası) gönderir, simülasyon her iki tarafta aynı sonucu üretir.

Karar bekleyen konu: taşıma katmanı — WebRTC DataChannel (eşler arası, düşük gecikme)
ya da WebSocket röle (kurulumu kolay, sunucu gerekir).

---

## 9. Uygulama fazları

| Faz | İçerik | Çıktı |
|---|---|---|
| **1** | Mühür tanıma katmanı: 5 mudra + zaman kilidi + belirsizlik reddi | Sentetik iskelet testleri + ekranda canlı mühür test alanı |
| **2** | Element çekirdeği: mermi, güç, havada çarpışma, delme/nötrleme, siper | Tek düşmanla oynanabilir düello |
| **3** | PvE: 1–3 düşman, davranış, can, ustalık ve ilerleme | Tam oynanabilir tek kişilik oyun |
| **4** | PvP 1v1: taşıma katmanı + lockstep | İki kişilik düello |

Faz 1 kritik: her şey mühür tanımanın güvenilirliğine bağlı ve geçen sefer kırılan
yer tam olarak burasıydı. Sentetik iskeletlerle kalibrasyon + gerçek kamerayla senin
onayın alınmadan Faz 2'ye geçilmeyecek.

---

## 10. Netleşmesi gereken konular

Bunlar Faz 1'i bloke etmiyor, Faz 2'den önce karara bağlanmalı:

1. **Şarj var mı?** Mühür tamamlanınca mermi hemen mi çıkar, yoksa basılı tutup
   güçlendirilebilir mi?
2. **Elementler birbirinden farklı davranıyor mu?** (Yıldırım hızlı ama zayıf,
   Toprak yavaş ama güçlü gibi) — yoksa fark yalnızca döngüde mi?
3. **Can değerleri:** kaç isabet öldürür? Doğru okumayla kaç saniyelik düello hedefleniyor?
4. **Nişan:** oto-kilit mi kalsın, yoksa oyuncu hedefi kendi mi seçsin?
5. **Ses:** her elementin ayırt edici sesi olacak mı? (Telegrafın duyulabilir olması
   refleks penceresini ciddi biçimde genişletir.)
