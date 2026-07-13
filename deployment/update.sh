#!/usr/bin/env bash
# ==============================================================================
# CamGuard Enterprise - Automated Zero-Downtime Update Script
# ==============================================================================
# Run inside project root or deployment folder: bash deployment/update.sh
# ==============================================================================

set -e

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

if [ ! -f "docker-compose.yml" ] && [ -f "../docker-compose.yml" ]; then
    cd ..
fi

echo -e "${YELLOW}[*] Starting automated CamGuard system update...${NC}"

# 1. Trigger database and log backup before updating
if [ -f "deployment/backup.sh" ]; then
    echo -e "${YELLOW}[*] Creating pre-update backup...${NC}"
    bash deployment/backup.sh
fi

# 2. Pull latest git repository changes
echo -e "${YELLOW}[*] Fetching latest changes from git repository...${NC}"
if [ -d ".git" ]; then
    git pull origin main || git pull
else
    echo -e "${YELLOW}[!] Not a git repository or no tracking branch. Skipping git pull.${NC}"
fi

# 3. Rebuild containers with new code
echo -e "${YELLOW}[*] Rebuilding production Docker containers...${NC}"
docker compose up --build -d --remove-orphans

# 4. Clean up unused/dangling docker images
echo -e "${YELLOW}[*] Cleaning up old unused Docker images...${NC}"
docker image prune -f

# 5. Verify service health
echo -e "${YELLOW}[*] Verifying health check status after update...${NC}"
for i in {1..20}; do
    if curl -s -f http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}[+] Update complete! All services are running and healthy.${NC}"
        docker compose ps
        exit 0
    fi
    sleep 1
done

echo -e "${RED}[x] Warning: Services did not report healthy status within 20s. Check logs with 'docker compose logs'.${NC}"
exit 1
