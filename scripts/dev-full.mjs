import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Function to spawn a process and pipe output
function run(command, args, name, color) {
  const proc = spawn(command, args, {
    cwd: root,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }, // Force colors for better readability
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.log(`${color}[${name}] \x1b[0m${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.error(`${color}[${name}] \x1b[0m${line}`);
    });
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      console.log(`${color}[${name}] exited with code ${code}\x1b[0m`);
      process.exit(code);
    }
  });

  return proc;
}

console.log('\x1b[36mStarting Hockey App Full Stack...\x1b[0m');

// Helper to parse simple .env files
import fs from 'node:fs';
function loadEnv(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[key] = value;
      }
    });
  } catch (_e) { // eslint-disable-line no-unused-vars
    // ignore missing file
  }
  return env;
}

function resolveEnvFile() {
  const candidates = ['.env.db.local', '.env.supabase.local', '.env'];
  for (const filename of candidates) {
    const fullPath = path.join(root, filename);
    if (fs.existsSync(fullPath)) {
      return { filename, fullPath };
    }
  }
  return null;
}

const resolvedEnv = resolveEnvFile();
const localEnv = resolvedEnv ? loadEnv(resolvedEnv.fullPath) : {};
const combinedEnv = {
  ...process.env,
  ...localEnv,
  FORCE_COLOR: '1',
};

const envLabel = resolvedEnv ? resolvedEnv.filename : 'none';
console.log(`\x1b[36mEnv file:\x1b[0m ${envLabel}`);

// Start Backend
const backend = spawn('node', ['server/index.mjs'], {
    cwd: root,
    stdio: 'pipe',
    shell: true,
    env: combinedEnv,
});

// Pipe backend output
backend.stdout.on('data', d => console.log(`\x1b[35m[BACKEND] \x1b[0m${d.toString().trim()}`));
backend.stderr.on('data', d => console.error(`\x1b[35m[BACKEND] \x1b[0m${d.toString().trim()}`));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkBackendHealth() {
  return new Promise((resolve) => {
    const endpoints = ['/version', '/api/version'];
    let index = 0;

    const tryNext = () => {
      if (index >= endpoints.length) {
        resolve(false);
        return;
      }
      const req = http.request(
        {
          method: 'GET',
          hostname: 'localhost',
          port: 8787,
          path: endpoints[index],
          timeout: 1000,
        },
        (res) => {
          res.resume();
          if (res.statusCode === 200) {
            resolve(true);
            return;
          }
          index += 1;
          tryNext();
        }
      );
      req.on('error', () => {
        index += 1;
        tryNext();
      });
      req.on('timeout', () => {
        req.destroy();
        index += 1;
        tryNext();
      });
      req.end();
    };

    tryNext();
  });
}

async function waitForBackend() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await checkBackendHealth()) {
      return true;
    }
    await sleep(500);
  }
  return false;
}

const healthy = await waitForBackend();
if (!healthy) {
  console.error('\x1b[31m[DEV] Backend did not become healthy at /version or /api/version within 10s.\x1b[0m');
  backend.kill();
  process.exit(1);
}

// Start Frontend
const frontend = run('npm', ['run', 'dev:fe'], 'FRONTEND', '\x1b[32m');

backend.on('close', (code) => {
  frontend.kill();
  const exitCode = code && code !== 0 ? code : 1;
  process.exit(exitCode);
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\n\x1b[36mStopping processes...\x1b[0m');
  backend.kill();
  frontend.kill();
  process.exit();
});
