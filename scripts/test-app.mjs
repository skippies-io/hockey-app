import { spawn } from "node:child_process";
import {
  fetchJsonOk,
  fetchOk,
  parseArgs,
  spawnNpm,
  waitFor,
} from "./_devtools.mjs";

const DEFAULT_AGE = "U13B";
const VITE_PORT = 5173;
const API_DEFAULT = "http://localhost:8787/api";
const WAIT_TIMEOUT_MS = 60_000;
const WAIT_INTERVAL_MS = 500;
const KILL_TIMEOUT_MS = 5_000;

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
      const serverEnv = { ...process.env, PROVIDER_MODE: "db" };
      const server = spawnNpm(["run", "server"], serverEnv);
      childProcs.push(server);
      const apiBase = process.env.VITE_DB_API_BASE || API_DEFAULT;
      await waitFor(() => fetchJsonOk(`${apiBase}?groups=1`), WAIT_TIMEOUT_MS, WAIT_INTERVAL_MS);

      const viteEnv = {
        ...process.env,
        VITE_PROVIDER: "db",
        VITE_DB_API_BASE: apiBase,
      };
      const vite = spawnNpm(
        ["run", "dev", "--", "--port", String(VITE_PORT), "--strictPort"],
        viteEnv
      );
      childProcs.push(vite);
    } else {
      const viteEnv = { ...process.env, VITE_PROVIDER: "apps" };
      const vite = spawnNpm(
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
