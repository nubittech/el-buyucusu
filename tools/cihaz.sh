#!/usr/bin/env bash
# Kabloyla bağlı iPhone'a derle, kur, çalıştır.
#   ./tools/cihaz.sh          → oyun
#   TEST=1 ./tools/cihaz.sh   → WKWebView doğrulama sayfası
set -euo pipefail
cd "$(dirname "$0")/.."

TAKIM="${TAKIM:-GHWW9UP94F}"
PAKET="com.nubittech.golgeninja"
DD="${DD:-/tmp/golge-ninja-dd}"

echo "▸ web varlıkları"
node tools/paketle.js
npx cap sync ios >/dev/null

# Cihaz kimlikleri iki ayrı biçimde: devicectl CoreDevice UUID'si kullanıyor,
# xcodebuild ise donanım UDID'si. İkisini de bulmak gerekiyor.
echo "▸ cihaz aranıyor"
# Sütun sayısıyla ilerlemek kırılgan: Model alanı boşluk içeriyor ($(NF-4)
# cihaz adına denk geliyordu). UUID'yi biçiminden yakalıyoruz.
CORE=$(xcrun devicectl list devices 2>/dev/null | awk '
  /available \(paired\)/ {
    for(i=1;i<=NF;i++) if($i ~ /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-/) { print $i; exit }
  }')
if [ -z "${CORE:-}" ]; then
  echo "✗ Kabloyla bağlı, eşleşmiş cihaz yok. Telefonu tak ve 'Bu bilgisayara güven' de." >&2
  exit 1
fi
HW=$(xcodebuild -project ios/App/App.xcodeproj -scheme App -showdestinations 2>/dev/null \
  | awk -F'id:' '/platform:iOS, arch:arm64/ {split($2,a,","); gsub(/ /,"",a[1]); print a[1]; exit}')
if [ -z "${HW:-}" ]; then
  echo "✗ xcodebuild cihazı görmüyor. Xcode'u bir kez açıp cihazı hazırlaman gerekebilir." >&2
  exit 1
fi
echo "  CoreDevice $CORE"
echo "  donanım    $HW"

echo "▸ derleniyor (takım $TAKIM)"
# Otomatik imzalama şart: eldeki profiller Xcode yönetimli, manuel imzalama
# onları kabul etmiyor ("is Xcode managed, but signing settings require a
# manually managed profile").
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination "platform=iOS,id=$HW" \
  -configuration Debug -derivedDataPath "$DD" \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM="$TAKIM" \
  -allowProvisioningUpdates build 2>&1 \
  | grep -E "error:|warning: .*[Ss]igning|BUILD (SUCCEEDED|FAILED)" || true

APP="$DD/Build/Products/Debug-iphoneos/App.app"
[ -d "$APP" ] || { echo "✗ App.app üretilmedi" >&2; exit 1; }
echo "  paket $(du -sh "$APP" | cut -f1)"

kur_ve_baslat(){
  xcrun devicectl device install app --device "$CORE" "$APP" >/dev/null
  xcrun devicectl device process launch --device "$CORE" --terminate-existing "$PAKET" >/dev/null 2>&1
}
echo "▸ kuruluyor"
if ! kur_ve_baslat; then
  # Çalışan uygulamanın üstüne kurulum, imza geçerli olsa bile iOS'un
  # "profil güvenilmedi" hatasıyla başlatmayı reddettiği bir duruma
  # sokabiliyor. Temiz kaldırma bunu geçiyor.
  echo "  başlatılamadı — temiz kurulum deneniyor"
  xcrun devicectl device uninstall app --device "$CORE" "$PAKET" >/dev/null 2>&1 || true
  kur_ve_baslat || { echo "✗ başlatılamadı" >&2; exit 1; }
fi
echo "✓ telefonda çalışıyor${TEST:+  (TEST sayfası)}"
