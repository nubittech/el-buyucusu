#!/bin/sh
# BİNA ATLASI: modelin doku haritası → oyunun kullandığı WebP
#
#   sh tools/binaatlas.sh ~/Desktop/newmap
#
# Üç iş, üçü de zorunlu:
#
# 1) DOLGUYU DOLDUR. Atlas UV adalarından oluşuyor ve adaların arası SİYAH.
#    Doğrudan kullanılırsa mipmap ve doğrusal filtreleme ada kenarlarında o
#    siyahı içeri karıştırıyor; model her UV dikişinde koyu bir çizgi alıyor.
#    Bulanık bir kopya "içerik yoksa" maskesiyle altına konarak boşluklar
#    komşu renklerle dolduruluyor.
#
# 2) IŞIĞI GERİ AL. Atlas GECE PİŞİRMESİ: parlaklık medyanı 255 üzerinden 14
#    (ölçüldü). Motor kendi gece ışığını üstüne uyguladığı için olduğu gibi
#    kullanılırsa bina iki kez kararıp siyah kütleye dönüyor. Seviye germesi
#    onu kabaca albedoya çeviriyor; gölgelemeyi motor yapsın.
#
# 3) BOYUT. 2048² PNG ~2.9 MB. Bina ekranda 150-300 piksel; 1024 fazlasıyla
#    yetiyor. WebP q80 ile ~100 KB.
set -e
KOK="${1:-$HOME/Desktop/newmap}"
CIK="$(cd "$(dirname "$0")/.." && pwd)/assets"
command -v magick >/dev/null || { echo "ImageMagick (magick) gerekli"; exit 1; }
command -v cwebp  >/dev/null || { echo "cwebp gerekli (brew install webp)"; exit 1; }
mkdir -p "$CIK"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

for D in "$KOK"/*/; do
  AD="$(basename "$D")"
  # Kaynak haritayı tools/atlassec.js seçiyor: PBR açıkken gelen
  # texture_diffuse her zaman daha iyi DEĞİL (ölçüldü, varlıktan varlığa
  # değişiyor), o yüzden dosya adına değil ezilmiş siyah payına bakılıyor.
  SRC="$(AYRINTI=1 node "$(dirname "$0")/atlassec.js" "$D" 2>/dev/null)" || continue
  [ -n "$SRC" ] && [ -f "$SRC" ] || continue
  # Klasör adı doğrudan dosya adı oluyor ve URL olarak isteniyor. İndirilen
  # klasörlerde boşluk/parantez olabiliyor ("... (1)"); kodlanmamış boşluk
  # isteği kırar. Güvenli karakterlere indirgeniyor.
  AD="$(printf '%s' "$AD" | tr -c 'a-zA-Z0-9._-' '-')"
  printf '  %s: %s\n' "$AD" "$(basename "$SRC")"
  # 1) içerik maskesi + bulanık dolgu
  magick "$SRC" -colorspace Gray -threshold 2% -morphology Dilate Diamond:2 "$TMP/mask.png"
  magick "$SRC" -blur 0x14 "$TMP/blur.png"
  magick "$TMP/blur.png" "$SRC" "$TMP/mask.png" -composite "$TMP/dolu.png"
  # 2) seviye germe: girdinin 0-30%'u çıktının tamamına. Sonra hafif kısma —
  #    motor üstüne kendi ışığını ve bloom'u ekliyor, beyaz duvar patlıyordu.
  magick "$TMP/dolu.png" -level 0%,30%,1.10 -evaluate multiply 0.88 "$TMP/acik.png"
  # 3) küçült + webp
  magick "$TMP/acik.png" -resize 1024x1024! "$TMP/kucuk.png"
  cwebp -q 80 -quiet "$TMP/kucuk.png" -o "$CIK/$AD.webp"
  printf '%s → assets/%s.webp (%s)\n' "$AD" "$AD" "$(du -h "$CIK/$AD.webp" | cut -f1)"
done
