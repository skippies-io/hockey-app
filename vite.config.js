import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function resolveBuildId(env) {
  if (env.VITE_BUILD_ID) return env.VITE_BUILD_ID;
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  const buildId = resolveBuildId(env);
  const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
  const basePath = (() => {
    const raw = env.VITE_BASE_PATH || '/hockey-app/';
    const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  })();

  return {
    base: basePath,
    plugins: [react()],
    define: {
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['test/setup-env.js'],
      ...(isCi
        ? {
            maxWorkers: 1,
            fileParallelism: false,
            pool: 'forks',
            execArgv: ['--max-old-space-size=4096'],
          }
        : {}),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        reportsDirectory: 'coverage',
      },
    },
    server: {
      hmr: { path: basePath },
      allowedHosts: true,      // ← allow all external tunneling hosts
      host: true,               // ← allow LAN access + tunnels
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
