import { useMemo, useState } from "react";
import { createEvents } from "ics";
import { createDigest } from "../../lib/api";
import { getUserKey } from "../../lib/userKey";

function downloadICS(value, filename = "hj-digest.ics") {
  const blob = new Blob([value], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildEvents(fixtures = []) {
  return fixtures.map((fixture) => {
    const startIso = fixture.metrics?.startIso || fixture.metrics?.date;
    const start = startIso ? new Date(startIso) : null;
    const formattedStart = start ? [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
    ] : undefined;
    return {
      title: fixture.headline || "Fixture",
      description: fixture.subtext || "",
      location: fixture.metrics?.venue || "TBD",
      start: formattedStart,
      duration: { hours: 1 },
    };
  }).filter(Boolean);
}

export default function DigestBuilder({ overview }) {
  const followPreference = overview?.followPreference || { teams: [], ageGroups: [] };
  const fixtureCards = (overview?.cards || []).filter(card => card.type === "fixture");
  const uniqueTeams = useMemo(() => {
    const dedup = new Map();
    fixtureCards.forEach(card => {
      const key = card.trackId || card.entityId || card.headline;
      if (!key) return;
      dedup.set(key, card.headline || key);
    });
    return Array.from(dedup.entries());
  }, [fixtureCards]);
  const uniqueAgeGroups = useMemo(() => {
    const set = new Set();
    fixtureCards.forEach(card => { if (card.ageId) set.add(card.ageId); });
    return Array.from(set);
  }, [fixtureCards]);
  const [selectedTeams, setSelectedTeams] = useState(new Set(followPreference.teams || []));
  const [selectedAgeGroups, setSelectedAgeGroups] = useState(new Set(followPreference.ageGroups || []));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);

  const toggleTeam = (team) => {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team); else next.add(team);
      return next;
    });
  };

  const toggleAgeGroup = (age) => {
    setSelectedAgeGroups(prev => {
      const next = new Set(prev);
      if (next.has(age)) next.delete(age); else next.add(age);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title: "My Digest",
        selectedTeams: Array.from(selectedTeams),
        selectedAgeGroups: Array.from(selectedAgeGroups),
        ownerUserKey: getUserKey(),
      };
      const result = await createDigest(payload);
      setShareUrl(result.shareUrl || "");
      setMessage("Digest saved. Share link copied below.");
    } catch (err) {
      setMessage(err.message || "Unable to save digest right now.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportICS = () => {
    const filteredFixtures = fixtureCards.filter(card => {
      const teamFilter = !selectedTeams.size || selectedTeams.has(card.trackId || card.entityId);
      const ageFilter = !selectedAgeGroups.size || selectedAgeGroups.has(card.ageId);
      return teamFilter && ageFilter;
    });
    const events = buildEvents(filteredFixtures);
    if (!events.length) {
      setMessage("Select at least one fixture to export.");
      return;
    }
    createEvents(events, (error, value) => {
      if (error) {
        setMessage("Unable to generate calendar file.");
        console.error(error);
        return;
      }
      downloadICS(value);
    });
  };

  return (
    <div className="digest-builder">
      <h3>Create personalized digest</h3>
      <p>Select teams and age groups to include in your daily summary or shared link.</p>

      <div className="digest-builder__grid">
        <div>
          <h4>Teams</h4>
          <div className="digest-list">
            {uniqueTeams.map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={selectedTeams.has(key)}
                  onChange={() => toggleTeam(key)}
                />
                {label}
              </label>
            ))}
            {!uniqueTeams.length ? <p className="empty">No fixtures available.</p> : null}
          </div>
        </div>

        <div>
          <h4>Age groups</h4>
          <div className="digest-list">
            {uniqueAgeGroups.map(age => (
              <label key={age}>
                <input
                  type="checkbox"
                  checked={selectedAgeGroups.has(age)}
                  onChange={() => toggleAgeGroup(age)}
                />
                {age}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="digest-actions">
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save & Generate Link"}
        </button>
        <button onClick={handleExportICS}>Export ICS</button>
      </div>

      {shareUrl ? (
        <div className="digest-share">
          <span>Share link:</span>
          <input value={shareUrl} readOnly onFocus={e => e.target.select()} />
        </div>
      ) : null}

      {message ? <p className="digest-message">{message}</p> : null}
    </div>
  );
}
