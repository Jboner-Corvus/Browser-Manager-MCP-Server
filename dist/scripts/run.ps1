# ==============================================================================
# CONSOLE DE GESTION - BROWSER MANAGER MCP SERVER v5.0
# - Serveur MCP spécialisé dans la gestion et l'automatisation des navigateurs web.
# - Docker Bake est maintenant utilisé par défaut pour toutes les constructions.
# - Simplification du menu et refactorisation pour plus de clarté.
# ==============================================================================

param(
    [string]$Action
)

# --- Configuration Stricte et Gestion des Erreurs ---
$ErrorActionPreference = "Stop"
$PSDefaultParameterValues['*:ErrorAction'] = 'Stop'

# --- Variables Globales ---
$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$COMPOSE_FILE = Join-Path $PROJECT_ROOT "docker-compose.yml"
$ENV_FILE = Join-Path $PROJECT_ROOT ".env"
$ENV_EXAMPLE_FILE = Join-Path $PROJECT_ROOT ".env.example"

$ALL_MANAGEABLE_MODULES_ARRAY = @("fastmcp-server", "worker", "redis")

# ==============================================================================
# Fonctions Utilitaires et Logging
# ==============================================================================

function Write-Log {
    param (
        [string]$TypeTag,
        [string]$Message
    )
    $Color = switch ($TypeTag) {
        "INFO" { "Cyan" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "CMD" { "DarkCyan" }
        "SYSTEM" { "DarkBlue" }
        "PNPM" { "DarkGreen" }
        default { "White" }
    }
    $Symbol = switch ($TypeTag) {
        "INFO" { "[INFO]" }
        "WARN" { "[WARN]" }
        "ERROR" { "[ERROR]" }
        "SUCCESS" { "[OK]" }
        "CMD" { "[CMD]" }
        "SYSTEM" { "[SYS]" }
        "PNPM" { "[PNPM]" }
        default { "[i]" }
    }
    Write-Host "$Symbol [$((Get-Date).ToString('HH:mm:ss'))] [$TypeTag] $Message" -ForegroundColor $Color
}

function Write-ErrorExit {
    param ([string]$Message, [int]$ExitCode = 1)
    Write-Log "ERROR" $Message
    exit $ExitCode
}

function Ensure-EnvFile {
    if (-not (Test-Path $ENV_FILE)) {
        Write-Log "WARN" "Fichier de configuration $ENV_FILE manquant."
        if (Test-Path $ENV_EXAMPLE_FILE) {
            Write-Log "SYSTEM" "Création de $ENV_FILE depuis $ENV_EXAMPLE_FILE..."
            Copy-Item $ENV_EXAMPLE_FILE $ENV_FILE
            Write-Log "WARN" "$ENV_FILE créé. Veuillez le personnaliser avant de continuer !"
            Read-Host "Appuyez sur Entrée pour continuer après édition"
        } else {
            Write-ErrorExit "Fichier modèle $ENV_EXAMPLE_FILE introuvable."
        }
    }
}

function Check-Dependencies {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-ErrorExit "Dépendance 'docker' non trouvée. Veuillez l'installer." }
    if (-not (docker compose version 2>$null)) { Write-ErrorExit "Dépendance 'docker compose' (v2+) non trouvée." }
    Write-Log "SUCCESS" "Dépendances Docker et Docker Compose vérifiées."
}

# ==============================================================================
# Fonctions pour les Actions du Menu
# ==============================================================================

function Action-Start {
    Ensure-EnvFile
    Write-Log "INFO" "Démarrage des services (construction avec Bake par défaut)..."
    Write-Log "CMD" "$env:COMPOSE_BAKE = 'true'; docker compose -f `"$COMPOSE_FILE`" up --build -d"
    $env:COMPOSE_BAKE = 'true'
    docker compose -f "$COMPOSE_FILE" up --build -d
    Write-Log "SUCCESS" "Services démarrés. Utilisez l'option 'Statut' ou 'Logs' pour vérifier."
}

function Action-RestartAll {
    Write-Log "INFO" "Redémarrage complet : arrêt, reconstruction (avec Bake) et démarrage."
    Write-Log "CMD" "docker compose -f `"$COMPOSE_FILE`" down"
    docker compose -f "$COMPOSE_FILE" down
    Write-Log "CMD" "$env:COMPOSE_BAKE = 'true'; docker compose -f `"$COMPOSE_FILE`" up --build -d"
    $env:COMPOSE_BAKE = 'true'
    docker compose -f "$COMPOSE_FILE" up --build -d
    Write-Log "SUCCESS" "Tous les services ont été redémarrés avec les derniers changements."
}

function Action-Stop {
    Write-Log "INFO" "Arrêt de tous les services Docker..."
    Write-Log "CMD" "docker compose -f `"$COMPOSE_FILE`" down"
    docker compose -f "$COMPOSE_FILE" down
    Write-Log "SUCCESS" "Services arrêtés."
}

function Action-RebuildNoCache {
    Write-Log "WARN" "Reconstruction forcée des images avec Bake (SANS CACHE)..."
    Write-Log "CMD" "$env:COMPOSE_BAKE = 'true'; docker compose -f `"$COMPOSE_FILE`" build --no-cache"
    $env:COMPOSE_BAKE = 'true'
    docker compose -f "$COMPOSE_FILE" build --no-cache
    Write-Log "INFO" "Démarrage automatique des services avec les nouvelles images..."
    Write-Log "CMD" "docker compose -f `"$COMPOSE_FILE`" up -d"
    docker compose -f "$COMPOSE_FILE" up -d
    Write-Log "SUCCESS" "Services démarrés avec les images reconstruites."
}

function Action-ShowStatus {
    Write-Log "INFO" "Statut des conteneurs Docker :"
    docker compose -f "$COMPOSE_FILE" ps
}

function Action-ShowLogs {
    Write-Log "INFO" "Affichage des journaux en continu (Ctrl+C pour quitter)..."
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
}

function Action-ShellAccess {
    $PS3 = "Choisissez le conteneur pour l'accès shell : "
    $selected = $null
    do {
        for ($i = 0; $i -lt $ALL_MANAGEABLE_MODULES_ARRAY.Length; $i++) {
            Write-Host "$($i+1)) $($ALL_MANAGEABLE_MODULES_ARRAY[$i])"
        }
        $choice = Read-Host "Votre choix"
        if ($choice -match '^\d+$' -and [int]$choice -ge 1 -and [int]$choice -le $ALL_MANAGEABLE_MODULES_ARRAY.Length) {
            $selected = $ALL_MANAGEABLE_MODULES_ARRAY[[int]$choice - 1]
        } else {
            Write-Log "WARN" "Sélection invalide."
        }
    } while (-not $selected)

    Write-Log "INFO" "Ouverture d'un shell dans le conteneur '$selected'..."
    Write-Log "CMD" "docker compose -f `"$COMPOSE_FILE`" exec `"$selected`" /bin/bash"
    try {
        docker compose -f "$COMPOSE_FILE" exec "$selected" /bin/bash
    } catch {
        docker compose -f "$COMPOSE_FILE" exec "$selected" /bin/sh
    }
}

function Action-CleanDocker {
    Write-Log "WARN" "Cette action va supprimer tous les conteneurs ET VOLUMES associés à ce projet."
    $confirm = Read-Host "Êtes-vous sûr de vouloir continuer? (o/N)"
    if ($confirm -match "^[oO]$") {
        Write-Log "INFO" "Nettoyage du projet Docker (conteneurs, volumes)..."
        Write-Log "CMD" "docker compose -f `"$COMPOSE_FILE`" down -v --remove-orphans"
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
        Write-Log "SUCCESS" "Nettoyage terminé."
    } else {
        Write-Log "INFO" "Nettoyage annulé."
    }
}

function Run-PnpmScript {
    param ([string]$ScriptName, [string]$ScriptDesc)
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Write-ErrorExit "'pnpm' non trouvé. Veuillez l'installer." }

    Write-Log "PNPM" "Lancement du script '$ScriptName' ($ScriptDesc)..."
    Write-Log "CMD" "pnpm run $ScriptName"
    Push-Location $PROJECT_ROOT
    try {
        & pnpm run $ScriptName
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) {
            Write-Log "SUCCESS" "Script '$ScriptName' terminé avec succès."
        } else {
            Write-Log "ERROR" "Le script '$ScriptName' a échoué avec le code de sortie $exitCode."
        }
    } finally {
        Pop-Location
    }
}

function Action-CleanDevEnvironment {
    Write-Log "WARN" "Cette action va supprimer node_modules, dist, et pnpm-lock.yaml."
    Write-Log "WARN" "Elle arrêtera également les conteneurs Docker pour libérer les fichiers."
    $confirm = Read-Host "Êtes-vous sûr de vouloir réinitialiser l'environnement de développement ? (o/N)"
    if ($confirm -notmatch "^[oO]$") {
        Write-Log "INFO" "Nettoyage annulé."
        return
    }

    Write-Log "INFO" "Arrêt des conteneurs pour libérer les fichiers..."
    Write-Log "CMD" "docker compose -f `"$COMPOSE_FILE`" down"
    docker compose -f "$COMPOSE_FILE" down
    Write-Log "SUCCESS" "Conteneurs arrêtés."

    Write-Log "INFO" "Suppression des dossiers de développement..."
    $itemsToRemove = @("node_modules", "dist", "pnpm-lock.yaml")
    foreach ($item in $itemsToRemove) {
        $path = Join-Path $PROJECT_ROOT $item
        if (Test-Path $path) {
            Remove-Item -Recurse -Force $path
        }
    }
    Write-Log "SUCCESS" "Anciens dossiers et fichiers supprimés."

    Write-Log "PNPM" "Réinstallation propre des dépendances..."
    Write-Log "CMD" "pnpm install"
    Push-Location $PROJECT_ROOT
    try {
        & pnpm install
        if ($LASTEXITCODE -eq 0) {
            Write-Log "SUCCESS" "Dépendances réinstallées. L'environnement de développement est propre."
        } else {
            Write-ErrorExit "Échec de la réinstallation des dépendances."
        }
    } finally {
        Pop-Location
    }
}

# ==============================================================================
# UI du Menu
# ==============================================================================
function Show-Menu {
    Clear-Host
    Write-Host @"
╔═════════════════════╗
║  ███╗   ███╗██████╗ ║
║  ████╗ ████║╚════██╗║
║  ██╔████╔██║ █████╔╝║
║  ██║╚██╔╝██║██╔═══╝ ║
║  ██║ ╚═╝ ██║███████╗║
║  ╚═╝     ╚═╝╚══════╝║
╚═════════════════════╝
"@ -ForegroundColor Magenta
    Write-Host "       >>> CONSOLE DE GESTION - BROWSER MANAGER MCP SERVER v5.0 <<<" -ForegroundColor Yellow
    Write-Host "────────────────────────────────────────────────────────"
    Write-Host -ForegroundColor Cyan " Gestion Docker & Services"
    Write-Host "  1) [START] Démarrer / Mettre à jour (avec Bake)"
    Write-Host "  2) [RESTART] Redémarrer (Arrêt + Build + Démarrage)"
    Write-Host "  3) [STOP] Arrêter tous les services"
    Write-Host "  4) [BUILD] Reconstruire les images (SANS CACHE)"
    Write-Host ""
    Write-Host -ForegroundColor Cyan " Diagnostic & Maintenance"
    Write-Host "  5) [STATUS] Afficher le statut"
    Write-Host "  6) [LOGS] Afficher les logs"
    Write-Host "  7) [SHELL] Accéder au shell d'un conteneur"
    Write-Host "  8) [CLEAN] Nettoyer le projet Docker (avec volumes)"
    Write-Host ""
    Write-Host -ForegroundColor Cyan " Qualité & Développement (Hôte Local)"
    Write-Host " 10) [LINT] Linter le code (lint)"
    Write-Host " 11) [FORMAT] Formater le code (format)"
    Write-Host " 12) [TEST] Lancer les tests (test)"
    Write-Host " 13) [TYPES] Vérifier les types (check-types)"
    Write-Host " 14) [CLEAN-DEV] Nettoyer l'environnement de Dev"
    Write-Host ""
    Write-Host " 15) [QUIT] Quitter" -ForegroundColor Red
    Write-Host "────────────────────────────────────────────────────────"
}

# ==============================================================================
# Boucle Principale
# ==============================================================================
function Main {
    try {
        Check-Dependencies
        Ensure-EnvFile

        while ($true) {
            Show-Menu
            $choice = Read-Host "Votre choix"

            switch ($choice) {
                1 { Action-Start }
                2 { Action-RestartAll }
                3 { Action-Stop }
                4 { Action-RebuildNoCache }
                5 { Action-ShowStatus }
                6 { Action-ShowLogs }
                7 { Action-ShellAccess }
                8 { Action-CleanDocker }
                10 { Run-PnpmScript "lint" "Analyse statique du code" }
                11 { Run-PnpmScript "format" "Formatage du code avec Prettier" }
                12 { Run-PnpmScript "test" "Exécution de la suite de tests" }
                13 { Run-PnpmScript "check-types" "Vérification des types TypeScript" }
                14 { Action-CleanDevEnvironment }
                15 {
                    Write-Host "Au revoir!" -ForegroundColor Green
                    exit 0
                }
                default {
                    Write-Host "Choix invalide. Veuillez réessayer." -ForegroundColor Red
                }
            }
            Read-Host "`nAppuyez sur Entrée pour retourner au menu"
        }
    } catch {
        Write-ErrorExit "Erreur inattendue: $($_.Exception.Message)"
    }
}

# --- Analyse des arguments de ligne de commande ---
if ($Action) {
    switch ($Action.ToLower()) {
        "start" { Action-Start; exit }
        "restart" { Action-RestartAll; exit }
        "stop" { Action-Stop; exit }
        "rebuild" { Action-RebuildNoCache; exit }
        "status" { Action-ShowStatus; exit }
        "logs" { Action-ShowLogs; exit }
        "shell" { Action-ShellAccess; exit }
        "clean" { Action-CleanDocker; exit }
        "lint" { Run-PnpmScript "lint" "Analyse statique du code"; exit }
        "format" { Run-PnpmScript "format" "Formatage du code avec Prettier"; exit }
        "test" { Run-PnpmScript "test" "Exécution de la suite de tests"; exit }
        "check-types" { Run-PnpmScript "check-types" "Vérification des types TypeScript"; exit }
        "clean-dev" { Action-CleanDevEnvironment; exit }
        default {
            Write-Log "ERROR" "Action inconnue: $Action"
            Write-Host "Actions disponibles: start, restart, stop, rebuild, status, logs, shell, clean, lint, format, test, check-types, clean-dev"
            exit 1
        }
    }
}

# --- Point d'entrée du script ---
Main