import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDigest } from "../../lib/api";
import { loadDigestSnapshot, saveDigestSnapshot } from "../../lib/overviewStore";
import OverviewCard from "../../components/overview/OverviewCard.jsx";

export default function DigestPublic() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      const cached = await loadDigestSnapshot(token);
      if (cached && alive) {
        setData(cached);
        setStatus("ready");
      }
      try {
        const fresh = await getDigest(token);
        if (!alive) return;
        setData(fresh);
        setStatus("ready");
        await saveDigestSnapshot(token, fresh);
      } catch (err) {
        console.error(err);
        if (alive) setStatus("error");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  if (status === "loading") return <div className="p-4">Loading digest…</div>;
  if (status === "error" || !data) return <div className="p-4">Unable to load this digest.</div>;

  return (
    <div className="overview-page">
      <header className="overview-header">
        <div>
          <h1>{data.title || "Digest"}</h1>
          <p>Season {data.season}</p>
        </div>
      </header>
      <div className="overview-grid">
        {(data.cards || []).map(card => (
          <OverviewCard key={card.id || card.entityId} card={card} />
        ))}
      </div>
    </div>
  );
}
