# PM2 Ecosystem Configuration

This document describes the PM2 configuration for the production server. The configuration has been updated to include the `NEXT_PUBLIC_APP_URL` environment variable to fix authentication warnings.

## Current Configuration

The `ecosystem.config.cjs` file is located in the project root and includes:

### App Configuration

- **Name:** agentsflow-ai
- **Script:** node_modules/next/dist/bin/next
- **Args:** start
- **Working Directory:** /var/www/agentsflow-ai
- **Instances:** max (uses all available CPUs)
- **Exec Mode:** cluster
- **Port:** 3005
- **Environment:** NEXT_PUBLIC_APP_URL set to "https://agentsflowai.cloud"

### Logging

- Error Log: /var/log/pm2/agentsflow-ai-error.log
- Output Log: /var/log/pm2/agentsflow-ai-out.log

### Deployment Configuration

- **Host:** srv1187860.hstgr.cloud
- **Repository:** https://github.com/codesleeps/agentsflow-ai.cloud.git
- **Branch:** origin/main

## Commands

```bash
# Start the application
pm2 start ecosystem.config.cjs --env production

# Reload the application (applies env changes)
pm2 reload ecosystem.config.cjs --env production

# Stop the application
pm2 stop ecosystem.config.cjs

# Delete the application
pm2 delete ecosystem.config.cjs

# Deploy using PM2's built-in deployment system
pm2 deploy ecosystem.config.cjs production setup
pm2 deploy ecosystem.config.cjs production
```
