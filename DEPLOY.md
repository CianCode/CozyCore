# CozyCore Deployment Guide

This guide covers deploying CozyCore (Discord bot + Next.js dashboard) to a Hostinger VPS using Docker and GitHub Actions CI/CD.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Hostinger VPS                           │
│                    (72.62.20.140)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Docker Network                    │   │
│  │  ┌─────────┐  ┌───────────┐  ┌──────────────────┐  │   │
│  │  │  Nginx  │  │ Dashboard │  │       Bot        │  │   │
│  │  │  :443   │──│   :3000   │  │  (Discord.js)    │  │   │
│  │  │  :80    │  └───────────┘  └──────────────────┘  │   │
│  │  └─────────┘        │                │             │   │
│  │       │             └────────┬───────┘             │   │
│  │       │                      │                     │   │
│  │       │              ┌───────▼───────┐             │   │
│  │       │              │   PostgreSQL  │             │   │
│  │       │              │     :5432     │             │   │
│  │       │              └───────────────┘             │   │
│  └───────│──────────────────────────────────────────────┘   │
│          │                                                  │
└──────────│──────────────────────────────────────────────────┘
           │
    ┌──────▼──────┐
    │   Internet  │
    │ sorava.dev  │
    └─────────────┘
```

## Prerequisites

- [ ] Hostinger VPS with root SSH access
- [ ] Domain (sorava.dev) with DNS access
- [ ] GitHub repository with Actions enabled
- [ ] Discord Application (bot token, client ID, client secret)

---

## Step 1: DNS Configuration

Point your domain to your VPS IP address.

### Required DNS Records

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (or `sorava.dev`) | `72.62.20.140` | 3600 |
| A | `www` | `72.62.20.140` | 3600 |

### Verify DNS Propagation

```bash
# Check if DNS is pointing correctly
dig sorava.dev +short
# Should return: 72.62.20.140

dig www.sorava.dev +short
# Should return: 72.62.20.140
```

> ⏱️ DNS propagation can take up to 48 hours, but usually completes within 15-30 minutes.

---

## Step 2: Generate SSH Keys for GitHub Actions

GitHub Actions needs SSH access to deploy to your VPS.

### On Your Local Machine

```bash
# Generate a new SSH key pair for deployments
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/cozycore_deploy -N ""

# View the private key (add this to GitHub Secrets)
cat ~/.ssh/cozycore_deploy

# View the public key (add this to VPS)
cat ~/.ssh/cozycore_deploy.pub
```

### Add Public Key to VPS

```bash
# Copy public key to VPS authorized_keys
ssh-copy-id -i ~/.ssh/cozycore_deploy.pub root@72.62.20.140

# Or manually:
ssh root@72.62.20.140
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Test SSH Connection

```bash
ssh -i ~/.ssh/cozycore_deploy root@72.62.20.140
# Should connect without password prompt
```

---

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VPS_HOST` | VPS IP address | `72.62.20.140` |
| `VPS_USERNAME` | SSH username | `root` |
| `VPS_SSH_KEY` | Private SSH key (entire contents) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DISCORD_CLIENT_ID` | Discord application client ID | `1234567890123456789` |

### How to Add Secrets

1. Go to repository **Settings**
2. Click **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter name and value
5. Click **Add secret**

---

## Step 4: VPS Initial Setup

SSH into your VPS and prepare the environment.

```bash
ssh root@72.62.20.140
```

### Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Verify installation
docker --version
docker compose version

# Enable Docker to start on boot
systemctl enable docker
```

### Configure Firewall

```bash
# Install and configure UFW
apt install -y ufw

# Allow essential ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Enable firewall
ufw --force enable

# Verify
ufw status
```

### Create Application Directory

```bash
mkdir -p /opt/cozycore
cd /opt/cozycore

# Create directories for SSL certificates
mkdir -p certbot/conf certbot/www
```

---

## Step 5: Copy Configuration Files to VPS

From your **local machine**, copy the necessary files:

```bash
cd /path/to/CozyCore

# Copy Docker and Nginx configuration
scp docker-compose.prod.yml root@72.62.20.140:/opt/cozycore/
scp nginx.conf root@72.62.20.140:/opt/cozycore/
scp scripts/ssl-setup.sh root@72.62.20.140:/opt/cozycore/
scp .env.production.example root@72.62.20.140:/opt/cozycore/.env
```

---

## Step 6: Configure Environment Variables

On your **VPS**:

```bash
ssh root@72.62.20.140
cd /opt/cozycore

# Edit the environment file
nano .env
```

### Environment Variables Reference

```bash
# Database Configuration
POSTGRES_USER=cozycore
POSTGRES_PASSWORD=your_secure_database_password_here
POSTGRES_DB=cozycore

# Discord Configuration
# Get these from https://discord.com/developers/applications
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_BOT_TOKEN=your_discord_bot_token

# Authentication Secret
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your_random_secret_here

# Domain
DOMAIN=sorava.dev

# GitHub Container Registry
# Replace with your GitHub username
GITHUB_REPOSITORY=yourusername/CozyCore
IMAGE_TAG=latest
```

### Generate Secure Passwords

```bash
# Generate database password
openssl rand -base64 24

# Generate auth secret
openssl rand -base64 32
```

---

## Step 7: Setup SSL Certificates

> ⚠️ **Important**: DNS must be propagated before this step. Verify with `dig sorava.dev`.

### Run SSL Setup Script

```bash
cd /opt/cozycore
chmod +x ssl-setup.sh

# Run with your email for certificate notifications
./ssl-setup.sh your-email@example.com
```

### Manual SSL Setup (Alternative)

If the script doesn't work:

```bash
cd /opt/cozycore

# Create temporary nginx for ACME challenge
docker run -d --name nginx-temp \
  -p 80:80 \
  -v $(pwd)/certbot/www:/var/www/certbot \
  nginx:alpine

# Get certificate
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d sorava.dev \
  -d www.sorava.dev

# Stop temporary nginx
docker stop nginx-temp && docker rm nginx-temp
```

### Verify Certificates

```bash
ls -la /opt/cozycore/certbot/conf/live/sorava.dev/
# Should show: cert.pem, chain.pem, fullchain.pem, privkey.pem
```

---

## Step 8: First Deployment

### Option A: Trigger via Git Push

Simply push to the `main` branch:

```bash
git add .
git commit -m "Setup deployment"
git push origin main
```

### Option B: Manual GitHub Actions Trigger

1. Go to repository → **Actions**
2. Select **Build and Deploy** workflow
3. Click **Run workflow** → **Run workflow**

### Option C: Manual Deployment on VPS

```bash
cd /opt/cozycore

# Login to GitHub Container Registry
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull and start containers
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Step 9: Verify Deployment

### Check Container Status

```bash
chmod +x ssl-setup.sh
./ssl-setup.sh your-email@example.com
```

Expected output:
```
NAME                 STATUS
cozycore-bot         Up
cozycore-dashboard   Up
cozycore-db          Up (healthy)
cozycore-nginx       Up
cozycore-certbot     Up
```

### Check Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f bot
docker compose -f docker-compose.prod.yml logs -f dashboard
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Test the Dashboard

Open in browser: `https://sorava.dev`

### Test the Bot

1. Invite bot to a Discord server using OAuth2 URL
2. Check bot status in Discord (should be online)
3. Test a command like `/ping`

---

## Maintenance

### View Logs

```bash
cd /opt/cozycore

# Follow all logs
docker compose -f docker-compose.prod.yml logs -f

# Last 100 lines of bot logs
docker compose -f docker-compose.prod.yml logs --tail=100 bot

# Logs since specific time
docker compose -f docker-compose.prod.yml logs --since="2024-01-01T00:00:00" dashboard
```

### Restart Services

```bash
cd /opt/cozycore

# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart bot
docker compose -f docker-compose.prod.yml restart dashboard
```

### Update Deployment

```bash
cd /opt/cozycore

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart with new images
docker compose -f docker-compose.prod.yml up -d

# Clean old images
docker image prune -f
```

### Database Operations

```bash
# Access PostgreSQL CLI
docker compose -f docker-compose.prod.yml exec postgres psql -U cozycore -d cozycore

# Backup database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U cozycore cozycore > backup_$(date +%Y%m%d).sql

# Restore database
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U cozycore -d cozycore
```

### SSL Certificate Renewal

Certificates auto-renew via the certbot container. To manually renew:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

### Stop All Services

```bash
cd /opt/cozycore
docker compose -f docker-compose.prod.yml down
```

### Stop and Remove All Data (⚠️ Destructive)

```bash
cd /opt/cozycore
docker compose -f docker-compose.prod.yml down -v
# This removes the database volume!
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check detailed logs
docker compose -f docker-compose.prod.yml logs bot

# Check container status
docker compose -f docker-compose.prod.yml ps -a

# Inspect specific container
docker inspect cozycore-bot
```

### Database Connection Issues

```bash
# Check if database is healthy
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U cozycore

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres
```

### SSL Certificate Issues

```bash
# Check certificate status
docker compose -f docker-compose.prod.yml run --rm certbot certificates

# Force renewal
docker compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :80
lsof -i :443

# Kill the process or stop the service
systemctl stop apache2  # if Apache is running
systemctl stop nginx    # if system nginx is running
```

### GitHub Actions Deployment Fails

1. Check Actions tab for error logs
2. Verify all secrets are set correctly
3. Test SSH connection manually:
   ```bash
   ssh -i ~/.ssh/cozycore_deploy root@72.62.20.140
   ```
4. Verify GHCR authentication:
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
   ```

### Image Pull Fails

```bash
# Check if logged into GHCR
docker login ghcr.io

# Manually pull image
docker pull ghcr.io/yourusername/cozycore/bot:latest
docker pull ghcr.io/yourusername/cozycore/dashboard:latest
```

---

## Security Best Practices

1. **Change default passwords** - Never use the example passwords in production
2. **Keep system updated** - Regularly run `apt update && apt upgrade`
3. **Monitor logs** - Check logs periodically for suspicious activity
4. **Backup regularly** - Automate database backups
5. **Limit SSH access** - Consider using SSH keys only, disable password auth
6. **Keep Docker updated** - `apt update && apt install docker-ce docker-ce-cli containerd.io`

### Disable SSH Password Authentication

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Set these values:
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

---

## Quick Reference

### Common Commands

| Command | Description |
|---------|-------------|
| `docker compose -f docker-compose.prod.yml ps` | Check container status |
| `docker compose -f docker-compose.prod.yml logs -f` | Follow all logs |
| `docker compose -f docker-compose.prod.yml restart` | Restart all services |
| `docker compose -f docker-compose.prod.yml pull` | Pull latest images |
| `docker compose -f docker-compose.prod.yml up -d` | Start/update services |
| `docker compose -f docker-compose.prod.yml down` | Stop all services |

### File Locations on VPS

| Path | Description |
|------|-------------|
| `/opt/cozycore/` | Application root |
| `/opt/cozycore/.env` | Environment variables |
| `/opt/cozycore/docker-compose.prod.yml` | Docker Compose config |
| `/opt/cozycore/nginx.conf` | Nginx configuration |
| `/opt/cozycore/certbot/conf/` | SSL certificates |

### Useful URLs

| URL | Description |
|-----|-------------|
| `https://sorava.dev` | Production dashboard |
| `https://github.com/settings/tokens` | GitHub tokens |
| `https://discord.com/developers/applications` | Discord developer portal |
| `https://ghcr.io` | GitHub Container Registry |

---

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/yourusername/CozyCore/issues)
2. Review Docker and service logs
3. Verify all environment variables are set correctly
4. Ensure DNS is properly configured
