# sync-public.ps1
# Sincroniza frontend/ al repositorio público four-points-public/
# Ejecutar desde la raíz de Four-Points/
# cd C:\Users\dz\projects\Four-Points
# .\sync-public.ps1

$source = ".\frontend"
$dest = "..\four-points-public"

# Verificar que el destino existe
if (-not (Test-Path $dest)) {
    Write-Host "ERROR: No existe $dest" -ForegroundColor Red
    Write-Host "Primero clona o crea el repo publico en esa ubicacion" -ForegroundColor Yellow
    exit 1
}

# Archivos y carpetas a excluir
$excludeDirs = @("node_modules", ".next", "docs")
$excludeFiles = @(".env", ".env.local", ".env.production", ".env.development")

# Construir argumentos de exclusión
$xdArgs = ($excludeDirs | ForEach-Object { "/XD"; $_ }) -join " "
$xfArgs = ($excludeFiles | ForEach-Object { "/XF"; $_ }) -join " "

Write-Host "Sincronizando frontend/ -> four-points-public/" -ForegroundColor Cyan
Write-Host "Excluyendo: $excludeDirs, $excludeFiles" -ForegroundColor Gray

# Ejecutar robocopy
# /MIR = Mirror (copia y elimina archivos que ya no existen en origen)
# /XD = Excluir directorios
# /XF = Excluir archivos
robocopy $source $dest /MIR /XD node_modules .next docs /XF .env .env.local .env.production .env.development

Write-Host ""
Write-Host "Sincronizado!" -ForegroundColor Green
Write-Host "Ahora ve a $dest y ejecuta:" -ForegroundColor Yellow
Write-Host "  cd $dest" -ForegroundColor White
Write-Host "  git status" -ForegroundColor White
Write-Host "  git add -A && git commit -m 'Sync from monorepo' && git push" -ForegroundColor White
