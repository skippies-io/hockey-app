import { spawn } from "node:child_process";

const DEFAULT_AGE = "U13B";
const VITE_PORT = 5173;
const API_DEFAULT = "http://localhost:8787/api";
const WAIT_TIMEOUT_MS = 60_000;
const WAIT_INTERVAL_MS = 500;
const KILL_TIMEOUT_MS = 5_000;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const arg = raw.slice(2);
    const eqIndex = arg.indexOf("=");
    const key = eqIndex === -1 ? arg : arg.slice(0, eqIndex);
    const inlineValue = eqIndex === -1 ? undefined : arg.slice(eqIndex + 1);
    if (inlineValue !== undefined) {
      out[key] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) continue;
    out[key] = next;
    i += 1;
  }
  return out;
}

const NPM_EXEC_PATH = process.env.npm_execpath;

// Avoid shell spawning (Sonar S4721); run npm via Node + npm_execpath.
function spawnProcess(args, env) {
  if (!NPM_EXEC_PATH) {
    throw new Error("Missing npm_execpath; run this via npm scripts.");
  }
  return spawn(process.execPath, [NPM_EXEC_PATH, ...args], {
    stdio: "inherit",
    shell: false,
    env,
  });
}

async function waitFor(checkFn, timeoutMs, intervalMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await checkFn();
      if (ok) return;
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for service");
}

async function fetchOk(url) {
  const res = await fetch(url);
  return res.ok;
}

async function fetchJsonOk(url) {
  const res = await fetch(url);
  if (!res.ok) return false;
  await res.json();
  return true;
}

async function assertUiReady() {
  const url = `http://localhost:${VITE_PORT}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`UI returned HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes('<div id="root">')) {
    throw new Error("UI root marker not found in HTML");
  }
}

async function runSmoke(provider, age) {
  const args = ["scripts/smoke.mjs", "--provider", provider, "--age", age];
  const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
  const code = await new Promise((resolve) => {
    child.on("exit", (exitCode) => resolve(exitCode ?? 1));
  });
  if (code !== 0) throw new Error("Smoke checks failed");
}

function killProcess(child) {
  if (!child || child.exitCode != null) return;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode == null) child.kill("SIGKILL");
  }, KILL_TIMEOUT_MS);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = args.provider || "apps";
  const age = args.age || DEFAULT_AGE;
  const childProcs = [];

  function shutdown() {
    for (const child of childProcs) killProcess(child);
  }

  process.on("SIGINT", () => {
    shutdown();
    process.exit(1);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(1);
  });

  try {
    if (provider === "db") {
      if (!process.env.DATABASE_URL) {
        throw new Error("Missing DATABASE_URL for DB provider test");
      }
      const serverEnv = { ...process.env };
      const server = spawnProcess(["run", "server"], serverEnv);
      childProcs.push(server);
      const apiBase = process.env.VITE_DB_API_BASE || API_DEFAULT;
      await waitFor(() => fetchJsonOk(`${apiBase}?groups=1`), WAIT_TIMEOUT_MS, WAIT_INTERVAL_MS);

      const viteEnv = {
        ...process.env,
        VITE_PROVIDER: "db",
        VITE_DB_API_BASE: apiBase,
      };
      const vite = spawnProcess(
        ["run", "dev", "--", "--port", String(VITE_PORT), "--strictPort"],
        viteEnv
      );
      childProcs.push(vite);
    } else {
      const viteEnv = { ...process.env, VITE_PROVIDER: "apps" };
      const vite = spawnProcess(
        ["run", "dev", "--", "--port", String(VITE_PORT), "--strictPort"],
        viteEnv
      );
      childProcs.push(vite);
    }

    await waitFor(
      () => fetchOk(`http://localhost:${VITE_PORT}/`),
      WAIT_TIMEOUT_MS,
      WAIT_INTERVAL_MS
    );
    await assertUiReady();
    await runSmoke(provider, age);
    shutdown();
    process.exit(0);
  } catch (err) {
    shutdown();
    console.error(err && err.message ? err.message : String(err));
    process.exit(1);
  }
}

main();
