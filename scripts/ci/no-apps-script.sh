#!/usr/bin/env bash
set -e

echo "🔍 Checking for forbidden Apps Script references..."

if rg -n "script\.google\.com|macros/s/AKfy|/exec" -g '!scripts/ci/no-apps-script.sh' .env* src server scripts; then
  echo "❌ Forbidden Apps Script reference found."
  exit 1
fi

echo "✅ No Apps Script references found."
