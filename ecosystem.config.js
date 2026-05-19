/**
 * PM2 ecosystem — exécute Next.js en standalone sur le VPS prod.
 *
 * Démarrage :
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup       # active le démarrage auto au boot
 *
 * Cluster mode désactivé en MVP : Next.js standalone fonctionne en
 * single-process, le multi-instances nécessite une session externe
 * partagée (Redis) à laquelle on n'est pas prêt. PM2 redémarre auto
 * en cas de crash (`autorestart`) et plafonne la RAM à 1 Go.
 *
 * Logs : pm2 logs terp / pm2 monit
 */
module.exports = {
  apps: [
    {
      name: "terp",
      script: ".next/standalone/server.js",
      cwd: "/var/www/terp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",
      },
      // Logs (PM2 les gère + rotation)
      out_file: "/var/log/terp/out.log",
      error_file: "/var/log/terp/err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Ne tue pas trop vite si le process met du temps à shutdown gracefully
      kill_timeout: 10000,
      listen_timeout: 30000,
    },
  ],
};
