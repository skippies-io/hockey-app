import React, { useMemo, useState } from "react";
import { API_BASE } from "../../lib/api";
import { parseFranchiseName, normalizeTeamName } from "../../lib/franchise";

const STEP_LABELS = ["Tournament", "Groups", "Teams", "Fixtures"];
const CANONICAL_FRANCHISES = [
  "Purple Panthers",
  "Blue Cranes",
  "Black Hawks",
  "BHA",
  "Gryphons",
  "Mighty Ducks",
  "Northern Guardians",
  "Dragons",
  "Giants",
  "Knights",
  "GS Hockey",
  "Meta SMS",
  "Gladiators",
  "Khosa",
  "Pink Otters",
  "Reddam",
  "Turfwar",
];

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slugForTournament(name, season) {
  const base = [name, season].filter(Boolean).join(" ");
  const slug = normalizeId(base);
  if (!slug) return "";
  return slug.startsWith("hj-") ? slug : `hj-${slug}`;
}

function WizardStepHeader({ step, onStepChange }) {
  return (
    <div className="wizard-steps">
      {STEP_LABELS.map((label, idx) => (
        <button
          type="button"
          key={label}
          className={`wizard-step ${idx === step ? "active" : ""}`}
          onClick={() => onStepChange(idx)}
        >
          <span className="wizard-step-index">{idx + 1}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, hint, error }) {
  return (
    <label className="wizard-field">
      <span className="wizard-field-label">{label}</span>
      {children}
      {hint ? <span className="wizard-field-hint">{hint}</span> : null}
      {error ? <span className="wizard-field-error">{error}</span> : null}
    </label>
  );
}

function SectionCard({ title, children, actions }) {
  return (
    <section className="wizard-card">
      <header className="wizard-card-header">
        <h3>{title}</h3>
        {actions ? <div className="wizard-card-actions">{actions}</div> : null}
      </header>
      <div className="wizard-card-body">{children}</div>
    </section>
  );
}

function emptyGroup() {
  return { id: "", label: "", format: "", venues: [], pool_count: 1 };
}

function emptyTeam(groupId = "") {
  return {
    group_id: groupId,
    name: "",
    franchise_name: "",
    pool: "",
    is_placeholder: false,
  };
}

function emptyFixture(groupId = "") {
  return {
    group_id: groupId,
    date: "",
    time: "",
    venue: "",
    round: "",
    pool: "",
    team1: "",
    team2: "",
  };
}

function poolLabels(count) {
  const labels = [];
  const total = Math.max(1, Number(count) || 1);
  for (let i = 0; i < total; i += 1) {
    labels.push(String.fromCharCode(65 + i));
  }
  return labels;
}

function parseLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function roundRobinPairs(teams) {
  const list = teams.slice();
  const hasBye = list.length % 2 !== 0;
  if (hasBye) list.push("__BYE__");
  const rounds = list.length - 1;
  const half = list.length / 2;
  const schedule = [];

  for (let round = 0; round < rounds; round += 1) {
    const pairs = [];
    for (let i = 0; i < half; i += 1) {
      const home = list[i];
      const away = list[list.length - 1 - i];
      if (home !== "__BYE__" && away !== "__BYE__") {
        pairs.push([home, away]);
      }
    }
    schedule.push(pairs);

    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list.splice(0, list.length, fixed, ...rest);
  }

  return schedule;
}

export default function TournamentWizard() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [venueOptions, setVenueOptions] = useState([]);

  const [tournament, setTournament] = useState({
    id: "",
    name: "",
    season: "",
  });
  const [venues, setVenues] = useState([{ name: "", isNew: false }]);
  const [groups, setGroups] = useState([emptyGroup()]);
  const [franchises, setFranchises] = useState([
    {
      name: "",
      logo_url: "",
      manager_name: "",
      manager_photo_url: "",
      description: "",
      contact_phone: "",
      location_map_url: "",
      contact_email: "",
    },
  ]);
  const [teams, setTeams] = useState([emptyTeam()]);
  const [fixtures, setFixtures] = useState([emptyFixture()]);
  const [timeSlots, setTimeSlots] = useState([
    { date: "", time: "", venue: "", label: "" },
  ]);

  const [generator, setGenerator] = useState({
    groupId: "",
    pool: "A",
    startDate: "",
    venue: "",
    time: "",
    roundPrefix: "Round",
  });
  const [generatorErrors, setGeneratorErrors] = useState({});
  const [franchiseImport, setFranchiseImport] = useState("");
  const [teamImport, setTeamImport] = useState("");

  const formErrors = useMemo(() => {
    const errors = [];
    if (!tournament.name.trim()) errors.push("Tournament name is required.");
    if (!tournament.season.trim()) errors.push("Tournament season is required.");
    if (!groups.some((g) => g.id && g.label)) {
      errors.push("At least one group is required.");
    }
    const groupIds = new Set(groups.map((g) => g.id).filter(Boolean));
    const invalidTeams = teams.filter((t) => !t.group_id || !groupIds.has(t.group_id));
    if (invalidTeams.length) {
      errors.push("All teams must be assigned to a valid group.");
    }
    const invalidFixtures = fixtures.filter((f) => f.group_id && !groupIds.has(f.group_id));
    if (invalidFixtures.length) {
      errors.push("Fixtures include an unknown group.");
    }
    const teamsMissingPool = teams.filter(
      (t) => t.group_id && !t.is_placeholder && !t.pool
    );
    if (teamsMissingPool.length) {
      errors.push("All non-placeholder teams should have a pool.");
    }
    const fixturesMissingDate = fixtures.filter((f) => f.team1 && f.team2 && !f.date);
    if (fixturesMissingDate.length) {
      errors.push("All fixtures must have a date.");
    }
    const fixturesMissingPool = fixtures.filter((f) => f.team1 && f.team2 && !f.pool);
    if (fixturesMissingPool.length) {
      errors.push("All fixtures must have a pool.");
    }
    const teamNames = new Set();
    const duplicateTeams = [];
    teams.forEach((t) => {
      const key = `${t.group_id || ""}:${normalizeTeamName(t.name).toLowerCase()}`;
      if (!t.name || !t.group_id) return;
      if (teamNames.has(key)) duplicateTeams.push(key);
      teamNames.add(key);
    });
    if (duplicateTeams.length) {
      errors.push("Duplicate team names found within a group.");
    }
    const fixtureKeys = new Set();
    const fixtureDupes = [];
    fixtures.forEach((f) => {
      if (!f.team1 || !f.team2 || !f.group_id || !f.date || !f.pool) return;
      const key = `${f.group_id}:${normalizeTeamName(f.team1)}:${normalizeTeamName(f.team2)}:${f.date}:${f.time || "TBD"}:${f.pool}`;
      if (fixtureKeys.has(key)) fixtureDupes.push(key);
      fixtureKeys.add(key);
    });
    if (fixtureDupes.length) {
      errors.push("Duplicate fixtures found (same teams/date/time/pool).");
    }
    return errors;
  }, [tournament, groups, teams, fixtures]);

  const tournamentIdHint = useMemo(
    () => slugForTournament(tournament.name, tournament.season),
    [tournament.name, tournament.season]
  );

  const invalidTournamentName = !tournament.name.trim();
  const invalidTournamentSeason = !tournament.season.trim();
  const invalidTournamentId = !(tournament.id || tournamentIdHint);

  const groupOptions = useMemo(
    () => groups.map((g) => g.id).filter(Boolean),
    [groups]
  );

  const poolsByGroup = useMemo(() => {
    const map = new Map();
    groups.forEach((g) => {
      const labels = poolLabels(g.pool_count || 1);
      map.set(g.id, labels);
    });
    return map;
  }, [groups]);

  const allVenueOptions = useMemo(() => {
    const list = [
      ...venueOptions,
      ...venues.filter((v) => v.isNew && v.name).map((v) => v.name),
    ];
    return Array.from(new Set(list.map((v) => v.trim()).filter(Boolean)));
  }, [venueOptions, venues]);


  const teamOptionsByGroup = useMemo(() => {
    const map = new Map();
    teams.forEach((team) => {
      const groupId = team.group_id || "";
      if (!groupId) return;
      if (!map.has(groupId)) map.set(groupId, []);
      map.get(groupId).push(normalizeTeamName(team.name));
    });
    return map;
  }, [teams]);

  const franchiseOptions = useMemo(() => {
    const fromForm = franchises.map((f) => f.name).filter(Boolean);
    const merged = [...CANONICAL_FRANCHISES, ...fromForm];
    return Array.from(new Set(merged.map((n) => n.trim()).filter(Boolean))).sort();
  }, [franchises]);

  function updateTournament(next) {
    setTournament((prev) => ({ ...prev, ...next }));
  }

  function handleVenueChange(index, value) {
    setVenues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: value };
      return next;
    });
  }

  function addVenue() {
    setVenues((prev) => [...prev, { name: "", isNew: false }]);
  }

  function removeVenue(index) {
    setVenues((prev) => prev.filter((_, idx) => idx !== index));
  }

  function setVenueMode(index, isNew) {
    setVenues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isNew, name: "" };
      return next;
    });
  }

  function updateGroup(index, patch) {
    setGroups((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addGroup() {
    setGroups((prev) => [...prev, emptyGroup()]);
  }

  function removeGroup(index) {
    setGroups((prev) => prev.filter((_, idx) => idx !== index));
  }

  function toggleGroupVenue(index, venueName) {
    setGroups((prev) => {
      const next = [...prev];
      const group = { ...next[index] };
      const venuesList = new Set(group.venues || []);
      if (venuesList.has(venueName)) {
        venuesList.delete(venueName);
      } else {
        venuesList.add(venueName);
      }
      group.venues = Array.from(venuesList);
      next[index] = group;
      return next;
    });
  }

  function updateFranchise(index, patch) {
    setFranchises((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addFranchise() {
    setFranchises((prev) => [
      ...prev,
      {
        name: "",
        logo_url: "",
        manager_name: "",
        manager_photo_url: "",
        description: "",
        contact_phone: "",
        location_map_url: "",
        contact_email: "",
      },
    ]);
  }

  function removeFranchise(index) {
    setFranchises((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateTeam(index, patch) {
    setTeams((prev) => {
      const next = [...prev];
      const updated = { ...next[index], ...patch };
      if (patch.name && !patch.franchise_name) {
        const parsed = parseFranchiseName(patch.name);
        if (!parsed.placeholder && parsed.franchise) {
          updated.franchise_name = parsed.franchise;
        }
        updated.is_placeholder = parsed.placeholder;
      }
      next[index] = updated;
      return next;
    });
  }

  function autoAssignPoolsForGroup(groupId) {
    const groupPoolLabels = poolsByGroup.get(groupId) || ["A"];
    setTeams((prev) => {
      const next = prev.map((team) => ({ ...team }));
      const groupTeams = next.filter(
        (team) => team.group_id === groupId && !team.is_placeholder
      );
      groupTeams.forEach((team, idx) => {
        team.pool = groupPoolLabels[idx % groupPoolLabels.length];
      });
      return next;
    });
  }

  function addTimeSlot() {
    setTimeSlots((prev) => [...prev, { date: "", time: "", venue: "", label: "" }]);
  }

  function updateTimeSlot(index, patch) {
    setTimeSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function removeTimeSlot(index) {
    setTimeSlots((prev) => prev.filter((_, idx) => idx !== index));
  }

  function applyFranchiseImport() {
    const entries = parseLines(franchiseImport).map((name) => ({
      name,
      logo_url: "",
      manager_name: "",
      manager_photo_url: "",
      description: "",
      contact_phone: "",
      location_map_url: "",
      contact_email: "",
    }));
    if (!entries.length) return;
    setFranchises((prev) => [...prev, ...entries]);
    setFranchiseImport("");
  }

  function applyTeamImport() {
    const lines = parseLines(teamImport);
    const entries = [];
    for (const line of lines) {
      const [group_id, name, franchise_name, pool] = line
        .split(",")
        .map((part) => part.trim());
      if (!group_id || !name) continue;
      const parsed = parseFranchiseName(name);
      entries.push({
        group_id,
        name,
        franchise_name: franchise_name || parsed.franchise || "",
        pool: pool || "",
        is_placeholder: parsed.placeholder,
      });
    }
    if (!entries.length) return;
    setTeams((prev) => [...prev, ...entries]);
    setTeamImport("");
  }

  function addTeam() {
    setTeams((prev) => [...prev, emptyTeam()]);
  }

  function removeTeam(index) {
    setTeams((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateFixture(index, patch) {
    setFixtures((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addFixture() {
    setFixtures((prev) => [...prev, emptyFixture()]);
  }

  function removeFixture(index) {
    setFixtures((prev) => prev.filter((_, idx) => idx !== index));
  }

  function generateFixtures() {
    const { groupId, pool, startDate, venue, time, roundPrefix } = generator;
    const errors = {};
    if (!groupId) errors.groupId = "Required";
    if (!startDate) errors.startDate = "Required";
    if (!pool) errors.pool = "Required";
    setGeneratorErrors(errors);
    if (Object.keys(errors).length) {
      setSaveError("Generator requires group, date, and pool.");
      return;
    }
    const teamsInGroup = teams
      .filter((t) => t.group_id === groupId && !t.is_placeholder)
      .map((t) => normalizeTeamName(t.name));
    if (teamsInGroup.length < 2) {
      setSaveError("Not enough teams in the group to generate fixtures.");
      return;
    }
    const groupPools = poolsByGroup.get(groupId) || [pool];
    const targetPools = pool === "ALL" ? groupPools : [pool];
    const nextFixtures = [];
    targetPools.forEach((poolLabel) => {
      const poolTeams = teams
        .filter(
          (t) =>
            t.group_id === groupId &&
            !t.is_placeholder &&
            ((t.pool || "").trim() === poolLabel || groupPools.length === 1)
        )
        .map((t) => normalizeTeamName(t.name));
      if (poolTeams.length < 2) return;
      const rounds = roundRobinPairs(poolTeams);
      rounds.forEach((pairs, roundIdx) => {
        pairs.forEach(([team1, team2]) => {
          nextFixtures.push({
            group_id: groupId,
            date: startDate,
            time: time || "",
            venue: venue || "",
            round: roundPrefix ? `${roundPrefix} ${roundIdx + 1}` : `Round ${roundIdx + 1}`,
            pool: poolLabel,
            team1,
            team2,
          });
        });
      });
    });
    setFixtures((prev) => [...prev, ...nextFixtures]);
    setSaveError("");
    setSaveSuccess(`Generated ${nextFixtures.length} fixtures.`);
  }

  async function handleSubmit() {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    if (formErrors.length) {
      setSaveError(formErrors[0]);
      setSaving(false);
      return;
    }
    try {
      const payload = {
        tournament: {
          id: tournament.id || tournamentIdHint,
          name: tournament.name,
          season: tournament.season,
        },
        venues: venues.filter((v) => v.name && v.name.trim()),
        groups: groups
          .filter((g) => g.id && g.label)
          .map((g) => ({
            id: g.id,
            label: g.label,
            format: g.format,
          })),
        groupVenues: groups.flatMap((g) =>
          (g.venues || []).map((venueName) => ({
            group_id: g.id,
            venue_name: venueName,
          }))
        ),
        franchises: franchises.filter((f) => f.name && f.name.trim()),
        teams: teams.filter((t) => t.name && t.group_id),
        fixtures: fixtures.filter((f) => f.team1 && f.team2 && f.group_id),
        timeSlots: timeSlots.filter((s) => s.date && s.time && s.venue),
      };

      const res = await fetch(`${API_BASE}/admin/tournament-wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save tournament");
      }
      setSaveSuccess(`Tournament created: ${json.tournament_id}`);
    } catch (err) {
      setSaveError(err.message || "Failed to save tournament");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/venues`);
        if (!res.ok) throw new Error("Failed to load venues");
        const json = await res.json();
        if (!alive) return;
        const list = (json?.data || []).map((v) => v.name).filter(Boolean);
        setVenueOptions(list);
      } catch (err) {
        console.warn("Failed to load venues", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="wizard-page">
      <header className="wizard-header">
        <div>
          <p className="wizard-eyebrow">Admin Console</p>
          <h1>Tournament Setup Wizard</h1>
          <p className="wizard-subtitle">
            Build the tournament structure, teams, pools, and fixtures in one flow.
          </p>
        </div>
        <button
          type="button"
          className="wizard-primary"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving..." : "Create Tournament"}
        </button>
      </header>

      {saveError ? <div className="wizard-alert error">{saveError}</div> : null}
      {formErrors.length > 1 && !saveError ? (
        <div className="wizard-alert error">
          {formErrors.map((msg) => (
            <div key={msg}>{msg}</div>
          ))}
        </div>
      ) : null}
      {saveSuccess ? <div className="wizard-alert success">{saveSuccess}</div> : null}

      <WizardStepHeader step={step} onStepChange={setStep} />

      {step === 0 && (
        <div className="wizard-grid">
          <SectionCard title="Tournament Details">
            <Field label="Tournament Name" error={invalidTournamentName ? "Required" : ""}>
              <input
                type="text"
                value={tournament.name}
                className={invalidTournamentName ? "wizard-input invalid" : "wizard-input"}
                onChange={(e) => updateTournament({ name: e.target.value })}
                placeholder="HJ Indoor 2026"
              />
            </Field>
            <Field label="Season" error={invalidTournamentSeason ? "Required" : ""}>
              <input
                type="text"
                value={tournament.season}
                className={invalidTournamentSeason ? "wizard-input invalid" : "wizard-input"}
                onChange={(e) => updateTournament({ season: e.target.value })}
                placeholder="2026"
              />
            </Field>
            <Field
              label="Tournament ID"
              hint={`Suggested: ${tournamentIdHint || "hj-..."}`}
              error={invalidTournamentId ? "Required" : ""}
            >
              <input
                type="text"
                value={tournament.id}
                className={invalidTournamentId ? "wizard-input invalid" : "wizard-input"}
                onChange={(e) => updateTournament({ id: e.target.value })}
                placeholder={tournamentIdHint || "hj-indoor-2026"}
              />
            </Field>
          </SectionCard>

          <SectionCard
            title="Venues"
            actions={<button type="button" onClick={addVenue}>Add Venue</button>}
          >
            {venues.map((venue, idx) => (
              <div className="wizard-row" key={`venue-${idx}`}>
                <Field label="Venue">
                  {!venue.isNew ? (
                    <select
                      value={venue.name}
                      className={!venue.name.trim() ? "wizard-input invalid" : "wizard-input"}
                      onChange={(e) => handleVenueChange(idx, e.target.value)}
                    >
                      <option value="">Select venue</option>
                      {venueOptions.map((name) => (
                        <option key={`venue-opt-${name}`} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={venue.name}
                      className={!venue.name.trim() ? "wizard-input invalid" : "wizard-input"}
                      onChange={(e) => handleVenueChange(idx, e.target.value)}
                      placeholder="New venue name"
                    />
                  )}
                  {!venue.name.trim() ? (
                    <span className="wizard-field-error">
                      {venue.isNew ? "Required" : "Select a venue"}
                    </span>
                  ) : null}
                </Field>
                <div className="wizard-inline">
                  <button
                    type="button"
                    onClick={() => setVenueMode(idx, !venue.isNew)}
                  >
                    {venue.isNew ? "Choose Existing" : "Add New"}
                  </button>
                </div>
                <button type="button" onClick={() => removeVenue(idx)}>Remove</button>
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {step === 1 && (
        <SectionCard
          title="Groups"
          actions={<button type="button" onClick={addGroup}>Add Group</button>}
        >
          {groups.map((group, idx) => (
            <div className="wizard-block" key={`group-${idx}`}>
              <div className="wizard-row">
                <Field label="Group ID">
                  <input
                    type="text"
                    value={group.id}
                    className={!group.id.trim() ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateGroup(idx, { id: e.target.value })}
                    placeholder="U11B"
                  />
                </Field>
                <Field label="Label">
                  <input
                    type="text"
                    value={group.label}
                    className={!group.label.trim() ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateGroup(idx, { label: e.target.value })}
                    placeholder="U11 Boys"
                  />
                </Field>
                <Field label="Format">
                  <input
                    type="text"
                    value={group.format}
                    className="wizard-input"
                    onChange={(e) => updateGroup(idx, { format: e.target.value })}
                    placeholder="Round-robin"
                  />
                </Field>
                <Field label="Pool Count">
                  <input
                    type="number"
                    min="1"
                    value={group.pool_count}
                    className="wizard-input"
                    onChange={(e) =>
                      updateGroup(idx, { pool_count: Number(e.target.value) || 1 })
                    }
                  />
                </Field>
              </div>
              <div className="wizard-choices">
                <span className="wizard-field-label">Venues</span>
                <div className="wizard-choice-list">
                  {allVenueOptions.length === 0 && (
                    <span className="wizard-choice-empty">Add venues in Step 1.</span>
                  )}
                  {allVenueOptions.map((venueName) => (
                    <label key={`${group.id}-${venueName}`} className="wizard-choice">
                      <input
                        type="checkbox"
                        checked={(group.venues || []).includes(venueName)}
                        onChange={() => toggleGroupVenue(idx, venueName)}
                      />
                      <span>{venueName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => removeGroup(idx)}>Remove Group</button>
            </div>
          ))}
        </SectionCard>
      )}

      {step === 2 && (
        <div className="wizard-grid">
          <SectionCard
            title="Franchises"
            actions={<button type="button" onClick={addFranchise}>Add Franchise</button>}
          >
            <div className="wizard-block">
              <Field label="Bulk Import (one franchise per line)">
                <textarea
                  rows={3}
                  value={franchiseImport}
                  className="wizard-input"
                  onChange={(e) => setFranchiseImport(e.target.value)}
                  placeholder="Purple Panthers\nBlue Cranes\nBlack Hawks"
                />
              </Field>
              <button type="button" onClick={applyFranchiseImport}>Import Franchises</button>
            </div>
            {franchises.map((franchise, idx) => (
              <div className="wizard-block" key={`franchise-${idx}`}>
                <div className="wizard-row">
                  <Field label="Name">
                  <input
                    type="text"
                    value={franchise.name}
                    className={!franchise.name.trim() ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateFranchise(idx, { name: e.target.value })}
                    placeholder="Purple Panthers"
                  />
                </Field>
                <Field label="Logo URL">
                  <input
                    type="text"
                    value={franchise.logo_url}
                    className="wizard-input"
                    onChange={(e) => updateFranchise(idx, { logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
                </div>
                <div className="wizard-row">
                  <Field label="Manager Name">
                  <input
                    type="text"
                    value={franchise.manager_name}
                    className="wizard-input"
                    onChange={(e) => updateFranchise(idx, { manager_name: e.target.value })}
                    placeholder="Manager name"
                  />
                </Field>
                  <Field label="Manager Photo URL">
                  <input
                    type="text"
                    value={franchise.manager_photo_url}
                    className="wizard-input"
                    onChange={(e) =>
                      updateFranchise(idx, { manager_photo_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </Field>
                </div>
                <div className="wizard-row">
                  <Field label="Contact Phone">
                  <input
                    type="text"
                    value={franchise.contact_phone}
                    className="wizard-input"
                    onChange={(e) => updateFranchise(idx, { contact_phone: e.target.value })}
                    placeholder="+27..."
                  />
                </Field>
                  <Field label="Contact Email">
                  <input
                    type="text"
                    value={franchise.contact_email}
                    className="wizard-input"
                    onChange={(e) => updateFranchise(idx, { contact_email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </Field>
                </div>
                <Field label="Location Map URL">
                  <input
                    type="text"
                    value={franchise.location_map_url}
                    className="wizard-input"
                    onChange={(e) =>
                      updateFranchise(idx, { location_map_url: e.target.value })
                    }
                    placeholder="https://maps.google.com/..."
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    rows={3}
                    value={franchise.description}
                    className="wizard-input"
                    onChange={(e) => updateFranchise(idx, { description: e.target.value })}
                    placeholder="Franchise description"
                  />
                </Field>
                <button type="button" onClick={() => removeFranchise(idx)}>Remove Franchise</button>
              </div>
            ))}
          </SectionCard>

          <SectionCard
            title="Teams"
            actions={<button type="button" onClick={addTeam}>Add Team</button>}
          >
            <div className="wizard-block">
              <Field label="Bulk Import (group_id, team_name, franchise, pool)">
                <textarea
                  rows={4}
                  value={teamImport}
                  className="wizard-input"
                  onChange={(e) => setTeamImport(e.target.value)}
                  placeholder="U11B, PP Amber, Purple Panthers, A\nU11B, Knights Orange, Knights, A"
                />
              </Field>
              <button type="button" onClick={applyTeamImport}>Import Teams</button>
            </div>
            {teams.map((team, idx) => (
              <div className="wizard-block" key={`team-${idx}`}>
                <div className="wizard-row">
                  <Field label="Group">
                    <select
                    value={team.group_id}
                    className={!team.group_id ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateTeam(idx, { group_id: e.target.value })}
                  >
                      <option value="">Select group</option>
                      {groupOptions.map((g) => (
                        <option key={`team-group-${g}`} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Team Name">
                    <input
                      type="text"
                      value={team.name}
                      className={!team.name.trim() ? "wizard-input invalid" : "wizard-input"}
                      onChange={(e) => updateTeam(idx, { name: e.target.value })}
                      placeholder="PP Amber"
                    />
                  </Field>
                </div>
                <div className="wizard-row">
                  <Field label="Franchise">
                  <input
                    type="text"
                    value={team.franchise_name}
                    className={!team.franchise_name.trim() ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateTeam(idx, { franchise_name: e.target.value })}
                    placeholder="Purple Panthers"
                    list={`franchise-options-${idx}`}
                  />
                    <datalist id={`franchise-options-${idx}`}>
                      {franchiseOptions.map((name) => (
                        <option key={`franchise-${idx}-${name}`} value={name} />
                      ))}
                    </datalist>
                    {team.name ? (
                      <span className="wizard-field-hint">
                        Suggested: {parseFranchiseName(team.name).franchise || "—"}
                      </span>
                    ) : null}
                  </Field>
                  <Field label="Pool">
                    <select
                      value={team.pool}
                      className="wizard-input"
                      onChange={(e) => updateTeam(idx, { pool: e.target.value })}
                    >
                      <option value="">Select pool</option>
                      {(poolsByGroup.get(team.group_id) || []).map((label) => (
                        <option key={`${team.group_id}-${label}`} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Placeholder">
                    <input
                      type="checkbox"
                      checked={team.is_placeholder}
                      onChange={(e) => updateTeam(idx, { is_placeholder: e.target.checked })}
                    />
                  </Field>
                </div>
                {team.group_id ? (
                  <button type="button" onClick={() => autoAssignPoolsForGroup(team.group_id)}>
                    Auto-assign pools for {team.group_id}
                  </button>
                ) : null}
                <button type="button" onClick={() => removeTeam(idx)}>Remove Team</button>
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {step === 3 && (
        <SectionCard
          title="Fixtures"
          actions={<button type="button" onClick={addFixture}>Add Fixture</button>}
        >
          <div className="wizard-block">
            <div className="wizard-row">
              <Field label="Group" error={generatorErrors.groupId}>
                <select
                  value={generator.groupId}
                  className={generatorErrors.groupId ? "wizard-input invalid" : "wizard-input"}
                  onChange={(e) => setGenerator((prev) => ({ ...prev, groupId: e.target.value }))}
                >
                  <option value="">Select group</option>
                  {groupOptions.map((g) => (
                    <option key={`gen-group-${g}`} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pool" error={generatorErrors.pool}>
                <select
                  value={generator.pool}
                  className={generatorErrors.pool ? "wizard-input invalid" : "wizard-input"}
                  onChange={(e) => setGenerator((prev) => ({ ...prev, pool: e.target.value }))}
                >
                  <option value="">Select pool</option>
                  <option value="ALL">All pools</option>
                  {(poolsByGroup.get(generator.groupId) || []).map((label) => (
                    <option key={`gen-pool-${label}`} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date" error={generatorErrors.startDate}>
                <input
                  type="date"
                  value={generator.startDate}
                  className={generatorErrors.startDate ? "wizard-input invalid" : "wizard-input"}
                  onChange={(e) => setGenerator((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </Field>
            </div>
            <div className="wizard-row">
              <Field label="Default Time">
                <input
                  type="text"
                  value={generator.time}
                  onChange={(e) => setGenerator((prev) => ({ ...prev, time: e.target.value }))}
                  placeholder="09:00"
                />
              </Field>
              <Field label="Default Venue">
                <select
                  value={generator.venue}
                  className="wizard-input"
                  onChange={(e) => setGenerator((prev) => ({ ...prev, venue: e.target.value }))}
                >
                  <option value="">Select venue</option>
                  {allVenueOptions.map((venue) => (
                    <option key={`gen-venue-${venue}`} value={venue}>
                      {venue}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Round Prefix">
                <input
                  type="text"
                  value={generator.roundPrefix}
                  className="wizard-input"
                  onChange={(e) =>
                    setGenerator((prev) => ({ ...prev, roundPrefix: e.target.value }))
                  }
                  placeholder="Round"
                />
              </Field>
            </div>
            <button type="button" onClick={generateFixtures}>Generate Fixtures</button>
          </div>
          {generator.groupId ? (
            <div className="wizard-block">
              <Field label="Pool helper">
                <button
                  type="button"
                  onClick={() => autoAssignPoolsForGroup(generator.groupId)}
                >
                  Auto-assign pools for {generator.groupId}
                </button>
              </Field>
            </div>
          ) : null}
          <SectionCard
            title="Time Slots"
            actions={<button type="button" onClick={addTimeSlot}>Add Slot</button>}
          >
            {timeSlots.map((slot, idx) => (
              <div className="wizard-block" key={`slot-${idx}`}>
                <div className="wizard-row">
                  <Field label="Date">
                    <input
                      type="date"
                      value={slot.date}
                      className={!slot.date ? "wizard-input invalid" : "wizard-input"}
                      onChange={(e) => updateTimeSlot(idx, { date: e.target.value })}
                    />
                  </Field>
                  <Field label="Time">
                    <input
                      type="text"
                      value={slot.time}
                      className={!slot.time ? "wizard-input invalid" : "wizard-input"}
                      onChange={(e) => updateTimeSlot(idx, { time: e.target.value })}
                      placeholder="09:00"
                    />
                  </Field>
                  <Field label="Venue">
                    <select
                      value={slot.venue}
                      className={!slot.venue ? "wizard-input invalid" : "wizard-input"}
                      onChange={(e) => updateTimeSlot(idx, { venue: e.target.value })}
                    >
                      <option value="">Select venue</option>
                      {allVenueOptions.map((venue) => (
                        <option key={`slot-venue-${venue}`} value={venue}>
                          {venue}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Label">
                  <input
                    type="text"
                    value={slot.label}
                    className="wizard-input"
                    onChange={(e) => updateTimeSlot(idx, { label: e.target.value })}
                    placeholder="Court 1 AM"
                  />
                </Field>
                <button type="button" onClick={() => removeTimeSlot(idx)}>Remove Slot</button>
              </div>
            ))}
          </SectionCard>
          {fixtures.map((fixture, idx) => (
            <div className="wizard-block" key={`fixture-${idx}`}>
              <div className="wizard-row">
                <Field label="Group">
                  <select
                    value={fixture.group_id}
                    className={!fixture.group_id ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateFixture(idx, { group_id: e.target.value })}
                  >
                    <option value="">Select group</option>
                    {groupOptions.map((g) => (
                      <option key={`fixture-group-${g}`} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    value={fixture.date}
                    className={!fixture.date ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateFixture(idx, { date: e.target.value })}
                  />
                </Field>
                <Field label="Time (optional)">
                  <input
                    type="text"
                    value={fixture.time}
                    className="wizard-input"
                    onChange={(e) => updateFixture(idx, { time: e.target.value })}
                    placeholder="09:00"
                  />
                </Field>
              </div>
              <div className="wizard-row">
                <Field label="Venue">
                  <select
                    value={fixture.venue}
                    className="wizard-input"
                    onChange={(e) => updateFixture(idx, { venue: e.target.value })}
                  >
                    <option value="">Select venue</option>
                    {allVenueOptions.map((venue) => (
                      <option key={`fixture-venue-${venue}`} value={venue}>
                        {venue}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pool">
                  <input
                    type="text"
                    value={fixture.pool}
                    className={!fixture.pool.trim() ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateFixture(idx, { pool: e.target.value })}
                    placeholder="A"
                  />
                </Field>
                <Field label="Round">
                  <input
                    type="text"
                    value={fixture.round}
                    className="wizard-input"
                    onChange={(e) => updateFixture(idx, { round: e.target.value })}
                    placeholder="Round 1"
                  />
                </Field>
              </div>
              <div className="wizard-row">
                <Field label="Team 1">
                  <input
                    type="text"
                    value={fixture.team1}
                    className={!fixture.team1.trim() ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateFixture(idx, { team1: e.target.value })}
                    list={`fixture-team1-${idx}`}
                  />
                  <datalist id={`fixture-team1-${idx}`}>
                    {(teamOptionsByGroup.get(fixture.group_id) || []).map((teamName) => (
                      <option key={`${idx}-team1-${teamName}`} value={teamName} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Team 2">
                  <input
                    type="text"
                    value={fixture.team2}
                    className={!fixture.team2.trim() ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateFixture(idx, { team2: e.target.value })}
                    list={`fixture-team2-${idx}`}
                  />
                  <datalist id={`fixture-team2-${idx}`}>
                    {(teamOptionsByGroup.get(fixture.group_id) || []).map((teamName) => (
                      <option key={`${idx}-team2-${teamName}`} value={teamName} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <button type="button" onClick={() => removeFixture(idx)}>Remove Fixture</button>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
