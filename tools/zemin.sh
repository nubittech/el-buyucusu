#!/bin/sh
# ZEMİN DOKUSU ÜRETİMİ — kaynak swatch'lardan oyunun kullandığı WebP'ye
#
#   sh tools/zemin.sh ~/Desktop/newmap
#
# Üç iş yapıyor, üçü de zorunlu:
#
# 1) ÇERÇEVE KIRPMA. Üretici swatch'ları ~25px koyu bir çerçeveyle geliyor.
#    Kırpılmazsa döşenen zeminde her tekrar sınırında koyu bir ızgara çıkıyor.
#
# 2) DİKİŞ GİDERME. Swatch'lar döşenebilir değil. %50 kaydırılmış kopya yumuşak
#    kenarlı bir maskeyle üstüne bindiriliyor: kaydırma dikişi karenin ortasına
#    taşıyor, maske de o bandı çapraz geçişe çeviriyor. Sonuçta kenarlar
#    özgün pikselleri koruduğu için tekrar sınırı görünmüyor.
#
# 3) BOYUT. 1254² PNG = 2.1 MB. Zemin omuz üstü kameradan yatık açıyla
#    görülüyor; 512² yeterli. WebP q82 ile 23 KB — 95 kat küçük.
set -e
KOK="${1:-$HOME/Desktop/newmap}"
CIK="$(cd "$(dirname "$0")/.." && pwd)/assets"
command -v magick >/dev/null || { echo "ImageMagick (magick) gerekli"; exit 1; }
command -v cwebp  >/dev/null || { echo "cwebp gerekli (brew install webp)"; exit 1; }
mkdir -p "$CIK"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# yumuşak kenarlı maske: ortada beyaz (kaydırılmış kopya), kenarda siyah (özgün)
magick -size 512x512 xc:black -fill white \
  -draw "roundrectangle 96,96 415,415 90,90" -blur 0x38 "$TMP/mask.png"

for n in 1 2; do
  SRC="$KOK/zemin$n.png"
  [ -f "$SRC" ] || { echo "yok: $SRC"; exit 1; }
  magick "$SRC" -crop 1190x1190+32+32 +repage -resize 512x512! "$TMP/a.png"
  magick "$TMP/a.png" \( "$TMP/a.png" -roll +256+256 \) "$TMP/mask.png" -composite "$TMP/b.png"
  cwebp -q 82 -quiet "$TMP/b.png" -o "$CIK/zemin$n.webp"
  printf '%s → %s (%s)\n' "$(basename "$SRC")" "assets/zemin$n.webp" \
    "$(du -h "$CIK/zemin$n.webp" | cut -f1)"
done
