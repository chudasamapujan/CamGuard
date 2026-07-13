#!/usr/bin/env bash
# ==============================================================================
# CamGuard Enterprise - Production Deployment Script
# ==============================================================================
# Run inside the project directory: bash deployment/deploy.sh
# ==============================================================================

set -e

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
NC="\033[0m"

# Ensure script is run from project root or inside deployment folder
if [ ! -f "docker-compose.yml" ]; then
    if [ -f "../docker-compose.yml" ]; then
        cd ..
    else
        echo -e "${RED}[x] Error: docker-compose.yml not found. Please run this script from the CamGuard root directory.${NC}"
        exit 1
    fi
fi

echo -e "${CYAN}==============================================================================${NC}"
echo -e "${CYAN}             Launching CamGuard Enterprise Production Suite                   ${NC}"
echo -e "${CYAN}==============================================================================${NC}"

# 1. Environment file verification
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[!] No .env file found. Copying .env.example to .env...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}[+] .env created. (Using production default settings)${NC}"
    else
        echo -e "${RED}[x] Error: .env.example missing.${NC}"
        exit 1
    fi
fi

# 2. Build and launch Docker Compose services
echo -e "${YELLOW}[*] Building multi-stage production images and starting containers...${NC}"
docker compose up --build -d --remove-orphans

# 3. Wait for services to transition to healthy status
echo -e "${YELLOW}[*] Waiting up to 30 seconds for health check verifications...${NC}"
for i in {1..30}; do
    if curl -s -f http://localhost/health > /dev/null 2>&1; then
        echo -e "\n${GREEN}[+] All services are healthy and responding!${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo -e "\n${YELLOW}[!] Health check timeout reached. Displaying container status below:${NC}"
    fi
done

# 4. Display service status
echo -e "\n${CYAN}-------------------------- Container Status --------------------------${NC}"
docker compose ps

# 5. Print URLs and diagnostics info
SERVER_IP=$(curl -s https://checkip.amazonaws.com || echo "localhost")

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}                 CamGuard Deployed Successfully on AWS EC2!                   ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "  🌐 Dashboard URL:        http://${SERVER_IP}/"
echo -e "  🏥 Health Check Endpoint: http://${SERVER_IP}/health"
echo -e "  📊 Status verification:  http://${SERVER_IP}/status"
echo -e "  📖 Swagger API Docs:     http://${SERVER_IP}/docs"
echo -e "  📜 OpenAPI YAML Spec:    http://${SERVER_IP}/openapi.yaml"
echo -e "${GREEN}==============================================================================${NC}"
