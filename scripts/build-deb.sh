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

echo "[2/5] Installing Rust Linux target (if missing)..."
rustup target add x86_64-unknown-linux-gnu >/dev/null

echo "[3/5] Installing npm dependencies..."
npm install

echo "[4/5] Building DEB package with Tauri..."
npx tauri build --target x86_64-unknown-linux-gnu --bundles deb

echo "[5/5] Done. DEB output:"
ls -1 "$ROOT_DIR/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb"/*.deb
