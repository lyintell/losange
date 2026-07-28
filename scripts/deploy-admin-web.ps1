# Losange — Deploy admin webapp (Next.js) sur Vercel → admin.losange.app
#
# Branche Git de production : v2
#
# Usage (depuis la racine du repo, sur la branche v2) :
#   .\scripts\deploy-admin-web.ps1
#   .\scripts\deploy-admin-web.ps1 -SkipEnvSync
#   .\scripts\deploy-admin-web.ps1 -PreviewOnly
#   .\scripts\deploy-admin-web.ps1 -AllowOtherBranch   # deploy depuis une autre branche (dev)
#
# Prérequis :
#   - git checkout v2 && git pull (code a jour)
#   - webapps/admin/.env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - npx vercel login
#   - DNS : CNAME admin → cname.vercel-dns.com
#
# Vercel Git (deploy auto) : Project Settings > Git > Production Branch = v2

param(
  [string]$GitBranch = "v2",
  [switch]$AllowOtherBranch,
  [switch]$SkipEnvSync,
  [switch]$PreviewOnly,
  [switch]$SkipDomain
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if ((Split-Path -Leaf $Root) -eq "scripts") {
  $Root = Split-Path -Parent $Root
}
$AdminDir = Join-Path $Root "webapps\admin"
$EnvFile = Join-Path $AdminDir ".env.local"
$Domain = "admin.losange.app"
$ProjectName = "losange-admin"

Set-Location $Root

if (Get-Command git -ErrorAction SilentlyContinue) {
  $currentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
  if ($currentBranch -and $currentBranch -ne $GitBranch -and -not $AllowOtherBranch) {
    throw "Deploy admin : branche actuelle '$currentBranch'. Passe sur '$GitBranch' (git checkout $GitBranch) ou utilise -AllowOtherBranch."
  }
  if ($currentBranch) {
    Write-Host "Branche Git : $currentBranch" -ForegroundColor DarkGray
  }
}

Set-Location $AdminDir

Write-Host ""
Write-Host "=== Losange Admin - deploy Vercel ===" -ForegroundColor Cyan
Write-Host "App      : webapps/admin (Next.js)"
Write-Host "Branche  : $GitBranch (production Git)"
Write-Host "Domaine  : $Domain"
Write-Host ""

if (-not (Test-Path "package.json")) {
  throw "Dossier admin introuvable : $AdminDir"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm introuvable."
}

Write-Host "Vercel CLI :" -NoNewline
npx vercel --version
Write-Host "Compte :" -NoNewline
npx vercel whoami
Write-Host ""

if (-not (Test-Path ".vercel\project.json")) {
  Write-Host "Liaison projet Vercel ($ProjectName)..." -ForegroundColor DarkGray
  npx vercel link --yes --project $ProjectName 2>&1 | Out-String | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Echec vercel link"
  }
}

# Le projet Vercel a Root Directory = webapps/admin : deploy depuis la racine du repo.
$RootVercelDir = Join-Path $Root ".vercel"
if (-not (Test-Path $RootVercelDir)) {
  New-Item -ItemType Directory -Path $RootVercelDir | Out-Null
}
Copy-Item (Join-Path $AdminDir ".vercel\project.json") (Join-Path $RootVercelDir "project.json") -Force

function Sync-VercelEnvFromLocal {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw ".env.local manquant dans webapps/admin. Copie .env.local.example et renseigne Supabase."
  }

  $keys = @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  $lines = Get-Content $Path -Encoding UTF8

  foreach ($key in $keys) {
    $line = $lines | Where-Object { $_ -match "^\s*$([regex]::Escape($key))\s*=" } | Select-Object -First 1
    if (-not $line) {
      throw "Variable $key absente de .env.local"
    }
    $value = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
    if (-not $value -or $value -match "your-project|your-anon") {
      throw "Variable $key non configurée dans .env.local"
    }

    Write-Host "Sync env Vercel (production) : $key" -ForegroundColor DarkGray
    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $value | npx vercel env add $key production --force 2>&1 | Out-Null
    $ErrorActionPreference = $prevErrorAction
    if ($LASTEXITCODE -ne 0) {
      throw "Echec vercel env add $key"
    }
  }
}

if (-not $SkipEnvSync) {
  Sync-VercelEnvFromLocal -Path $EnvFile
} else {
  Write-Host "Sync env ignoree (-SkipEnvSync)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Build local (verification)..." -ForegroundColor DarkGray
npm run build
if ($LASTEXITCODE -ne 0) {
  throw "Build local echoue - corrige avant deploy."
}

Set-Location $Root

Write-Host ""
if ($PreviewOnly) {
  Write-Host "Deploy preview..." -ForegroundColor Cyan
  npx vercel deploy --yes
} else {
  Write-Host "Deploy production..." -ForegroundColor Cyan
  npx vercel deploy --prod --yes
}
if ($LASTEXITCODE -ne 0) {
  throw "Deploy Vercel echoue."
}

if (-not $PreviewOnly -and -not $SkipDomain) {
  Write-Host ""
  Write-Host "Association domaine $Domain ..." -ForegroundColor Cyan
  Set-Location $AdminDir
  npx vercel domains add $Domain $ProjectName 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Domaine peut-etre deja configure - verifie Domains dans le dashboard Vercel." -ForegroundColor Yellow
  }
  Set-Location $Root
}

Write-Host ""
Write-Host "Deploy termine." -ForegroundColor Green
Write-Host "  Production : https://$Domain (apres propagation DNS)" -ForegroundColor Green
Write-Host "  Dashboard  : https://vercel.com/dashboard" -ForegroundColor DarkGray
Write-Host ""
Write-Host "DNS (chez ton registrar losange.app) :" -ForegroundColor Yellow
Write-Host "  Type CNAME  Name admin  Value cname.vercel-dns.com"
Write-Host ""
