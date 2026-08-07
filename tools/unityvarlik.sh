#!/bin/sh
# VARLIKLARI UNITY'YE AKTAR
#
#   sh tools/unityvarlik.sh [~/Desktop/newmap] [~/Desktop/golge-unity]
#
# SADELEŞTİRME YOK — ve bu bilinçli. QEM hattı (tools/sadelestir.js) WebGL1
# telefonda 460.000 üçgeni kaldıramadığı için vardı. Unity'de frustum culling,
# occlusion culling, GPU instancing ve LOD var; kaynak geometri doğrudan
# girebiliyor. Üstelik "patlamış üçgenler" ve gerilmiş doku şikâyetlerinin
# kaynağı da o hattın kendisiydi: %85 kesimde çökertme köşeyi taşıyor, köşedeki
# UV de onunla gidiyor. Kaynağı olduğu gibi almak sorunu çözmüyor — ORTADAN
# KALDIRIYOR.
#
# Dokuya yapılan iki işlem duruyor, ikisi de hâlâ gerekli:
#   1) DOLGU. Atlas UV adaları arası siyah; mipmap onu ada kenarlarından içeri
#      sızdırıyor ve model her dikişte koyu bir çizgi alıyor.
#   2) IŞIĞI GERİ AL. Atlas gece pişirmesi (parlaklık medyanı 255'te 14). Unity
#      kendi ışığını üstüne uyguladığı için olduğu gibi kullanılırsa bina iki kez
#      kararıyor. Seviye germesi kabaca albedoya çeviriyor.
# WebP YOK: Unity WebP okumuyor, PNG veriliyor; sıkıştırmayı (iOS'ta ASTC)
# Unity'nin kendi içe aktarıcısı yapıyor.
set -e
KOK="${1:-$HOME/Desktop/newmap}"
OYUN="${2:-$HOME/Desktop/golge-unity}"
IND="$HOME/Downloads"
BURA="$(cd "$(dirname "$0")/.." && pwd)"

command -v magick >/dev/null || { echo "ImageMagick (magick) gerekli"; exit 1; }
mkdir -p "$OYUN/Assets/Kasaba" "$OYUN/Assets/Karakter"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "— binalar —"
for D in "$KOK"/*/; do
  AD="$(basename "$D")"
  [ -f "$D/base.obj" ] || continue
  # Rol adı roller.json'dan; klasör adları UUID ve sahne kurarken okunamıyor.
  ROL="$(node -e "
    const r=require('$BURA/assets/roller.json').roller, a=process.argv[1];
    let rol = r[a] ? r[a].rol : '';
    if(!rol) for(const k in r) if(a.startsWith(k)) { rol = r[k].rol; break; }
    process.stdout.write(rol);
  " "$AD")"
  [ -n "$ROL" ] || { echo "  $AD: rol yok, atlandı"; continue; }

  SRC="$(node "$BURA/tools/atlassec.js" "$D" 2>/dev/null)" || continue
  [ -n "$SRC" ] && [ -f "$SRC" ] || continue

  mkdir -p "$OYUN/Assets/Kasaba/$ROL"
  cp "$D/base.obj" "$OYUN/Assets/Kasaba/$ROL/$ROL.obj"

  magick "$SRC" -colorspace Gray -threshold 2% -morphology Dilate Diamond:2 "$TMP/mask.png"
  magick "$SRC" -blur 0x14 "$TMP/blur.png"
  magick "$TMP/blur.png" "$SRC" "$TMP/mask.png" -composite "$TMP/dolu.png"
  magick "$TMP/dolu.png" -level 0%,30%,1.10 -evaluate multiply 0.88 -resize 1024x1024! \
    "$OYUN/Assets/Kasaba/$ROL/$ROL.png"

  UC=$(grep -c '^f ' "$D/base.obj" || true)
  printf '  %-9s %s · %s yüz · %s\n' "$ROL" "$(basename "$SRC")" "$UC" \
    "$(du -h "$OYUN/Assets/Kasaba/$ROL/$ROL.png" | cut -f1)"
done

echo "— zemin —"
for Z in zemin1 zemin2; do
  [ -f "$KOK/$Z.png" ] || continue
  magick "$KOK/$Z.png" -resize 1024x1024! "$OYUN/Assets/Kasaba/$Z.png"
  printf '  %s\n' "$Z.png"
done

echo "— karakter —"
kopyala() {
  [ -f "$1" ] || { echo "  YOK: $1"; return; }
  cp "$1" "$2"; printf '  %s → %s\n' "$(basename "$1")" "$(basename "$2")"
}
kopyala "$IND/Ninja Idle.fbx" "$OYUN/Assets/Karakter/Ninja.fbx"
kopyala "$IND/Run.fbx"        "$OYUN/Assets/Karakter/Kosu.fbx"

echo "bitti."
