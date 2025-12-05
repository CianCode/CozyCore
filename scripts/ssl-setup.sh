#!/bin/bash

# SSL Setup Script for CozyCore
# Run this after DNS is pointed to your server

set -e

DOMAIN="sorava.dev"
EMAIL="${1:-admin@sorava.dev}"

cd /opt/cozycore

echo "🔐 Setting up SSL certificates for $DOMAIN..."

# Create a temporary nginx config for initial certificate
cat > nginx-init.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name sorava.dev www.sorava.dev;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'CozyCore is setting up...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Start temporary nginx for certificate validation
echo "🌐 Starting temporary nginx for certificate validation..."
docker run -d --name nginx-init \
    -p 80:80 \
    -v $(pwd)/nginx-init.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot:ro \
    nginx:alpine

# Wait for nginx to start
sleep 5

# Get certificate
echo "📜 Requesting SSL certificate..."
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Stop temporary nginx
echo "🛑 Stopping temporary nginx..."
docker stop nginx-init
docker rm nginx-init
rm nginx-init.conf

echo ""
echo "✅ SSL Setup Complete!"
echo ""
echo "📋 You can now start the full application:"
echo "   cd /opt/cozycore"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
