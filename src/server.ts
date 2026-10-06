import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./tools.js";
import { ensureRepo } from "./git.js";

const PORT = Number(process.env.PORT ?? 3000);
const TOKEN = process.env.AUTH_TOKEN;

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use("/mcp", (req, res, next) => {
  if (!TOKEN) return next();
  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

app.post("/mcp", async (req, res) => {
  const b = req.body;
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    method: b?.method,
    tool: b?.params?.name,
    args: b?.params?.arguments && JSON.stringify(b.params.arguments).slice(0, 300),
  }));

  const server = new McpServer({ name: "mcp-file-server", version: "1.0.0" });
  registerTools(server);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const notAllowed = (_: express.Request, res: express.Response) =>
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
app.get("/mcp", notAllowed);
app.delete("/mcp", notAllowed);

app.get("/health", (_, res) => res.json({ ok: true }));

await ensureRepo();
app.listen(PORT, () => console.log(`MCP server listening on :${PORT}/mcp`));