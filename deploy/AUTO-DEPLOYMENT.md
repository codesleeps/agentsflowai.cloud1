# Automatic Deployment Setup Guide

This guide explains how to set up automatic deployments when code is pushed to GitHub.

## How PM2 Deploy Works (Option 3)

**PM2 Deploy** is a built-in feature of PM2 that enables **"git push to deploy"** functionality. Here's how it works:

```
┌─────────────────┐     git push      ┌─────────────────┐
│  Your Laptop    │ ─────────────────▶│   GitHub        │
└─────────────────┘                   └─────────────────┘
                                            │
                                            │ Webhook (optional)
                                            ▼
                                      ┌─────────────────┐
                                      │   Your VPS      │
                                      │  pm2 deploy     │
                                      │  pulls from Git │
                                      └─────────────────┘
                                            │
                                            │ pm2 runs
                                            ▼
                                      ┌─────────────────┐
                                      │  npm install    │
                                      │  npm run build  │
                                      │  pm2 restart    │
                                      └─────────────────┘
```

**Key Benefits:**

- ✅ **Built-in**: No external services needed
- ✅ **Simple**: Just `pm2 deploy` command
- ✅ **Atomic**: Full clone before deployment, swap on success
- ✅ **Rollback**: Easy rollback to previous version
- ✅ **SSH-based**: Secure authentication with SSH keys

---

## Option 3: PM2 Deploy (Built-in) - DETAILED IMPLEMENTATION

### How It Works

PM2 Deploy clones your repository to the server and manages deployments automatically:

1. **First Setup**: PM2 clones repo to `/var/www/agentsflow-ai`
2. **On Push**: You run `pm2 deploy production` (or webhook triggers it)
3. **PM2 Process**:
   - Creates a new folder with the latest code
   - Runs `npm ci` to install dependencies
   - Runs `npm run build` to build the app
   - Swaps from old version to new (zero downtime)
   - Keeps previous version for rollback

### Implementation

**Step 1: Update ecosystem.config.cjs**

The config file now includes a `deploy` section. Already updated!

**Step 2: Generate SSH Key for Deploy**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "deploy@agentsflowai.cloud" -f ~/.ssh/deploy_key

# Add to SSH agent
ssh-add ~/.ssh/deploy_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@agentsflowai.cloud

# Or manually add to server's ~/.ssh/authorized_keys
cat ~/.ssh/deploy_key.pub | ssh deploy@agentsflowai.cloud "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**Step 3: Create Deploy User on VPS (if needed)**

```bash
# SSH into VPS as root
ssh root@agentsflowai.cloud

# Create deploy user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Create directory
mkdir -p /var/www
chown deploy:deploy /var/www
```

**Step 4: Prepare Repository on VPS**

```bash
# SSH as deploy user
ssh deploy@agentsflowai.cloud

# Create app directory
mkdir -p /var/www/agentsflow-ai
cd /var/www/agentsflow-ai

# Initialize git (for first time)
git init
git remote add origin https://github.com/your-org/agentsflow-ai.cloud.git

# Or clone existing repo
# git clone https://github.com/your-org/agentsflow-ai.cloud.git .
```

**Step 5: Create Log Directory**

```bash
# On VPS
sudo mkdir -p /var/log/pm2
sudo chown deploy:deploy /var/log/pm2
```

**Step 6: Initial Setup Deploy**

```bash
# From your local machine
pm2 deploy ecosystem.config.cjs production setup

# This will:
# 1. Clone the repo to /var/www/agentsflow-ai
# 2. Run npm ci
# 3. Run npm run build
# 4. Start the app with PM2
```

**Step 7: Deploy After Changes**

```bash
# After committing and pushing to GitHub
pm2 deploy ecosystem.config.cjs production

# PM2 will:
# 1. Pull latest code
# 2. Install dependencies
# 3. Build the app
# 4. Zero-downtime restart
```

---

## Option 1: Simple Webhook (Recommended)

### How It Works

```
┌─────────────────┐    push     ┌─────────────────┐
│  Your Laptop    │ ───────────▶│   GitHub        │
└─────────────────┘             └─────────────────┘
                                        │
                                   webhook fires
                                        │
                                        ▼
                                  ┌─────────────────┐
                                  │  GitHub sends   │
                                  │  POST request   │
                                  └─────────────────┘
                                        │
                                        ▼
                                  ┌─────────────────┐
                                  │  VPS webhook    │
                                  │  receiver       │
                                  └─────────────────┘
                                        │
                                        ▼
                                  ┌─────────────────┐
                                  │  Runs deploy    │
                                  │  script         │
                                  └─────────────────┘
```

### Step 1: Install webhook receiver on VPS

```bash
# SSH into your VPS
ssh deploy@agentsflowai.cloud

# Install webhook
sudo apt-get install webhook -y

# Or use npm package
sudo npm install -g webhook
```

### Step 2: Create webhook configuration

Create `/home/deploy/hooks.json`:

```json
[
  {
    "id": "deploy-agentflow",
    "execute-command": "/home/deploy/deploy.sh",
    "command-working-directory": "/var/www/agentsflow-ai",
    "include-request-body": true,
    "include-command-output-in-response": true,
    "response-message": "Deployment triggered successfully!",
    "response-headers": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
]
```

### Step 3: Create deploy script

Create `/home/deploy/deploy.sh`:

```bash
#!/bin/bash
cd /var/www/agentsflow-ai
git pull origin main
npm ci --production=false
npm run build
pm2 reload ecosystem.config.cjs --env production
```

Make it executable:

```bash
chmod +x /home/deploy/deploy.sh
```

### Step 4: Start webhook service

Create `/etc/systemd/system/webhook.service`:

```ini
[Unit]
Description=GitHub Webhook Receiver
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy
ExecStart=/usr/bin/webhook -hooks /home/deploy/hooks.json -hotreload
Restart=always

[Install]
WantedBy=multi-user.target
```

Start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable webhook
sudo systemctl start webhook
sudo systemctl status webhook
```

### Step 5: Configure GitHub Webhook

1. Go to GitHub repo → Settings → Webhooks → Add webhook
2. Fill in:
   - **Payload URL**: `https://agentsflowai.cloud/api/webhook`
   - **Content type**: `application/json`
   - **Secret**: (generate with `openssl rand -hex 32`)
3. Select events: **Just the push event**
4. Click "Add webhook"

---

## Option 2: GitHub Actions (CI/CD)

### How It Works

```
┌─────────────────┐    push     ┌─────────────────┐
│  Your Laptop    │ ───────────▶│   GitHub        │
└─────────────────┘             └─────────────────┘
                                        │
                                   GitHub Actions
                                        │
                                        ▼
                                  ┌─────────────────┐
                                  │  CI/CD Pipeline │
                                  │  - Checkout     │
                                  │  - Install      │
                                  │  - Build        │
                                  └─────────────────┘
                                        │
                                        ▼
                                  ┌─────────────────┐
                                  │  SSH to VPS     │
                                  │  - Pull code    │
                                  │  - Restart PM2  │
                                  └─────────────────┘
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/agentsflow-ai
            git fetch origin main
            git checkout main
            git pull origin main
            npm ci
            npm run build
            pm2 reload ecosystem.config.cjs --env production
```

Add secrets to GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

---

## Testing

### Test PM2 Deploy

```bash
pm2 deploy ecosystem.config.cjs production
```

### Test Webhook

```bash
curl -X POST http://localhost:9000/hooks/deploy-agentflow \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main", "repository": {"full_name": "user/repo"}}'
```

### Test GitHub Actions

Push to main branch and watch Actions tab

---

## Rollback Procedure

If deployment breaks the site:

```bash
# PM2 Deploy rollback
pm2 deploy ecosystem.config.cjs production revert

# Or manual rollback
ssh deploy@agentsflowai.cloud
cd /var/www/agentsflow-ai
pm2 resurrect  # Restore previous version
```

---

## Current State

✅ Schema changes implemented
✅ Database synced
✅ Seed data applied
✅ Test script passed
✅ Welcome page → Login flow
✅ PM2 Deploy configured
☐ Production deployment
☐ GitHub webhook configured (Option 1)
☐ GitHub Actions configured (Option 2)
