import { spawn } from "node:child_process";

const SERVER_URL = "http://localhost:8787/api?groups=1";
const TIMEOUT_MS = 20_000;
const INTERVAL_MS = 500;

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const res = await fetch(SERVER_URL);
      if (res.ok) return;
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  throw new Error("Timed out waiting for DB API server");
}

function killProcess(child) {
  if (!child || child.exitCode != null) return;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode == null) child.kill("SIGKILL");
  }, 5_000);
}

async function run() {
  const server = spawn("node", ["server/index.mjs"], {
    stdio: "inherit",
    env: process.env,
  });

  try {
    await waitForServer();
    const smoke = spawn("node", ["scripts/smoke.mjs", "--provider", "db"], {
      stdio: "inherit",
      env: process.env,
    });
    const code = await new Promise((resolve) =>
      smoke.on("exit", (exitCode) => resolve(exitCode ?? 1))
    );
    killProcess(server);
    process.exit(code);
  } catch (err) {
    killProcess(server);
    console.error(err && err.message ? err.message : String(err));
    process.exit(1);
  }
}

run();
