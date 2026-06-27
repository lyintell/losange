# Losange — Build Android preview (APK interne via EAS)
#
# Usage (depuis la racine du repo) :
#   .\scripts\build-android-preview.ps1
#   .\scripts\build-android-preview.ps1 -Local
#   .\scripts\build-android-preview.ps1 -NonInteractive
#
# Prérequis :
#   - Node.js + npm
#   - Compte Expo : npx eas-cli login
#   - Projet lié (projectId dans app.json)
#
# Équivalent npm : npm run build:android:preview

param(
  [switch]$Local,
  [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if ((Split-Path -Leaf $Root) -eq "scripts") {
  $Root = Split-Path -Parent $Root
}
Set-Location $Root

Write-Host ""
Write-Host "=== Losange — Android preview ===" -ForegroundColor Cyan
Write-Host "Profil EAS : preview (distribution internal, APK)"
Write-Host ""

if (-not (Test-Path "eas.json")) {
  throw "eas.json introuvable. Exécute ce script depuis la racine du repo Losange."
}

if (-not (Test-Path "app.json")) {
  throw "app.json introuvable."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm introuvable. Installe Node.js."
}

Write-Host "EAS CLI :" -NoNewline
npx eas-cli --version
Write-Host ""

$easArgs = @("build", "-p", "android", "--profile", "preview")
if ($Local) {
  $easArgs += "--local"
  Write-Host "Mode : build local (Android SDK / NDK requis sur cette machine)" -ForegroundColor Yellow
} else {
  Write-Host "Mode : build cloud Expo" -ForegroundColor DarkGray
}
if ($NonInteractive) {
  $easArgs += "--non-interactive"
}

Write-Host ""
Write-Host "Commande : npx eas-cli $($easArgs -join ' ')" -ForegroundColor DarkGray
Write-Host ""

& npx eas-cli @easArgs
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
  Write-Host "Build terminé ou soumis avec succès." -ForegroundColor Green
  Write-Host "Télécharge l'APK depuis https://expo.dev (projet Losange, profil preview)." -ForegroundColor Green
} else {
  Write-Host "Build échoué (code $exitCode)." -ForegroundColor Red
  Write-Host "Vérifie : eas login, crédits EAS, et les logs ci-dessus." -ForegroundColor DarkYellow
}

exit $exitCode
