# Losange — Reset Supabase schema zero (PowerShell)
# Usage : depuis la racine du repo, apres avoir lie le projet (`supabase link`)
#
# Ce script ne lance PAS le SQL destructif automatiquement (securite).
# Il affiche la procedure et verifie l etat apres vos etapes manuelles.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ""
Write-Host "=== LOSANGE — Reset schema zero Supabase ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Etapes MANUELLES dans Supabase Dashboard > SQL Editor :" -ForegroundColor Yellow
Write-Host "  1. Executer : supabase/scripts/nuclear_reset.sql"
Write-Host "  2. Executer : supabase/schema.sql (fichier complet)"
Write-Host "  3. Executer : supabase/scripts/nuclear_mark_migrations.sql"
Write-Host ""
Write-Host "Puis redeployer les Edge Functions :" -ForegroundColor Yellow
Write-Host "  supabase functions deploy master-admin-crud"
Write-Host "  supabase functions deploy terrain-sync"
Write-Host "  supabase functions deploy terrain-login"
Write-Host ""
Write-Host "Mobile : deconnexion + effacer donnees de l app (SQLite local)."
Write-Host ""

$reply = Read-Host "As-tu termine les 3 etapes SQL dans le Dashboard ? (o/N)"
if ($reply -notmatch '^[oOyY]') {
  Write-Host "Annule. Reviens quand les 3 scripts SQL sont executes." -ForegroundColor DarkYellow
  exit 0
}

Write-Host ""
Write-Host "Verification CLI (projet lie)..." -ForegroundColor Cyan
npx supabase migration list 2>&1

Write-Host ""
Write-Host "Si toutes les migrations sont 'applied', le reset est OK." -ForegroundColor Green
Write-Host "Tu peux recreer entreprises / profils / unites via losange-master.expo.app"
Write-Host ""
