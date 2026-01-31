const PORT = 8787;
const API_URL = `http://localhost:${PORT}/api/admin/announcements`;

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

async function verifyApi() {
  console.log(`Pinging Backend at ${API_URL}...`);

  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const json = await res.json();
      console.log(`${GREEN}✅ API IS ALIVE${RESET}`);
      console.log(`Status: ${res.status}`);
      console.log('Response:', JSON.stringify(json, null, 2));
      process.exit(0);
    } else {
      console.error(`${RED}❌ API Returned Error${RESET}`);
      console.error(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error('Body:', text);
      process.exit(1);
    }
  } catch (err) {
    if (err.cause && err.cause.code === 'ECONNREFUSED') {
      console.error(`${RED}❌ Connection Refused${RESET}`);
      console.error(`Ensure the server is running on port ${PORT}`);
    } else {
      console.error(`${RED}❌ Request Failed${RESET}`, err);
    }
    process.exit(1);
  }
}

// Wait a moment for server to boot if running immediately after start
setTimeout(verifyApi, 1000);
