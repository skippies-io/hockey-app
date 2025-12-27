import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const server = spawn(npmCmd, ["run", "server"], { stdio: "inherit" });
const vite = spawn(npmCmd, ["run", "dev"], { stdio: "inherit" });

function shutdown(code) {
  if (server.exitCode == null) server.kill("SIGTERM");
  if (vite.exitCode == null) vite.kill("SIGTERM");
  if (code != null) process.exit(code);
}

server.on("exit", (code) => shutdown(code ?? 0));
vite.on("exit", (code) => shutdown(code ?? 0));

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
