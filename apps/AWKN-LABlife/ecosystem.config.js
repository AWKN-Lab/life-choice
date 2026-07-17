// PM2 生态系统配置 — 人生决策宗师后端
// 2026-06-19 P1-3 创建：持久化 PM2 配置，重启后自动拉起
//
// 服务器部署路径：/opt/awkn-life/ecosystem.config.js
// 启动命令：pm2 start /opt/awkn-life/ecosystem.config.js && pm2 save
//
// 基于实际 PM2 运行配置（pm2 describe awkn-life-backend 输出）：
// - script: ./awkn-life-backend/scripts/bootstrap-production.js（含 ensureAssets 兜底复制）
// - cwd: /opt/awkn-life（脚本路径相对于 cwd）
// - exec_mode: fork
// - max_memory_restart: 300M（防止内存泄漏导致 OOM）

module.exports = {
  apps: [
    {
      name: 'awkn-life-backend',
      script: './awkn-life-backend/scripts/bootstrap-production.js',
      cwd: '/opt/awkn-life',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/root/.pm2/logs/awkn-life-backend-error.log',
      out_file: '/root/.pm2/logs/awkn-life-backend-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
  ],
};
