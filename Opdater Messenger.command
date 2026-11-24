#!/bin/bash
# Bygger Messenger og installerer den i Programmer. Dobbeltklik for at køre.
cd "$(dirname "$0")" || exit 1
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "=== Messenger – opdatering ==="
./build-dmg.sh

APP=$(find dist -maxdepth 2 -name "Messenger.app" | head -1)
[ -z "$APP" ] && { echo "❌ Fandt ikke den byggede app."; read -p "Tryk Enter for at lukke"; exit 1; }

echo "⏹  Lukker Messenger..."
osascript -e 'tell application "Messenger" to quit' 2>/dev/null || true
sleep 2

if [ -d "/Applications/Messenger.app" ]; then
  echo "🗑  Flytter den gamle version til Papirkurven (kan gendannes)..."
  osascript -e 'tell application "Finder" to delete POSIX file "/Applications/Messenger.app"' >/dev/null
fi

echo "📲 Installerer ny version i Programmer..."
ditto "$APP" "/Applications/Messenger.app"
open "/Applications/Messenger.app"

echo ""
echo "✅ Færdig! Messenger er opdateret og startet."
echo "   Delbar fil til andre ligger i: $(pwd)/dist/"
read -p "Tryk Enter for at lukke dette vindue"
