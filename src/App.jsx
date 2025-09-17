import { useState } from "react";
import Standings from "./components/Standings";
import Fixtures from "./components/Fixtures";

export default function App() {
  const [tab, setTab] = useState("standings");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <header style={{ padding: "12px 16px", borderBottom: "1px solid #eee", marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Indoor Hockey – U13 Boys</h1>
        <nav style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button onClick={() => setTab("standings")} disabled={tab==="standings"}>Standings</button>
          <button onClick={() => setTab("fixtures")} disabled={tab==="fixtures"}>Fixtures</button>
        </nav>
      </header>

      {tab === "standings" ? <Standings /> : <Fixtures />}

      <footer style={{ padding: 16, color: "#888", fontSize: 12 }}>
        Data via Google Apps Script JSON
      </footer>
    </div>
  );
}
