import { spawn } from "node:child_process";

export function stripTrailingSlash(url) {
  return String(url || "").replace(/\/$/, "");
}

export function deriveBases(rawBase) {
  const rootBase = stripTrailingSlash(rawBase);
  const apiBase = `${rootBase}/api`;
  return { rootBase, apiBase };
}

export function runNodeScript(label, args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env,
    });
    child.on("close", (code) => resolve({ label, code }));
  });
}

export function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}
