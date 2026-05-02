# 07 — Production Deployment (Ubuntu VPS)

This guide deploys PandaMarket to a live Ubuntu server with Docker, Caddy, and a real domain.

---

## Step 1: Get a VPS

Purchase a VPS from any provider (e.g., OVH, Hetzner, DigitalOcean). Recommended specs:
- **OS:** Ubuntu 22.04 or 24.04 LTS
- **RAM:** Minimum 4 GB (8 GB recommended)
- **Storage:** 40 GB SSD minimum
- **CPU:** 2 vCPUs minimum

## Step 2: Connect to Your Server

```bash
ssh root@YOUR_SERVER_IP
```

## Step 3: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Git
apt install -y git

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy -y

# Verify
node --version && docker --version && caddy version
```

## Step 4: Create Application User

```bash
adduser pandamarket
usermod -aG docker pandamarket
su - pandamarket
```

## Step 5: Clone & Install

```bash
cd /home/pandamarket
git clone https://your-gitlab.com/pandamarket/pandamarket.git app
cd app
npm install
```

## Step 6: Start Infrastructure

```bash
docker compose up -d
```

## Step 7: Create Production `.env`

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

**Critical changes for production:**
```env
PD_NODE_ENV=production
PD_HUB_DOMAIN=pandamarket.tn

PD_ADMIN_CORS=https://admin.pandamarket.tn
PD_STORE_CORS=https://pandamarket.tn

PD_DATABASE_URL=postgresql://pd_user:STRONG_PASSWORD@localhost:5432/pandamarket
PD_DATABASE_SSL=false

PD_JWT_SECRET=GENERATE_A_64_CHAR_RANDOM_STRING
PD_COOKIE_SECRET=GENERATE_ANOTHER_64_CHAR_RANDOM_STRING
PD_ENCRYPTION_KEY=GENERATE_64_HEX_CHARS

PD_MEILI_MASTER_KEY=GENERATE_A_STRONG_KEY

PD_S3_PUBLIC_BASE_URL=https://api.pandamarket.tn/images

# Real payment credentials
PD_FLOUCI_APP_TOKEN=your_real_token
PD_FLOUCI_APP_SECRET=your_real_secret
PD_KONNECT_API_KEY=your_real_key
PD_KONNECT_RECEIVER_WALLET=your_real_wallet
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 8: Run Migrations & Build

```bash
# Create tables
npm run migrate -w backend

# Build backend
npm run build -w backend

# Build frontend
npm run build -w frontend
```

## Step 9: Setup Caddy (Reverse Proxy)

```bash
# Copy the Caddyfile
sudo cp /home/pandamarket/app/Caddyfile /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

Caddy automatically handles HTTPS certificates via Let's Encrypt.

## Step 10: Create Systemd Services

### Backend Service

```bash
sudo nano /etc/systemd/system/pandamarket-backend.service
```

Paste:
```ini
[Unit]
Description=PandaMarket Backend API
After=network.target docker.service

[Service]
Type=simple
User=pandamarket
WorkingDirectory=/home/pandamarket/app/backend
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Frontend Service

```bash
sudo nano /etc/systemd/system/pandamarket-frontend.service
```

Paste:
```ini
[Unit]
Description=PandaMarket Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=pandamarket
WorkingDirectory=/home/pandamarket/app/frontend
ExecStart=/usr/bin/npx next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Enable & Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable pandamarket-backend pandamarket-frontend
sudo systemctl start pandamarket-backend pandamarket-frontend

# Check status
sudo systemctl status pandamarket-backend
sudo systemctl status pandamarket-frontend
```

## Step 11: Verify

```bash
# Check backend
curl http://localhost:9000/health

# Check frontend
curl -I http://localhost:3000

# Check public URL
curl https://pandamarket.tn
```

## Updating the Application

```bash
su - pandamarket
cd app
git pull
npm install
npm run migrate -w backend
npm run build -w backend
npm run build -w frontend

sudo systemctl restart pandamarket-backend
sudo systemctl restart pandamarket-frontend
```

## Monitoring Logs

```bash
# Backend logs
sudo journalctl -u pandamarket-backend -f

# Frontend logs
sudo journalctl -u pandamarket-frontend -f

# Docker logs
docker compose logs -f
```
