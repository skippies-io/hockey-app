import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { API_BASE } from "../../lib/api";
import { normalizeTeamName } from "../../lib/franchise";
import { computeFormErrors } from "./tournamentWizardUtils";

const STEP_LABELS = ["Tournament", "Groups", "Teams", "Fixtures"];
function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
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

WizardStepHeader.propTypes = {
  step: PropTypes.number.isRequired,
  onStepChange: PropTypes.func.isRequired,
};

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

Field.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  hint: PropTypes.string,
  error: PropTypes.string,
};

Field.defaultProps = {
  hint: "",
  error: "",
};

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

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  actions: PropTypes.node,
};

SectionCard.defaultProps = {
  actions: null,
};

function emptyGroup(key) {
  return { _key: key, id: "", label: "", format: "", venues: [], pool_count: 1 };
}

function emptyTeam(key, groupId = "") {
  return {
    _key: key,
    group_id: groupId,
    name: "",
  };
}

function emptyFixture(key, groupId = "") {
  return {
    _key: key,
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
    labels.push(String.fromCodePoint(65 + i));
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
  const keyCounter = useRef(0);
  const makeKey = React.useCallback((prefix) => {
    keyCounter.current += 1;
    return `${prefix}-${keyCounter.current}`;
  }, []);
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
  const [venues, setVenues] = useState(() => [
    { _key: makeKey("venue"), name: "" },
  ]);
  const [groups, setGroups] = useState(() => [emptyGroup(makeKey("group"))]);
  const [teams, setTeams] = useState(() => [emptyTeam(makeKey("team"))]);
  const [fixtures, setFixtures] = useState(() => [emptyFixture(makeKey("fixture"))]);
  const [timeSlots, setTimeSlots] = useState([
    { _key: makeKey("slot"), date: "", time: "", venue: "", label: "" },
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
  const [teamImport, setTeamImport] = useState("");

  const formErrors = useMemo(
    () => computeFormErrors({ tournament, groups, teams, fixtures }),
    [tournament, groups, teams, fixtures]
  );

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

  React.useEffect(() => {
    setTeams((prev) => {
      const next = prev.map((team) => ({ ...team }));
      const grouped = new Map();
      next.forEach((team) => {
        if (!team.group_id || !team.name?.trim()) return;
        if (!grouped.has(team.group_id)) grouped.set(team.group_id, []);
        grouped.get(team.group_id).push(team);
      });
      grouped.forEach((groupTeams, groupId) => {
        const labels = poolsByGroup.get(groupId) || ["A"];
        groupTeams.forEach((team, idx) => {
          team.pool = labels[idx % labels.length];
        });
      });
      return next;
    });
  }, [poolsByGroup]);

  const selectedVenueOptions = useMemo(() => {
    const list = venues.map((v) => v.name).filter(Boolean);
    return Array.from(new Set(list.map((v) => v.trim()).filter(Boolean)));
  }, [venues]);


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
    setVenues((prev) => [...prev, { _key: makeKey("venue"), name: "" }]);
  }

  function removeVenue(index) {
    setVenues((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateGroup(index, patch) {
    setGroups((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addGroup() {
    setGroups((prev) => [...prev, emptyGroup(makeKey("group"))]);
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

  function updateTeam(index, patch) {
    setTeams((prev) => {
      const next = [...prev];
      const updated = { ...next[index], ...patch };
      next[index] = updated;
      const groupId = updated.group_id;
      if (groupId) {
        const groupPoolLabels = poolsByGroup.get(groupId) || ["A"];
        let cursor = 0;
        next.forEach((team) => {
          if (team.group_id === groupId && team.name?.trim()) {
            team.pool = groupPoolLabels[cursor % groupPoolLabels.length];
            cursor += 1;
          }
        });
      }
      return next;
    });
  }

  function addTimeSlot() {
    setTimeSlots((prev) => [
      ...prev,
      { _key: makeKey("slot"), date: "", time: "", venue: "", label: "" },
    ]);
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

  function applyTeamImport() {
    const lines = parseLines(teamImport);
    const entries = [];
    for (const line of lines) {
      const [group_id, name] = line
        .split(",")
        .map((part) => part.trim());
      if (!group_id || !name) continue;
      entries.push({
        _key: makeKey("team"),
        group_id,
        name,
      });
    }
    if (!entries.length) return;
    setTeams((prev) => {
      const next = [...prev, ...entries].map((team) => ({ ...team }));
      const grouped = new Map();
      next.forEach((team) => {
        if (!team.group_id || !team.name?.trim()) return;
        if (!grouped.has(team.group_id)) grouped.set(team.group_id, []);
        grouped.get(team.group_id).push(team);
      });
      grouped.forEach((groupTeams, groupId) => {
        const labels = poolsByGroup.get(groupId) || ["A"];
        groupTeams.forEach((team, idx) => {
          team.pool = labels[idx % labels.length];
        });
      });
      return next;
    });
    setTeamImport("");
  }

  function addTeam() {
    setTeams((prev) => [...prev, emptyTeam(makeKey("team"))]);
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
    setFixtures((prev) => [...prev, emptyFixture(makeKey("fixture"))]);
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
      .filter((t) => t.group_id === groupId)
      .map((t) => normalizeTeamName(t.name));
    if (teamsInGroup.length < 2) {
      setSaveError("Not enough teams in the group to generate fixtures.");
      return;
    }
    const groupPools = poolsByGroup.get(groupId) || [pool];
    const targetPools = pool === "ALL" ? groupPools : [pool];
    const nextFixtures = [];
    for (const poolLabel of targetPools) {
      const poolTeams = teams
        .filter(
          (t) =>
            t.group_id === groupId &&
            ((t.pool || "").trim() === poolLabel || groupPools.length === 1)
        )
        .map((t) => normalizeTeamName(t.name));
      if (poolTeams.length < 2) continue;
      const rounds = roundRobinPairs(poolTeams);
      for (let roundIdx = 0; roundIdx < rounds.length; roundIdx += 1) {
        const pairs = rounds[roundIdx];
        for (let pairIdx = 0; pairIdx < pairs.length; pairIdx += 1) {
          const [team1, team2] = pairs[pairIdx];
          nextFixtures.push({
            _key: makeKey("fixture"),
            group_id: groupId,
            date: startDate,
            time: time || "",
            venue: venue || "",
            round: roundPrefix ? `${roundPrefix} ${roundIdx + 1}` : `Round ${roundIdx + 1}`,
            pool: poolLabel,
            team1,
            team2,
          });
        }
      }
    }
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
        venues: venues
          .filter((v) => v.name?.trim())
          .map((v) => ({ name: v.name.trim() })),
        groups: groups
          .filter((g) => g.id?.trim() && g.label?.trim())
          .map((g) => ({
            id: g.id,
            label: g.label,
            format: g.format,
          })),
        groupVenues: groups.flatMap((g) =>
          (g.venues ?? []).filter(Boolean).map((venueName) => ({
            group_id: g.id,
            venue_name: venueName,
          }))
        ),
        teams: teams
          .filter((t) => t.name?.trim() && t.group_id)
          .map((t) => ({
            group_id: t.group_id,
            name: t.name,
            is_placeholder: false,
          })),
        fixtures: fixtures
          .filter((f) => f.team1?.trim() && f.team2?.trim() && f.group_id)
          .map((f) => ({
            group_id: f.group_id,
            date: f.date,
            time: f.time,
            venue: f.venue,
            round: f.round,
            pool: f.pool,
            team1: f.team1,
            team2: f.team2,
          })),
        timeSlots: timeSlots
          .filter((s) => s.date?.trim() && s.time?.trim() && s.venue?.trim())
          .map((s) => ({
            date: s.date,
            time: s.time,
            venue: s.venue,
            label: s.label,
          })),
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

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/groups`);
        if (!res.ok) throw new Error("Failed to load group seeds");
        const json = await res.json();
        if (!alive) return;
        const list = Array.isArray(json?.data) ? json.data : [];
        setGroups((prev) => {
          const isPristine =
            prev.length === 1 &&
            !prev[0].id?.trim() &&
            !prev[0].label?.trim() &&
            !prev[0].format?.trim();
          if (!isPristine || list.length === 0) return prev;
          return list.map((seed) => ({
            _key: makeKey("group"),
            id: seed.id || "",
            label: seed.label || "",
            format: seed.format || "Round-robin",
            venues: [],
            pool_count: 1,
          }));
        });
      } catch (err) {
        console.warn("Failed to load group seeds", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [makeKey]);

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
      <div className="wizard-step-nav">
        <button
          type="button"
          className="wizard-secondary"
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          disabled={step === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="wizard-primary"
          onClick={() => setStep((prev) => Math.min(STEP_LABELS.length - 1, prev + 1))}
          disabled={step === STEP_LABELS.length - 1}
        >
          Next
        </button>
      </div>

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
            {venues.map((venue, idx) => {
              const venueHasName = Boolean(venue.name?.trim());
              return (
                <div className="wizard-row" key={venue._key}>
                  <Field label="Venue">
                    <select
                      value={venue.name}
                      className={venueHasName ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => handleVenueChange(idx, e.target.value)}
                    >
                      <option value="">Select venue</option>
                      {venueOptions.map((name) => (
                        <option key={`venue-opt-${name}`} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {venueHasName ? null : (
                      <span className="wizard-field-error">
                        Select a venue
                      </span>
                    )}
                  </Field>
                  <button type="button" onClick={() => removeVenue(idx)}>Remove</button>
                </div>
              );
            })}
          </SectionCard>
        </div>
      )}

      {step === 1 && (
        <SectionCard
          title="Groups"
          actions={<button type="button" onClick={addGroup}>Add Group</button>}
        >
          {groups.map((group, idx) => (
            <div className="wizard-block" key={group._key}>
              <div className="wizard-row">
                <Field label="Group ID">
                  <input
                    type="text"
                    value={group.id}
                    className={group.id.trim() ? "wizard-input" : "wizard-input invalid"}
                    onChange={(e) => updateGroup(idx, { id: e.target.value })}
                    placeholder="U11B"
                  />
                </Field>
                <Field label="Label">
                  <input
                    type="text"
                    value={group.label}
                    className={group.label.trim() ? "wizard-input" : "wizard-input invalid"}
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
                  {selectedVenueOptions.length === 0 && (
                    <span className="wizard-choice-empty">Select venues in Step 1.</span>
                  )}
                  {selectedVenueOptions.map((venueName) => (
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
            title="Teams"
            actions={<button type="button" onClick={addTeam}>Add Team</button>}
          >
            <div className="wizard-block">
              <Field label="Bulk Import (group_id, team_name)">
                <textarea
                  rows={4}
                  value={teamImport}
                  className="wizard-input"
                  onChange={(e) => setTeamImport(e.target.value)}
                  placeholder="U11B, PP Amber\nU11B, Knights Orange"
                />
              </Field>
              <button type="button" onClick={applyTeamImport}>Import Teams</button>
            </div>
            {teams.map((team, idx) => {
              const teamHasGroup = Boolean(team.group_id);
              const teamHasName = Boolean(team.name?.trim());
              return (
              <div className="wizard-block" key={team._key}>
                <div className="wizard-row">
                  <Field label="Group">
                    <select
                    value={team.group_id}
                    className={teamHasGroup ? "wizard-input" : "wizard-input invalid"}
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
                      className={teamHasName ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => updateTeam(idx, { name: e.target.value })}
                      placeholder="PP Amber"
                    />
                  </Field>
                </div>
                <button type="button" onClick={() => removeTeam(idx)}>Remove Team</button>
              </div>
            );
            })}
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
                  {selectedVenueOptions.map((venue) => (
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
          <SectionCard
            title="Time Slots"
            actions={<button type="button" onClick={addTimeSlot}>Add Slot</button>}
          >
            {timeSlots.map((slot, idx) => {
              const slotHasDate = Boolean(slot.date);
              const slotHasTime = Boolean(slot.time);
              const slotHasVenue = Boolean(slot.venue);
              return (
              <div className="wizard-block" key={slot._key}>
                <div className="wizard-row">
                  <Field label="Date">
                    <input
                      type="date"
                      value={slot.date}
                      className={slotHasDate ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => updateTimeSlot(idx, { date: e.target.value })}
                    />
                  </Field>
                  <Field label="Time">
                    <input
                      type="text"
                      value={slot.time}
                      className={slotHasTime ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => updateTimeSlot(idx, { time: e.target.value })}
                      placeholder="09:00"
                    />
                  </Field>
                  <Field label="Venue">
                    <select
                      value={slot.venue}
                      className={slotHasVenue ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => updateTimeSlot(idx, { venue: e.target.value })}
                    >
                      <option value="">Select venue</option>
                      {selectedVenueOptions.map((venue) => (
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
            );
            })}
          </SectionCard>
          {fixtures.map((fixture, idx) => {
            const fixtureHasGroup = Boolean(fixture.group_id);
            const fixtureHasDate = Boolean(fixture.date);
            const fixtureHasPool = Boolean(fixture.pool?.trim());
            const fixtureHasTeam1 = Boolean(fixture.team1?.trim());
            const fixtureHasTeam2 = Boolean(fixture.team2?.trim());
            return (
            <div className="wizard-block" key={fixture._key}>
              <div className="wizard-row">
                <Field label="Group">
                  <select
                    value={fixture.group_id}
                    className={fixtureHasGroup ? "wizard-input" : "wizard-input invalid"}
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
                    className={fixtureHasDate ? "wizard-input" : "wizard-input invalid"}
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
                    {selectedVenueOptions.map((venue) => (
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
                    className={fixtureHasPool ? "wizard-input" : "wizard-input invalid"}
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
                    className={fixtureHasTeam1 ? "wizard-input" : "wizard-input invalid"}
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
                    className={fixtureHasTeam2 ? "wizard-input" : "wizard-input invalid"}
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
          );
          })}
        </SectionCard>
      )}
    </div>
  );
}
