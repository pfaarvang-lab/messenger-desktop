#!/bin/bash
# ============================================================
#  Messenger Desktop – Byg delbar .dmg (én fil til alle Macs)
#  Kræver: Node.js 18+  (brew install node)
# ============================================================
set -e
cd "$(dirname "$0")"

echo "🔨 Bygger Messenger Desktop..."

if ! command -v node &>/dev/null; then
  echo "❌ Node.js mangler. Kør: brew install node"
  exit 1
fi

echo "📦 Installerer dependencies..."
npm install

# Ikon (følger normalt med – genereres kun hvis det mangler)
if [ ! -s assets/icon.png ]; then
  echo "🎨 Genererer ikon..."
  qlmanage -t -s 1024 -o /tmp assets/icon.svg >/dev/null 2>&1 && \
    mv /tmp/icon.svg.png assets/icon.png || \
    echo "⚠️  Ikon kunne ikke genereres – bygger uden."
fi

rm -rf dist
echo "🏗️  Bygger universal app (M-chip + Intel) – tager et par minutter..."
npx electron-builder --mac dir --universal

APP=$(find dist -maxdepth 2 -name "Messenger.app" | head -1)
[ -z "$APP" ] && { echo "❌ Fandt ikke Messenger.app i dist/"; exit 1; }
node build/adhoc-sign.js "$APP"

echo "💿 Pakker .dmg..."
npx electron-builder --mac dmg --universal --prepackaged "$APP"

cp "Installationsvejledning.txt" dist/

echo ""
echo "✅ Færdig! Del disse to filer fra dist/:"
ls -1 dist/*.dmg dist/Installationsvejledning.txt
open dist/ 2>/dev/null || true
