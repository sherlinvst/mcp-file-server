import crypto from "node:crypto";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./tools.js";
import { ensureRepo } from "./git.js";

const PORT = Number(process.env.PORT ?? 3000);
const TOKEN = process.env.AUTH_TOKEN;   
const SECRET = process.env.SECRET_PATH;

if (!TOKEN && !SECRET) throw new Error("Set AUTH_TOKEN and/or SECRET_PATH in .env");
if (TOKEN && TOKEN.length < 32) throw new Error("AUTH_TOKEN must be at least 32 characters");
if (SECRET && SECRET.length < 20) throw new Error("SECRET_PATH must be at least 20 characters");

const safeEqual = (a: string, b: string) =>
  crypto.timingSafeEqual(
    crypto.createHash("sha256").update(a).digest(),
    crypto.createHash("sha256").update(b).digest()
  );


const WINDOW_MS = 60_000;
const MAX_FAILS = 10;
const fails = new Map<string, { n: number; reset: number }>();
const tooMany = (ip: string) => {
  const e = fails.get(ip);
  return !!e && e.reset > Date.now() && e.n >= MAX_FAILS;
};
const recordFail = (ip: string) => {
  const now = Date.now();
  const e = fails.get(ip);
  if (!e || e.reset <= now) fails.set(ip, { n: 1, reset: now + WINDOW_MS });
  else e.n++;
};
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of fails) if (v.reset <= now) fails.delete(k);
}, WINDOW_MS).unref();

function reject(req: express.Request, res: express.Response, status: number, body: object) {
  const ip = req.ip ?? "unknown";
  recordFail(ip);
  const blocked = tooMany(ip);
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    event: "auth_failed",
    ip,
    path: req.originalUrl.startsWith("/mcp/") ? "/mcp/<redacted>" : "/mcp",
    status: blocked ? 429 : status,
  }));
  if (blocked) return res.status(429).json({ error: "too many failed attempts, try again later" });
  return res.status(status).json(body);
}

const bearerAuth: express.RequestHandler = (req, res, next) => {
  const h = req.headers.authorization ?? "";
  const given = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (TOKEN && given && safeEqual(given, TOKEN)) return next();
  res.setHeader("WWW-Authenticate", "Bearer");
  return reject(req, res, 401, { error: "unauthorized" });
};

const app = express();
app.set("trust proxy", 1); 
const jsonBody = express.json({ limit: "2mb" }); 

const handleMcp = (mode: "bearer" | "secret") =>
  async (req: express.Request, res: express.Response) => {
    const b = req.body;
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      auth: mode,
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
  };

const notAllowed = (_: express.Request, res: express.Response) =>
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });

function mount(p: string, mode: "bearer" | "secret", ...mw: express.RequestHandler[]) {
  app.post(p, ...mw, jsonBody, handleMcp(mode));
  app.get(p, ...mw, notAllowed);
  app.delete(p, ...mw, notAllowed);
}

if (TOKEN) mount("/mcp", "bearer", bearerAuth);
if (SECRET) mount(`/mcp/${SECRET}`, "secret");


app.use("/mcp", (req, res) => reject(req, res, 404, { error: "not found" }));

app.get("/health", (_, res) => res.json({ ok: true }));

await ensureRepo();
app.listen(PORT, () =>
  console.log(`MCP server listening on :${PORT} (bearer: ${TOKEN ? "on" : "off"}, secret path: ${SECRET ? "on" : "off"})`)
);