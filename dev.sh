#!/usr/bin/env bash

# ==============================================================================
# AulaPlay Development Runner
# Permite iniciar AulaPlay en modo LOCAL o HOSTED (simulado)
# ==============================================================================

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Error: Bun no está instalado o no se encuentra en el PATH.${NC}"
    echo -e "Instálalo con: ${CYAN}curl -fsSL https://bun.sh/install | bash${NC}"
    exit 1
fi

# Determine Mode
MODE_ARG="$1"

if [ -z "$MODE_ARG" ]; then
    echo -e "${BOLD}${CYAN}"
    echo "  ╔════════════════════════════════════════════════════════════╗"
    echo "  ║                   🎮 AulaPlay Launcher                     ║"
    echo "  ║        Gamificación Educativa & Mecánicas en Vivo          ║"
    echo "  ╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${BOLD}Selecciona el modo de ejecución:${NC}"
    echo -e "  ${GREEN}1)${NC} ${BOLD}Modo Local (Docente / Proyección Datashow)${NC}"
    echo -e "     - Ideal para clases presenciales con un solo dispositivo."
    echo -e "     - Usuario por defecto: ${CYAN}docente${NC} / ${CYAN}docente123${NC}"
    echo -e "     - Cero configuración de red requerida."
    echo ""
    echo -e "  ${MAGENTA}2)${NC} ${BOLD}Modo Hosted Simulado (Multidispositivo en red)${NC}"
    echo -e "     - Permite a los alumnos unirse desde sus teléfonos con código PIN."
    echo -e "     - Panel Webmaster habilitado (Genera credenciales semilla)."
    echo -e "     - Solicitud de registro docente y foro comunitario."
    echo ""
    read -p "Ingresa tu opción [1 o 2] (Default: 1): " CHOICE

    case "$CHOICE" in
        2|"hosted"|"HOSTED")
            MODE="hosted"
            ;;
        *)
            MODE="local"
            ;;
    esac
else
    case "$MODE_ARG" in
        hosted|HOSTED|host|server)
            MODE="hosted"
            ;;
        *)
            MODE="local"
            ;;
    esac
fi

# Ensure .env exists or create from example
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Creando archivo .env inicial...${NC}"
    cp .env.example .env
fi

# Ensure data folders exist
mkdir -p data data/.keys data/uploads data/backups

export MODE="$MODE"
export PORT="${PORT:-3000}"
export BASE_URL="http://localhost:${PORT}"
export NODE_ENV="development"

echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$MODE" = "hosted" ]; then
    echo -e "${BOLD}🚀 Iniciando AulaPlay en ${MAGENTA}MODO HOSTED (Simulado)${NC}"
    echo -e "🌐 Alumnos pueden unirse con PIN en la red local"
    echo -e "🛡️  Panel Webmaster activado"
else
    echo -e "${BOLD}🚀 Iniciando AulaPlay en ${GREEN}MODO LOCAL (Docente Autónomo)${NC}"
    echo -e "📽️  Modo optimizado para proyección en pizarra/datashow"
    echo -e "👤 Acceso rápido: ${CYAN}docente${NC} / ${CYAN}docente123${NC}"
fi
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📡 Backend API:     ${CYAN}http://localhost:${PORT}${NC}"
echo -e "💻 Frontend Web:    ${CYAN}http://localhost:5173${NC}"
echo -e "📝 Documentación:   ${CYAN}http://localhost:${PORT}/api/health${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo servicios de AulaPlay...${NC}"
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    if [ -n "$WEB_PID" ]; then
        kill "$WEB_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Servicios detenidos limpiamente.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Run migrations
echo -e "${CYAN}📦 Verificando migraciones SQLite WAL...${NC}"
bun run db:migrate

# 2. Start Backend Server in Background
echo -e "${CYAN}⚡ Iniciando servidor Hono + WebSocket en puerto ${PORT}...${NC}"
bun --watch src/entry.ts &
SERVER_PID=$!

# 3. Start Frontend Vite Server in Background
echo -e "${CYAN}🎨 Iniciando Vite React 19 en puerto 5173...${NC}"
bunx vite apps/web --host &
WEB_PID=$!

# Wait for both processes
wait "$SERVER_PID" "$WEB_PID"
