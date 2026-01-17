import { spawn } from 'node:child_process';
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
  } catch (e) {
    // ignore missing file
  }
  return env;
}

const localEnv = loadEnv(path.join(root, '.env.db.local'));
const combinedEnv = { 
  ...process.env, 
  ...localEnv, 
  PROVIDER_MODE: 'db', // Force DB mode
  FORCE_COLOR: '1' 
};

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

// Start Frontend
const frontend = run('npm', ['run', 'dev'], 'FRONTEND', '\x1b[32m');

// Handle exit
process.on('SIGINT', () => {
  console.log('\n\x1b[36mStopping processes...\x1b[0m');
  backend.kill();
  frontend.kill();
  process.exit();
});
