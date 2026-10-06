module.exports = {
  apps: [
    {
      name: "mcp-files",
      script: "dist/server.js",
      node_args: "--env-file=.env",
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: "mcp-tunnel",
      cwd: __dirname,
      script: "C:/Windows/System32/cmd.exe",
      interpreter: "none",
      args: "/c ngrok http --url=unnatural-exporter-grandly.ngrok-free.dev 3000",
      autorestart: true,
    },
  ],
};