#!/bin/sh
# PORT DOĞRULAMA — Muhur.cs'i muhur.js'e karşı koştur.
#   sh tools/muhurport.sh
#
# Unity'nin getirdiği Roslyn ve .NET çalışma zamanı kullanılıyor; ayrıca bir
# SDK kurmaya gerek yok. Tek gereksinim Unity'nin kurulu olması.
set -e
U=/Applications/Unity/Hub/Editor/6000.4.10f1/Unity.app/Contents/Resources/Scripting
DOTNET=$U/NetCoreRuntime/dotnet
CSC="$DOTNET $U/DotNetSdkRoslyn/csc.dll"
REF=$(dirname "$(find $U/NetCoreRuntime/shared -name System.Runtime.dll | head -1)")
SUR=$(basename "$REF")            # ör. 8.0.16
TFM=net$(echo "$SUR" | cut -d. -f1).0

OYUN=${OYUN:-$HOME/Desktop/golge-unity}
IS=${IS:-/tmp/muhurport}
mkdir -p "$IS"

node tools/muhurfikstur.js > "$IS/fikstur.json"

$CSC -nologo -nostdlib -langversion:latest \
  -out:"$IS/karsilastir.dll" -target:exe \
  -r:"$REF/System.Runtime.dll" -r:"$REF/System.Private.CoreLib.dll" \
  -r:"$REF/System.Console.dll" -r:"$REF/System.Collections.dll" \
  -r:"$REF/System.Linq.dll" -r:"$REF/System.Runtime.Extensions.dll" \
  "$OYUN/Assets/Scripts/Muhur.cs" tools/MuhurKarsilastir.cs

cat > "$IS/karsilastir.runtimeconfig.json" <<EOF
{"runtimeOptions":{"tfm":"$TFM","framework":{"name":"Microsoft.NETCore.App","version":"$SUR"},"rollForward":"latestMinor"}}
EOF

# Yerel ayar TÜRKÇE ile de koşuluyor: ondalık ayırıcı virgül olduğunda JSON
# yazımı bozulursa burada yakalansın, telefonda değil.
echo "— varsayılan yerel ayar —"
"$DOTNET" "$IS/karsilastir.dll" "$IS/fikstur.json"
echo
echo "— tr-TR yerel ayarı —"
DOTNET_SYSTEM_GLOBALIZATION_PREDEFINED_CULTURES_ONLY=false LANG=tr_TR.UTF-8 LC_ALL=tr_TR.UTF-8 \
  "$DOTNET" "$IS/karsilastir.dll" "$IS/fikstur.json"
