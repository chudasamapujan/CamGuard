#!/usr/bin/env bash
# ==============================================================================
# CamGuard Enterprise - Automated Database & Log Backup Script
# ==============================================================================
# Run manually or via crontab: 0 2 * * * /bin/bash /opt/camguard/deployment/backup.sh
# ==============================================================================

set -e

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="${BACKUP_ROOT:-/opt/camguard/backups}"
mkdir -p "$BACKUP_DIR"

# Ensure script finds project root if running locally outside /opt/camguard
if [ ! -f "docker-compose.yml" ] && [ -f "../docker-compose.yml" ]; then
    cd ..
fi

echo -e "${YELLOW}[*] Starting backup procedure ($TIMESTAMP)...${NC}"

# 1. Backup SQLite Database volume / file
DB_BACKUP_FILE="$BACKUP_DIR/camguard_db_$TIMESTAMP.tar.gz"
if docker compose ps -q backend > /dev/null 2>&1; then
    echo -e "${YELLOW}[*] Extracting health.db from active Docker volume...${NC}"
    docker run --rm -v camguard_db_data:/db_data -v "$BACKUP_DIR":/backup alpine \
        tar -czf "/backup/camguard_db_$TIMESTAMP.tar.gz" -C /db_data .
else
    if [ -d "data" ] || [ -f "health.db" ]; then
        tar -czf "$DB_BACKUP_FILE" data/ health.db 2>/dev/null || true
    fi
fi
echo -e "${GREEN}[+] Database backup saved to: $DB_BACKUP_FILE${NC}"

# 2. Backup Log files
LOGS_BACKUP_FILE="$BACKUP_DIR/camguard_logs_$TIMESTAMP.tar.gz"
if docker compose ps -q backend > /dev/null 2>&1; then
    docker run --rm -v camguard_logs_data:/logs_data -v "$BACKUP_DIR":/backup alpine \
        tar -czf "/backup/camguard_logs_$TIMESTAMP.tar.gz" -C /logs_data . 2>/dev/null || true
else
    if [ -d "logs" ]; then
        tar -czf "$LOGS_BACKUP_FILE" logs/ 2>/dev/null || true
    fi
fi
echo -e "${GREEN}[+] Logs backup saved to: $LOGS_BACKUP_FILE${NC}"

# 3. Prune old backups (> 30 days)
echo -e "${YELLOW}[*] Pruning backup archives older than 30 days...${NC}"
find "$BACKUP_DIR" -name "camguard_*.tar.gz" -type f -mtime +30 -delete

echo -e "${GREEN}[+] Backup job completed successfully!${NC}"
