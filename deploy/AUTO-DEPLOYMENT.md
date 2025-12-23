# Automatic Deployment Setup Guide

This guide explains how to set up automatic deployments when code is pushed to GitHub.

## Option 1: Simple Webhook (Recommended)

### Step 1: Install webhook receiver on VPS

```bash
# SSH into your VPS
ssh your-user@agentsflowai.cloud

# Install webhook
sudo apt-get install webhook -y

# Or use npm package
sudo npm install -g webhook
```

### Step 2: Create webhook configuration

Create `/home/your-user/hooks.json`:

```json
[
  {
    "id": "deploy-agentflow",
    "execute-command": "/home/your-user/deploy.sh",
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

Create `/home/your-user/deploy.sh`:

```bash
#!/bin/bash
cd /var/www/agentsflow-ai
./deploy/deploy.sh main
```

Make it executable:

```bash
chmod +x /home/your-user/deploy.sh
chmod +x /var/www/agentsflow-ai/deploy/deploy.sh
```

### Step 4: Start webhook service

Create systemd service `/etc/systemd/system/webhook.service`:

```ini
[Unit]
Description=GitHub Webhook Receiver
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user
ExecStart=/usr/bin/webhook -hooks /home/your-user/hooks.json -hotreload
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

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. Fill in:
   - **Payload URL**: `https://agentsflowai.cloud/api/webhook` (or your server IP)
   - **Content type**: `application/json`
   - **Secret**: (create a random string)
3. Select events: **Just the push event**
4. Click "Add webhook"

### Step 6: Generate webhook secret

```bash
# Generate a secure secret
openssl rand -hex 32
```

Add this secret to:

- GitHub webhook settings
- Your hooks.json file
- Environment variable on VPS: `export GITHUB_WEBHOOK_SECRET="your-secret"`

---

## Option 2: GitHub Actions (CI/CD)

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

Add secrets to GitHub repository:

- `VPS_HOST` - Server IP or hostname
- `VPS_USER` - SSH username
- `VPS_SSH_KEY` - SSH private key

---

## Option 3: PM2 Plus (Built-in)

PM2 Plus provides monitoring and keymetrics deployment:

```bash
# Link your app to PM2 Plus
pm2 link <secret_key> <public_key>

# Enable deployment tracking
pm2 deploy ecosystem.config.cjs production setup
```

---

## Testing the Webhook

### Test locally:

```bash
curl -X POST http://localhost:9000/hooks/deploy-agentflow \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main", "repository": {"full_name": "user/repo"}}'
```

### Test the deploy script:

```bash
# On VPS
./deploy/deploy.sh main
```

---

## Troubleshooting

### Webhook not triggering

1. Check webhook delivery logs in GitHub
2. Verify firewall allows port 9000
3. Check webhook service status: `sudo systemctl status webhook`

### Deployment fails

1. Check logs: `tail -f /var/log/agentsflow-deploy.log`
2. Verify SSH keys if using GitHub Actions
3. Check PM2 status: `pm2 status`

### Build fails

1. Check Node.js version: `node --version` (requires v24.x)
2. Verify environment variables: `printenv | grep -i DATABASE`
3. Check npm install: `npm ci` should work without errors

---

## Security Considerations

1. **Use HTTPS** for webhook endpoint
2. **Verify webhook signatures** to prevent unauthorized deploys
3. **Limit webhook scope** to just push events
4. **Rotate secrets periodically**
5. **Monitor deployment logs** for suspicious activity
6. **Set up rollback** procedure before enabling auto-deploy

## Rollback Procedure

If auto-deployment breaks the site:

```bash
# SSH into VPS
ssh your-user@agentsflowai.cloud

# List backups
ls -la /var/backups/agentsflow-ai/

# Restore backup
./deploy/rollback.sh backup-YYYYMMDD-HHMMSS.tar.gz

# Or manually
cd /var/www/agentsflow-ai
git checkout previous-commit
npm ci
npm run build
pm2 reload ecosystem.config.cjs --env production
```

---

## Current State

✅ Schema changes implemented
✅ Database synced
✅ Seed data applied
✅ Test script passed
☐ Webhook deployment (in progress)
☐ Production deployment

After setting up the webhook, commit and push these changes to trigger your first automatic deployment!
