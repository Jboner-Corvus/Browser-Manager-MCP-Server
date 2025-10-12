# Script d'installation automatique pour Windows
# Browser Manager MCP Server

param(
    [switch]$Dev,
    [switch]$Force
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Browser Manager MCP Server - Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Node.js est installé
Write-Host "Vérification des prérequis..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js trouvé : $nodeVersion" -ForegroundColor Green
    
    # Vérifier la version minimale (24.0.2)
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 24) {
        Write-Host "⚠ Node.js version $nodeVersion est trop ancienne. Version 24.0.2 ou supérieure requise." -ForegroundColor Red
        Write-Host "Veuillez télécharger une version plus récente depuis https://nodejs.org" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "Veuillez télécharger et installer Node.js depuis https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Vérifier pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "✓ pnpm trouvé : $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ pnpm n'est pas installé. Installation en cours..." -ForegroundColor Yellow
    try {
        npm install -g pnpm
        $pnpmVersion = pnpm --version
        Write-Host "✓ pnpm installé : $pnpmVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Échec de l'installation de pnpm. Utilisation de npm à la place." -ForegroundColor Yellow
        $UseNpm = $true
    }
}

# Vérifier si nous sommes dans le bon dossier
if (-not (Test-Path "package.json")) {
    Write-Host "✗ package.json non trouvé. Êtes-vous dans le bon dossier ?" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installation des dépendances..." -ForegroundColor Yellow

# Nettoyer si demandé
if ($Force) {
    Write-Host "Nettoyage des fichiers existants..." -ForegroundColor Yellow
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force node_modules
        Write-Host "✓ node_modules supprimé" -ForegroundColor Green
    }
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force dist
        Write-Host "✓ dist supprimé" -ForegroundColor Green
    }
}

# Installer les dépendances
if ($UseNpm) {
    Write-Host "Installation avec npm..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Échec de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Installation avec pnpm..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Échec de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Dépendances installées" -ForegroundColor Green

# Build si mode développement
if ($Dev) {
    Write-Host ""
    Write-Host "Compilation du projet..." -ForegroundColor Yellow
    
    if ($UseNpm) {
        npm run build
    } else {
        pnpm run build
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Échec de la compilation" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Projet compilé avec succès" -ForegroundColor Green
}

# Configuration de l'environnement
Write-Host ""
Write-Host "Configuration de l'environnement..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    try {
        copy .env.example .env
        Write-Host "✓ Fichier .env créé à partir de .env.example" -ForegroundColor Green
        Write-Host "⚠ N'oubliez pas d'éditer le fichier .env avec vos configurations !" -ForegroundColor Yellow
    } catch {
        Write-Host "✗ Impossible de copier .env.example vers .env" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Fichier .env déjà existant" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation terminée avec succès !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Dev) {
    Write-Host "Pour démarrer en mode développement :" -ForegroundColor Cyan
    Write-Host "  pnpm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Pour démarrer le serveur uniquement :" -ForegroundColor Cyan
    Write-Host "  pnpm start" -ForegroundColor White
} else {
    Write-Host "Pour démarrer le serveur de production :" -ForegroundColor Cyan
    Write-Host "  .\scripts\start-prod.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou directement :" -ForegroundColor Cyan
    Write-Host "  node server.js" -ForegroundColor White
}

Write-Host ""
Write-Host "Le serveur sera disponible sur : http://localhost:8081/sse" -ForegroundColor Green
Write-Host ""
Write-Host "Documentation complète : INSTALLATION-WINDOWS.md" -ForegroundColor Cyan
