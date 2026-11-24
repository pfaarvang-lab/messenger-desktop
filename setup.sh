#!/bin/bash
# ============================================================
#  Messenger Desktop – Setup & Start Script
#  Kør dette script én gang for at installere, herefter:
#  $ npm start  (i messenger-app mappen)
# ============================================================

set -e

echo "🚀 Messenger Desktop – Setup"
echo "================================"

# 1. Check Node.js
if ! command -v node &>/dev/null; then
  echo "❌ Node.js ikke fundet. Installer via https://nodejs.org eller:"
  echo "   brew install node"
  exit 1
fi
echo "✅ Node.js $(node --version)"

# 2. Install dependencies
echo ""
echo "📦 Installerer dependencies..."
npm install

# 3. Convert SVG icon to PNG (kræver Inkscape eller rsvg-convert eller ImageMagick)
echo ""
echo "🎨 Genererer app-ikon..."

if command -v rsvg-convert &>/dev/null; then
  rsvg-convert -w 1024 -h 1024 assets/icon.svg -o assets/icon.png
  echo "✅ Ikon genereret med rsvg-convert"
elif command -v convert &>/dev/null; then
  convert -background none -size 1024x1024 assets/icon.svg assets/icon.png
  echo "✅ Ikon genereret med ImageMagick"
else
  echo "⚠️  Kan ikke auto-generere ikon (installer: brew install librsvg)"
  echo "   Appen starter stadig uden brugerdefineret ikon."
  # Create a minimal 1x1 placeholder so Electron doesn't crash
  touch assets/icon.png
fi

echo ""
echo "✅ Alt klar!"
echo ""
echo "▶️  Start appen med:"
echo "   npm start"
echo ""
echo "📦 Byg en .dmg installationsfil med:"
echo "   npm run dist"
