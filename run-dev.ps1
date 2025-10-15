# Script de développement pour Browser Manager MCP Server
# Construit le projet et l'extension

# Construction du projet
Write-Host "Construction du projet..." -ForegroundColor Green
npm run build

# Vérification que la construction a réussi
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la construction du projet" -ForegroundColor Red
    exit 1
}

Write-Host "Construction terminée avec succès" -ForegroundColor Green

# Empaquetage du projet
Write-Host "Empaquetage du projet..." -ForegroundColor Green
npm run package

# Vérification que l'empaquetage a réussi
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de l'empaquetage du projet" -ForegroundColor Red
    exit 1
}

Write-Host "Empaquetage terminé avec succès" -ForegroundColor Green