# Script de build manuel pour l'extension Browser Manager MCP
# Utilisez ce script si run-dev.ps1 ne fonctionne pas correctement

param(
    [switch]$Clean,
    [switch]$Verbose
)

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Build-Extension {
    Write-ColorOutput "🔧 Build manuel de l'extension Browser Manager MCP..." "Cyan"
    Write-ColorOutput "=================================================" "Yellow"

    try {
        # Nettoyage si demandé
        if ($Clean) {
            Write-ColorOutput "🧹 Nettoyage du dossier dist/extension..." "Yellow"
            if (Test-Path "dist\extension") {
                Remove-Item -Recurse -Force "dist\extension"
                Write-ColorOutput "✅ Dossier dist/extension nettoyé" "Green"
            }
        }

        # Build de l'extension
        Write-ColorOutput "📦 Build de l'extension dans le dossier extension/..." "Yellow"
        Set-Location extension
        $npmResult = npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ Erreur lors du build de l'extension:" "Red"
            Write-ColorOutput $npmResult "Red"
            Set-Location ..
            return $false
        }
        Write-ColorOutput "✅ Extension buildée avec succès" "Green"

        # Copie des fichiers
        Write-ColorOutput "📋 Copie des fichiers de l'extension vers dist/extension..." "Yellow"
        Set-Location ..

        # Création du dossier dist/extension s'il n'existe pas
        if (!(Test-Path "dist\extension")) {
            New-Item -ItemType Directory -Force -Path "dist\extension" | Out-Null
        }

        # Copie de tous les fichiers générés
        if (Test-Path "extension\dist\extension") {
            Copy-Item "extension\dist\extension\*" "dist\extension\" -Recurse -Force
            Write-ColorOutput "✅ Fichiers copiés avec succès" "Green"
        } else {
            Write-ColorOutput "❌ Le dossier extension\dist\extension n'existe pas" "Red"
            return $false
        }

        # Vérification des fichiers critiques
        Write-ColorOutput "🔍 Vérification des fichiers critiques..." "Yellow"
        $criticalFiles = @(
            "dist\extension\manifest.json",
            "dist\extension\lib\background.mjs",
            "dist\extension\popup.js",
            "dist\extension\popup.html",
            "dist\extension\status.js",
            "dist\extension\connect.js"
        )

        $allFilesExist = $true
        foreach ($file in $criticalFiles) {
            if (Test-Path $file) {
                Write-ColorOutput "  ✅ $file" "Green"
            } else {
                Write-ColorOutput "  ❌ $file (MANQUANT)" "Red"
                $allFilesExist = $false
            }
        }

        if ($allFilesExist) {
            Write-ColorOutput "" "White"
            Write-ColorOutput "🎉 Build de l'extension terminé avec succès !" "Green"
            Write-ColorOutput "" "White"
            Write-ColorOutput "📋 Extension prête à être chargée:" "Cyan"
            Write-ColorOutput "   1. Ouvrez chrome://extensions/" "White"
            Write-ColorOutput "   2. Activez le 'Mode développeur'" "White"
            Write-ColorOutput "   3. Cliquez sur 'Charger l'extension non empaquetée'" "White"
            Write-ColorOutput "   4. Sélectionnez le dossier: dist\extension" "White"
            Write-ColorOutput "" "White"
            return $true
        } else {
            Write-ColorOutput "❌ Build échoué - fichiers manquants" "Red"
            return $false
        }

    } catch {
        Write-ColorOutput "❌ Erreur inattendue: $($_.Exception.Message)" "Red"
        if ($Verbose) {
            Write-ColorOutput "Détails de l'erreur: $($_.Exception.ToString())" "Red"
        }
        return $false
    } finally {
        # Retour au dossier principal
        Set-Location (Split-Path $PSScriptRoot -Parent)
    }
}

# Exécution du build
$success = Build-Extension

if ($success) {
    Write-ColorOutput "✅ Script terminé avec succès" "Green"
    exit 0
} else {
    Write-ColorOutput "❌ Script terminé avec des erreurs" "Red"
    exit 1
}