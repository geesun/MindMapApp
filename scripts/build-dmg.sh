#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Checking required commands..."
for cmd in node npm cargo rustup; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: '$cmd' is not installed."
    exit 1
  fi
done

echo "[2/5] Installing Rust Universal target (if missing)..."
rustup target add aarch64-apple-darwin >/dev/null
rustup target add x86_64-apple-darwin  >/dev/null

echo "[3/5] Installing npm dependencies..."
npm install

echo "[4/5] Building Universal DMG (arm64 + x86_64) with Tauri..."
npx tauri build --target universal-apple-darwin

echo "[5/5] Done. DMG output:"
ls -1 "$ROOT_DIR/src-tauri/target/universal-apple-darwin/release/bundle/dmg"/*.dmg
