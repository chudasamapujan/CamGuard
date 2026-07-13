#!/usr/bin/env bash
# ==============================================================================
# CamGuard Enterprise - AWS EC2 (Ubuntu 22.04 LTS) Server Setup Script
# ==============================================================================
# Run as root or with sudo: sudo bash deployment/setup.sh
# ==============================================================================

set -e

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

echo -e "${GREEN}[+] Starting AWS EC2 Ubuntu 22.04 Environment Setup for CamGuard...${NC}"

# 1. Update system packages
echo -e "${YELLOW}[*] Updating system packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release git ufw tar gzip cron

# 2. Install Docker Engine and Docker Compose V2 Plugin
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[*] Installing Docker Engine & Docker Compose V2...${NC}"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
else
    echo -e "${GREEN}[+] Docker is already installed (${NC}$(docker --version)${GREEN})${NC}"
fi

# 3. Add current non-root user to docker group if running under sudo
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    usermod -aG docker "$SUDO_USER"
    echo -e "${GREEN}[+] Added user '$SUDO_USER' to docker group.${NC}"
fi

# 4. Configure UFW Firewall
echo -e "${YELLOW}[*] Configuring UFW Firewall rules...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}[+] UFW Firewall enabled: OpenSSH (22), HTTP (80), HTTPS (443) open.${NC}"

# 5. Create Application Directory Structure
APP_DIR="/opt/camguard"
echo -e "${YELLOW}[*] Preparing application directory at $APP_DIR...${NC}"
mkdir -p "$APP_DIR/data" "$APP_DIR/logs" "$APP_DIR/backups"
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    chown -R "$SUDO_USER:$SUDO_USER" "$APP_DIR"
fi
chmod -R 775 "$APP_DIR"

echo -e "${GREEN}[+] Setup Completed Successfully! You can now clone/deploy CamGuard to $APP_DIR.${NC}"
