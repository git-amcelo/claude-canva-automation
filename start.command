#!/bin/bash
# Double-click this file (in Finder) to start the buckstreaming Carousel Draft
# Generator. It will open your browser automatically once the app is ready.

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "First-time setup: installing dependencies (this can take a minute)..."
  npm install
fi

if [ ! -f ".env.local" ]; then
  echo ""
  echo "============================================================"
  echo " No .env.local file found."
  echo " Copy .env.local.example to .env.local and add your"
  echo " Anthropic API key before continuing."
  echo " (https://console.anthropic.com/settings/keys)"
  echo "============================================================"
  echo ""
  read -p "Press Enter once you've done this, or Ctrl+C to quit..."
fi

( sleep 3 && open "http://localhost:3000" ) &

npm run dev
