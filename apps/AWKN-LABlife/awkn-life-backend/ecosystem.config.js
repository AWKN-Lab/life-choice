module.exports = {
  apps: [
    {
      name: "awkn-life-backend",
      script: "scripts/bootstrap-production.js",
      cwd: "/opt/awkn-life/awkn-life-backend",
      instances: 1,
      exec_mode: "fork",
      // 环境变量统一由 .env 管理（唯一权威来源）。
      // PM2 启动 scripts/bootstrap-production.js 时，bootstrap 会通过 dotenv
      // 依次加载 projectRoot/.env 和 apiServerRoot/.env（见 bootstrap-production.js 的 loadEnvFile）。
      // 此处仅保留 PM2 进程管理必需的 NODE_ENV，其他变量（PORT、REDIS_ENABLED、
      // DOUBAO_*、KIMI_*、MINIMAX_*、DEEPSEEK_*、DEFAULT_LLM_PROVIDER、CHEAP_LLM_PROVIDER 等）
      // 全部从 .env 读取，避免硬编码导致的环境不一致。
      env: {
        NODE_ENV: "production",
      },
      watch: false,
      max_memory_restart: "500M",
      // 日志由 winston 文件轮转管理（logs/backend-YYYY-MM-DD.log + logs/backend-error-YYYY-MM-DD.log），
      // 每日轮转，保留 30 天。PM2 仅管理进程，不再接管日志输出。
      // 如需查看 PM2 进程状态，使用：pm2 status / pm2 monit
      // 如需查看应用日志，使用：tail -f logs/backend-$(date +%Y-%m-%d).log
    },
    {
      name: "knowledge-service",
      script: "main.py",
      cwd: "/opt/awkn-life/services/knowledge-service",
      interpreter: "python3.11",
      instances: 1,
      exec_mode: "fork",
      env: {
        KNOWLEDGE_DATA_DIR: "/opt/awkn-life/knowledge/processed",
        KNOWLEDGE_USE_MMAP: "1",
        PYTHONUNBUFFERED: "1",
      },
      watch: false,
      max_memory_restart: "800M",
    },
  ],
};