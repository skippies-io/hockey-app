import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";

export function parseArgs(argv) {
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

export function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const envLines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const env = {};

  for (const line of envLines) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("export ")) trimmed = trimmed.slice("export ".length);
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

export function readDotEnvValue(key, envPath = ".env") {
  const env = readEnvFile(envPath);
  if (!env) return "";
  return env[key] || "";
}

export async function fetchJsonFollow(url, hops = 0) {
  const MAX_REDIRECTS = 5;
  if (hops > MAX_REDIRECTS) {
    throw new Error(`Too many redirects for ${url}`);
  }
  const res = await fetch(url, { redirect: "manual" });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get("location");
    if (!location) throw new Error(`Redirect with no location for ${url}`);
    const nextUrl = new URL(location, url).toString();
    return fetchJsonFollow(nextUrl, hops + 1);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function waitFor(checkFn, timeoutMs, intervalMs) {
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

export async function fetchOk(url) {
  const res = await fetch(url);
  return res.ok;
}

export async function fetchJsonOk(url) {
  const res = await fetch(url);
  if (!res.ok) return false;
  await res.json();
  return true;
}

// Avoid shell spawning (Sonar S4721); run npm via Node + npm_execpath when possible.
export function spawnNpm(args, env) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return spawn(process.execPath, [npmExecPath, ...args], {
      stdio: "inherit",
      shell: false,
      env,
    });
  }
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawn(npmCmd, args, {
    stdio: "inherit",
    shell: false,
    env,
  });
}

export function spawnNpmSync(args, env) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return spawnSync(process.execPath, [npmExecPath, ...args], {
      stdio: "inherit",
      shell: false,
      env,
    });
  }
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(npmCmd, args, {
    stdio: "inherit",
    shell: false,
    env,
  });
}
