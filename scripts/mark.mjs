import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
if (process.env.AUDIT_LOG === "off") {
  console.error("AUDIT_LOG is 'off', so nothing is being logged. Remove it from .env first.");
  process.exit(1);
}
const file = path.resolve(process.env.AUDIT_LOG ?? path.join(here, "..", "logs", "tool-calls.jsonl"));

const args = process.argv.slice(2);
let entry;
if (args[0] === "--end") {
  entry = { ts: new Date().toISOString(), event: "end" };
} else {
  const label = args.join(" ").trim();
  if (!label) {
    console.error('Usage:\n  npm run mark -- "S1 Builder"\n  npm run mark -- --end');
    process.exit(1);
  }
  entry = { ts: new Date().toISOString(), event: "marker", label };
}

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf8");
console.log(entry.event === "end" ? "Session closed." : `Session started: ${entry.label}`);
console.log(`(${file})`);
