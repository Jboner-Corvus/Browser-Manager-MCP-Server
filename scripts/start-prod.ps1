# Script de démarrage production pour Browser Manager MCP Server

# Vérifier si .env existe
if (-not (Test-Path ".env")) {
    Write-Host "Erreur: Fichier .env manquant. Copiez .env.example vers .env et configurez-le." -ForegroundColor Red
    exit 1
}

# Définir NODE_ENV=production
$env:NODE_ENV = "production"

Write-Host "Démarrage du serveur en mode production..." -ForegroundColor Green
node lib/server.js
