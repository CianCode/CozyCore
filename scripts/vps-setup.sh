#!/bin/bash

# CozyCore VPS Setup Script
# Run this on your Hostinger VPS as root

set -e

echo "🚀 Starting CozyCore VPS Setup..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose (should come with Docker now, but just in case)
echo "📦 Verifying Docker Compose..."
docker compose version || {
    apt install -y docker-compose-plugin
}

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /opt/cozycore
cd /opt/cozycore

# Create certbot directories
mkdir -p certbot/conf certbot/www

# Create .env file template
echo "📝 Creating environment file template..."
cat > .env << 'EOF'
# Database
POSTGRES_USER=cozycore
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
POSTGRES_DB=cozycore

# Discord
DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN

# Auth
BETTER_AUTH_SECRET=GENERATE_A_SECURE_SECRET_HERE

# Domain
DOMAIN=sorava.dev

# GitHub (for pulling images)
GITHUB_REPOSITORY=YOUR_GITHUB_USERNAME/CozyCore
IMAGE_TAG=latest
EOF

echo ""
echo "⚠️  IMPORTANT: Edit /opt/cozycore/.env with your actual values!"
echo ""

# Set up firewall
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
fi

echo ""
echo "✅ VPS Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Point sorava.dev DNS A record to this server's IP (72.62.20.140)"
echo "2. Edit /opt/cozycore/.env with your secrets"
echo "3. Copy docker-compose.prod.yml and nginx.conf to /opt/cozycore/"
echo "4. Run the SSL setup: ./ssl-setup.sh"
echo "5. Add GitHub secrets for deployment"
echo ""
