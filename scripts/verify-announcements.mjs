import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const PORT = 8787;
const BASE = `http://localhost:${PORT}`;

// --- HELPERS ---

function loadEnv() {
  const candidates = ['.env.db.local', '.env.supabase.local', '.env'];
  for (const f of candidates) {
    const p = resolve(root, f);
    if (existsSync(p)) {
      console.log(`Loading env from ${f}`);
      const content = readFileSync(p, 'utf-8');
      const env = {};
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          env[key] = value;
        }
      });
      return env;
    }
  }
  return {};
}

async function startServer() {
  const env = { ...process.env, ...loadEnv() };
  console.log("Starting server...");
  const proc = spawn('node', ['server/index.mjs'], {
    cwd: root,
    stdio: 'inherit', // Show logs
    env
  });

  // Wait for health
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) {
        console.log("Server is up!");
        return proc;
      }
    } catch {}
  }
  proc.kill();
  throw new Error("Server failed to start");
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

// --- MAIN TEST ---

async function run() {
  let serverProc;
  try {
    serverProc = await startServer();

    console.log("Starting verification...");

    // 1. Create General/Published
    console.log("1. Creating General Published Announcement...");
    const general = await request('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'General Test',
        body: 'Body',
        severity: 'info',
        tournament_id: '',
        is_published: true
      })
    });
    if (!general.data.ok) throw new Error("Failed to create general: " + JSON.stringify(general.data));
    const generalId = general.data.data.id;
    console.log("   -> Created ID:", generalId);

    // 2. Create Tournament/Published
    console.log("2. Fetching valid tournament...");
    const tListRes = await request('/api/tournaments');
    const tList = tListRes.data.data || [];
    if (!tList.length) throw new Error("No tournaments found to test with");
    const tournId = tList[0].id;
    console.log("   -> Using Tournament ID:", tournId);

    console.log("   -> Creating Tournament Published Announcement...");
    const tournament = await request('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Tournament Test',
        body: 'Body',
        severity: 'alert',
        tournament_id: tournId,
        is_published: true
      })
    });
    if (!tournament.data.ok) throw new Error("Failed to create tournament ann: " + JSON.stringify(tournament.data));
    const tournamentAnnId = tournament.data.data.id;
    console.log("   -> Created ID:", tournamentAnnId);

    // 3. Create Draft
    console.log("3. Creating Draft Announcement...");
    const draft = await request('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Draft Test',
        body: 'Body',
        severity: 'info',
        tournament_id: '',
        is_published: false
      })
    });
    const draftId = draft.data.data.id;
    console.log("   -> Created ID:", draftId);

    // 4. Verify Public API (Home Context)
    console.log("4. Verifying Home Context (no tournamentId)...");
    const homeRes = await request('/api/announcements');
    const homeAnns = homeRes.data.data || [];
    const hasGeneral = homeAnns.some(a => a.id === generalId);
    const hasTournament = homeAnns.some(a => a.id === tournamentAnnId);
    const hasDraft = homeAnns.some(a => a.id === draftId);
    
    console.log("   -> Has General?", hasGeneral);
    console.log("   -> Has Tournament?", hasTournament);
    console.log("   -> Has Draft?", hasDraft);

    if (!hasGeneral || hasTournament || hasDraft) {
      throw new Error("Home context verification failed! Expected only General.");
    }

    // 5. Verify Public API (Tournament Context)
    console.log("5. Verifying Tournament Context...");
    const tRes = await request(`/api/announcements?tournamentId=${tournId}`);
    const tAnns = tRes.data.data || [];
    const tHasGeneral = tAnns.some(a => a.id === generalId);
    const tHasTournament = tAnns.some(a => a.id === tournamentAnnId);
    const tHasDraft = tAnns.some(a => a.id === draftId);

    console.log("   -> Has General?", tHasGeneral);
    console.log("   -> Has Tournament?", tHasTournament);
    console.log("   -> Has Draft?", tHasDraft);

    if (!tHasGeneral || !tHasTournament || tHasDraft) {
      throw new Error("Tournament context verification failed! Expected General AND Tournament.");
    }

    console.log("SUCCESS! All checks passed.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (serverProc) { 
      console.log("Stopping server...");
      serverProc.kill(); 
    }
  }
}

run();
