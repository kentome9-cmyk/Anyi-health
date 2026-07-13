module.exports = {
  apps: [
    {
      name: 'anyi-health',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/anyiai',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1024M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/www/wwwlogs/anyiai-error.log',
      out_file: '/www/wwwlogs/anyiai-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '60s',
    },
  ],
};
