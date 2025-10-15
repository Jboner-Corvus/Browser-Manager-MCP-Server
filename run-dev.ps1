# Script de développement pour Browser Manager MCP Server
# Construit le projet et l'extension de manière complète et fiable

Write-Host "🚀 Démarrage du build complet..." -ForegroundColor Cyan

# Nettoyage préalable
Write-Host "🧹 Nettoyage des builds précédents..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✅ Dossier dist nettoyé" -ForegroundColor Green
}

# Construction de l'extension d'abord
Write-Host "🔧 Construction de l'extension..." -ForegroundColor Yellow
Set-Location extension
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la construction de l'extension" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Extension construite avec succès" -ForegroundColor Green
Set-Location ..

# Copie de l'extension
Write-Host "📦 Copie des fichiers de l'extension..." -ForegroundColor Yellow
npm run copy:extension
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la copie de l'extension" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Extension copiée avec succès" -ForegroundColor Green

# Conversion des icônes JPG vers PNG pour Chrome
Write-Host "🎨 Conversion des icônes pour Chrome..." -ForegroundColor Yellow
if (Test-Path "dist\extension\icons") {
    # Copier les vraies icônes JPG depuis extension/build/icons/
    Copy-Item "extension\build\icons\*.jpg" "dist\extension\icons\" -Force -ErrorAction SilentlyContinue

    # Convertir les JPG en PNG pour Chrome
    Add-Type -AssemblyName System.Drawing
    $jpgFiles = Get-ChildItem "dist\extension\icons\*.jpg"
    foreach ($jpg in $jpgFiles) {
        $pngPath = $jpg.FullName -replace '\.jpg$', '.png'
        try {
            $image = [System.Drawing.Image]::FromFile($jpg.FullName)
            $image.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $image.Dispose()
            Write-Host "  ✅ Convertie: $($jpg.Name) -> $($jpg.BaseName).png" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️ Erreur conversion: $($jpg.Name)" -ForegroundColor Yellow
        }
    }
    Write-Host "✅ Icônes converties pour Chrome" -ForegroundColor Green
} else {
    Write-Host "⚠️ Dossier d'icônes non trouvé" -ForegroundColor Yellow
}

# Construction du projet principal
Write-Host "🏗️ Construction du projet principal..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la construction du projet" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Projet construit avec succès" -ForegroundColor Green

# Vérification finale
Write-Host "🔍 Vérification des fichiers générés..." -ForegroundColor Yellow
$extensionExists = Test-Path "dist\extension\manifest.json"
$serverExists = Test-Path "dist\lib\server.js"
$backgroundExists = Test-Path "dist\extension\lib\background.mjs"
$popupExists = Test-Path "dist\extension\popup.js"

if (-not ($extensionExists -and $serverExists -and $backgroundExists -and $popupExists)) {
    Write-Host "❌ Vérification échouée - fichiers manquants" -ForegroundColor Red
    Write-Host "  Extension manifest: $extensionExists" -ForegroundColor Red
    Write-Host "  Server: $serverExists" -ForegroundColor Red
    Write-Host "  Background: $backgroundExists" -ForegroundColor Red
    Write-Host "  Popup: $popupExists" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Build complet terminé avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Fichiers générés :" -ForegroundColor Cyan
Write-Host "  • Serveur MCP: dist/lib/server.js" -ForegroundColor White
Write-Host "  • Extension Chrome: dist/extension/" -ForegroundColor White
Write-Host "  • Manifest: dist/extension/manifest.json" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Pour démarrer le serveur: npm run start" -ForegroundColor Cyan
Write-Host "?? Pour charger l'extension: chrome://extensions/ -> Charger l'extension non empaquet�e -> dist/extension/" -ForegroundColor Cyan
