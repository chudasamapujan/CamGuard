#!/bin/sh
set -e

# Ensure TLS certificate directory exists
mkdir -p /etc/nginx/certs

# Generate default self-signed certificate if neither server.crt nor server.key exist
if [ ! -f /etc/nginx/certs/server.crt ] || [ ! -f /etc/nginx/certs/server.key ]; then
    echo "[+] TLS certificates not found or incomplete. Generating 2048-bit RSA self-signed TLS certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/certs/server.key \
        -out /etc/nginx/certs/server.crt \
        -subj "/C=US/ST=CA/L=SanFrancisco/O=CamGuard Enterprise/CN=localhost"
    chmod 600 /etc/nginx/certs/server.key
    chmod 644 /etc/nginx/certs/server.crt
    echo "[+] Self-signed TLS certificate generated at /etc/nginx/certs/server.crt"
fi

# Execute CMD
exec "$@"
