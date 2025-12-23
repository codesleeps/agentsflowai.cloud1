/**
 * PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 reload ecosystem.config.cjs --env production
 *   pm2 stop ecosystem.config.cjs
 *   pm2 delete ecosystem.config.cjs
 *
 * For PM2 Deploy (Option 3):
 *   pm2 deploy ecosystem.config.cjs production setup
 *   pm2 deploy ecosystem.config.cjs production
 */

module.exports = {
  apps: [
    {
      name: "agentsflow-ai",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/agentsflow-ai",
      instances: "max", // Use all available CPUs
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      // Environment variables for production
      env_production: {
        NODE_ENV: "production",
        PORT: 3005,
      },

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/pm2/agentsflow-ai-error.log",
      out_file: "/var/log/pm2/agentsflow-ai-out.log",
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,

      // Restart strategy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],

  /**
   * PM2 Deploy Configuration
   *
   * This enables "git push to deploy" functionality using PM2's built-in deployment system.
   *
   * Setup on VPS:
   *   1. Create directory: mkdir -p /var/www/agentsflow-ai
   *   2. Initialize git repo: cd /var/www/agentsflow-ai && git init
   *   3. Add remote: git remote add origin https://github.com/your-org/agentsflow-ai.cloud.git
   *   4. First deploy: pm2 deploy ecosystem.config.cjs production setup
   *
   * Deploy after push:
   *   pm2 deploy ecosystem.config.cjs production
   */
  deploy: {
    production: {
      user: "deploy",
      host: "agentsflowai.cloud",
      ref: "origin/main",
      repo: "https://github.com/your-org/agentsflow-ai.cloud.git",
      path: "/var/www/agentsflow-ai",
      ssh_options: ["IdentityFile=~/.ssh/deploy_key"],

      // Pre-deployment commands
      "pre-setup": "apt-get update && apt-get install -y git nodejs npm",
      "pre-deploy": 'echo "Starting deployment..."',

      // Post-deployment commands
      "post-deploy":
        "npm ci --production=false && npm run build && pm2 reload ecosystem.config.cjs --env production",

      // Environment variables to set on server
      env: {
        NODE_ENV: "production",
        PORT: 3005,
      },
    },
  },
};
