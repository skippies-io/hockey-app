import http from 'node:http';

const API_URL = `http://localhost:8787/api/tournaments`;

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

async function verifyTournaments() {
  console.log(`Fetching Tournaments from ${API_URL}...`);

  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const json = await res.json();
      console.log(`${GREEN}✅ Tournaments API Alive${RESET}`);
      console.log('Data:', JSON.stringify(json, null, 2));
      
      if(json.data && Array.isArray(json.data) && json.data.length > 0) {
          console.log(`${GREEN}✅ Found ${json.data.length} tournaments${RESET}`);
          process.exit(0);
      } else {
          console.warn(`${RED}⚠️ No tournaments found in DB (but endpoint works)${RESET}`);
          process.exit(0); 
      }

    } else {
      console.error(`${RED}❌ API Returned Error${RESET}`);
      console.error(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error('Body:', text);
      process.exit(1);
    }
  } catch (err) {
    console.error(`${RED}❌ Request Failed${RESET}`, err);
    process.exit(1);
  }
}

setTimeout(verifyTournaments, 2000); // Wait for server boot
