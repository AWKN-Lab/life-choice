module.exports = {
  apps: [
    {
      name: "awkn-life-backend",
      script: "apps/api-server/src/main.js",
      cwd: "/opt/awkn-life",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NODE_PATH: "/opt/awkn-life/awkn-life-backend/node_modules"
      }
    }
  ]
};
