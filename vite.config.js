import { execSync } from 'node:child_process'
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
  const env = loadEnv(mode, process.cwd(), '');
  const buildId = resolveBuildId(env);

  return {
    base: '/hockey-app/',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
    server: {
      hmr: { path: '/hockey-app/' },
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
