import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let resolveSafe: typeof import("../src/sandbox.js").resolveSafe;
let tmp: string;

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  process.env.WORKSPACE_ROOT = tmp;
  ({ resolveSafe } = await import("../src/sandbox.js"));
});

describe("resolveSafe", () => {
  it("allows normal paths", async () => {
    await expect(resolveSafe("a/b.txt")).resolves.toContain("b.txt");
  });
  it("rejects ../ traversal", async () => {
    await expect(resolveSafe("../etc/passwd")).rejects.toThrow();
    await expect(resolveSafe("a/../../x")).rejects.toThrow();
  });
  it("rejects absolute paths outside root", async () => {
    await expect(resolveSafe("/etc/passwd")).rejects.toThrow();
  });
  it("rejects null bytes", async () => {
    await expect(resolveSafe("a\0b")).rejects.toThrow();
  });
  it("rejects sibling-prefix tricks", async () => {
    await expect(resolveSafe(`../${path.basename(tmp)}-evil/x`)).rejects.toThrow();
  });
});