@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

echo [1/5] Checking required commands...
where node  >nul 2>&1 || (echo Error: 'node' is not installed. && exit /b 1)
where npm   >nul 2>&1 || (echo Error: 'npm' is not installed.  && exit /b 1)
where cargo >nul 2>&1 || (echo Error: 'cargo' is not installed. && exit /b 1)
where rustup >nul 2>&1 || (echo Error: 'rustup' is not installed. && exit /b 1)

echo [2/5] Installing Rust Windows target (if missing)...
rustup target add x86_64-pc-windows-msvc
if %errorlevel% neq 0 (echo Error: failed to add Rust target. && exit /b 1)

echo [3/5] Installing npm dependencies...
npm install
if %errorlevel% neq 0 (echo Error: npm install failed. && exit /b 1)

echo [4/5] Building Windows installer (NSIS + MSI) with Tauri...
npx tauri build --target x86_64-pc-windows-msvc
if %errorlevel% neq 0 (echo Error: tauri build failed. && exit /b 1)

echo [5/5] Done. Installer output:
set "BUNDLE_DIR=%ROOT_DIR%\src-tauri\target\x86_64-pc-windows-msvc\release\bundle"
if exist "%BUNDLE_DIR%\nsis\*.exe"  dir /b "%BUNDLE_DIR%\nsis\*.exe"
if exist "%BUNDLE_DIR%\msi\*.msi"   dir /b "%BUNDLE_DIR%\msi\*.msi"
