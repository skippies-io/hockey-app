import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
// NOTE: franchises now come from the admin franchise directory (global)
// import { getFranchises } from "../../lib/api";
import { adminFetch } from "../../lib/adminAuth";
import { parseFranchiseName, normalizeTeamName } from "../../lib/franchise";
import { computeFormErrors } from "./tournamentWizardUtils";

const STEP_LABELS = ["Tournament", "Groups & Pools", "Teams & Fixtures", "Review & Submit"];

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

function WizardStepHeader({ step, onStepChange, stepComplete }) {
  return (
    <div className="wizard-steps">
      {STEP_LABELS.map((label, idx) => (
        <button
          type="button"
          key={label}
          className={`wizard-step ${idx === step ? "active" : ""} ${stepComplete?.[idx] ? "completed" : ""}`}
          onClick={() => onStepChange(idx)}
        >
          <span className="wizard-step-index">
            {stepComplete?.[idx] ? "✓" : idx + 1}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

WizardStepHeader.propTypes = {
  step: PropTypes.number.isRequired,
  onStepChange: PropTypes.func.isRequired,
  stepComplete: PropTypes.arrayOf(PropTypes.bool),
};

WizardStepHeader.defaultProps = {
  stepComplete: [],
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

const FORMAT_OPTIONS = [
  "Round-robin",
  "Knockout",
  "Pool Stage + Knockout",
  "Round-robin + Finals",
];

function abbreviateGroup(label) {
  const parts = String(label || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase()).join("");
}

function emptyGroup(key) {
  return { _key: key, label: "", format: "", venues: [], pool_count: 1, playDate: "", defaultTime: "" };
}

function emptyTeam(key, groupId = "") {
  return {
    _key: key,
    group_id: groupId,
    name: "",
    franchise_name: "",
    is_placeholder: false,
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
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [venueOptions, setVenueOptions] = useState([]);
  const [apiFranchiseNames, setApiFranchiseNames] = useState([]);
  const [franchiseTeamNames, setFranchiseTeamNames] = useState({}); // { franchiseName: string[] }

  const [tournament, setTournament] = useState({
    name: "",
    season: "",
  });
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [groups, setGroups] = useState(() => [emptyGroup(makeKey("group"))]);
  const [teams, setTeams] = useState(() => [emptyTeam(makeKey("team"))]);
  const [fixtures, setFixtures] = useState(() => [emptyFixture(makeKey("fixture"))]);

  const [generator, setGenerator] = useState({
    groupId: "",
    pool: "A",
    startDate: "",
    venue: "",
    time: "",
    roundPrefix: "Round",
  });
  const [generatorErrors, setGeneratorErrors] = useState({});

  const formErrors = useMemo(
    () => computeFormErrors({ tournament, groups, teams, fixtures }),
    [tournament, groups, teams, fixtures]
  );

  const tournamentIdHint = useMemo(
    () => slugForTournament(tournament.name, tournament.season),
    [tournament.name, tournament.season]
  );

  const [touched, setTouched] = useState({});

  function touch(key) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }
  function touchAll(keys) {
    setTouched((prev) => keys.reduce((acc, k) => ({ ...acc, [k]: true }), prev));
  }

  const invalidTournamentName = touched.name && !tournament.name.trim();
  const invalidTournamentSeason = touched.season && !tournament.season.trim();

  const groupOptions = useMemo(
    () =>
      groups
        .filter((g) => g.label?.trim())
        .map((g) => ({ id: abbreviateGroup(g.label), label: g.label })),
    [groups]
  );

  const poolsByGroup = useMemo(() => {
    const map = new Map();
    groups.forEach((g) => {
      const id = abbreviateGroup(g.label);
      if (!id) return;
      const labels = poolLabels(g.pool_count || 1);
      map.set(id, labels);
    });
    return map;
  }, [groups]);

  const allVenueOptions = useMemo(() => {
    return Array.from(new Set(venueOptions.map((v) => String(v).trim()).filter(Boolean)));
  }, [venueOptions]);

  const stepComplete = useMemo(() => [
    Boolean(tournament.name.trim() && tournament.season.trim()),
    groups.some((g) => g.label?.trim()),
    teams.some((t) => t.name?.trim() && t.group_id),
    false,
  ], [tournament, groups, teams]);

  const teamOptionsByGroup = useMemo(() => {
    const map = new Map();
    teams.forEach((team) => {
      const groupId = team.group_id || "";
      if (!groupId) return;
      if (!map.has(groupId)) map.set(groupId, []);
      if (team.name?.trim()) map.get(groupId).push(normalizeTeamName(team.name));
    });
    return map;
  }, [teams]);

  const franchiseOptions = useMemo(() => {
    return Array.from(new Set(apiFranchiseNames.map((n) => String(n).trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [apiFranchiseNames]);

  function updateTournament(next) {
    setTournament((prev) => ({ ...prev, ...next }));
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

  function setGroupVenues(index, nextVenues) {
    setGroups((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], venues: nextVenues };
      return next;
    });
  }

  async function loadFranchiseTeamNames(franchiseName) {
    if (!franchiseName || franchiseTeamNames[franchiseName] !== undefined) return;
    try {
      const res = await adminFetch(`/admin/franchise-teams?franchise=${encodeURIComponent(franchiseName)}`);
      if (!res.ok) return;
      const json = await res.json();
      setFranchiseTeamNames((prev) => ({ ...prev, [franchiseName]: json?.data || [] }));
    } catch {
      // non-critical
    }
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
      .filter((t) => t.group_id === groupId && !t.is_placeholder)
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
            !t.is_placeholder &&
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

  function handleNext() {
    if (step === 0) {
      if (!tournament.name.trim() || !tournament.season.trim()) {
        touchAll(["name", "season"]);
        setSaveError("Please fill in all required fields before continuing.");
        return;
      }
    }
    if (step === 1) {
      if (!groups.some((g) => g.label?.trim())) {
        touchAll(groups.flatMap((_, i) => [`group-${i}-label`]));
        setSaveError("Add at least one division before continuing.");
        return;
      }
    }
    setSaveError("");
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
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
          id: tournamentIdHint,
          name: tournament.name,
          season: tournament.season,
        },

        groups: groups
          .filter((g) => g.label?.trim())
          .map((g) => ({
            id: abbreviateGroup(g.label),
            label: g.label,
            format: g.format,
          })),
        groupVenues: groups.flatMap((g) =>
          (g.venues ?? []).filter(Boolean).map((venueName) => ({
            group_id: abbreviateGroup(g.label),
            venue_name: venueName,
          }))
        ),

        teams: teams
          .filter((t) => t.name?.trim() && t.group_id)
          .map((t) => ({
            group_id: t.group_id,
            name: t.name,
            franchise_name: t.franchise_name,
            is_placeholder: t.is_placeholder,
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
      };

      const res = await adminFetch("/admin/tournament-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save tournament");
      }
      setSaveSuccess(`Tournament created: ${json.tournament_id}`);
      setTimeout(() => navigate("/admin/fixtures"), 1500);
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
        const res = await adminFetch("/admin/venues");
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
        const res = await adminFetch("/admin/divisions");
        if (!res.ok) return;
        const json = await res.json();
        if (!alive) return;
        setDivisionOptions((json?.data || []).filter(Boolean));
      } catch {
        // non-critical, silently ignore
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
        const res = await adminFetch("/admin/franchises");
        if (!res.ok) throw new Error("Failed to load franchises");
        const json = await res.json();
        if (!alive) return;
        const names = (json?.data || []).map((f) => f.name).filter(Boolean);
        setApiFranchiseNames(names);
      } catch (err) {
        console.warn("Failed to load franchises", err);
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

      <WizardStepHeader step={step} onStepChange={setStep} stepComplete={stepComplete} />

      {step === 0 && (
        <div className="wizard-grid">
          <SectionCard title="Tournament Details">
            <Field label="Tournament Name" error={invalidTournamentName ? "Required" : ""}>
              <input
                type="text"
                value={tournament.name}
                className={invalidTournamentName ? "wizard-input invalid" : "wizard-input"}
                onChange={(e) => updateTournament({ name: e.target.value })}
                onBlur={() => touch("name")}
                placeholder="HJ Indoor 2026"
              />
            </Field>
            <Field label="Season" error={invalidTournamentSeason ? "Required" : ""}>
              <input
                type="text"
                value={tournament.season}
                className={invalidTournamentSeason ? "wizard-input invalid" : "wizard-input"}
                onChange={(e) => updateTournament({ season: e.target.value })}
                onBlur={() => touch("season")}
                placeholder="2026"
              />
            </Field>
            {tournamentIdHint && (
              <span className="wizard-field-hint">
                ID: <code>{tournamentIdHint}</code>
              </span>
            )}
          </SectionCard>

          <div className="wizard-step-nav">
            <span />
            <button type="button" className="wizard-primary" onClick={handleNext}>
              Next: Groups &amp; Pools →
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
        <SectionCard
          title="Groups"
          actions={<button type="button" onClick={addGroup}>Add Group</button>}
        >
          {groups.map((group, idx) => (
            <div className="wizard-block" key={group._key}>
              <div className="wizard-row">
                <Field label="Division / Age" error={touched[`group-${idx}-label`] && !group.label.trim() ? "Required" : ""}>
                  <input
                    type="text"
                    value={group.label}
                    className={(touched[`group-${idx}-label`] && !group.label.trim()) ? "wizard-input invalid" : "wizard-input"}
                    onChange={(e) => updateGroup(idx, { label: e.target.value })}
                    onBlur={() => touch(`group-${idx}-label`)}
                    placeholder="U11 Boys"
                    list={`division-options-${idx}`}
                  />
                  <datalist id={`division-options-${idx}`}>
                    {divisionOptions.map((opt) => (
                      <option key={`div-${idx}-${opt}`} value={opt} />
                    ))}
                  </datalist>
                  {group.label?.trim() && (
                    <span className="wizard-field-hint">ID: {abbreviateGroup(group.label)}</span>
                  )}
                </Field>
                <Field label="Format" hint="Informational — shown to participants; does not affect fixture generation">
                  <select
                    value={group.format}
                    className="wizard-input"
                    onChange={(e) => updateGroup(idx, { format: e.target.value })}
                  >
                    <option value="">— Select format —</option>
                    {FORMAT_OPTIONS.map((fmt) => (
                      <option key={fmt} value={fmt}>{fmt}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Number of Pools" hint={`Pools: ${poolLabels(group.pool_count || 1).join(", ")}`}>
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
              <div className="wizard-row">
                <Field label="Play Date" hint="Pre-fills the fixture generator date">
                  <input
                    type="date"
                    value={group.playDate}
                    className="wizard-input"
                    onChange={(e) => updateGroup(idx, { playDate: e.target.value })}
                  />
                </Field>
                <Field label="Default Start Time" hint="Pre-fills the fixture generator time">
                  <input
                    type="time"
                    value={group.defaultTime}
                    className="wizard-input"
                    onChange={(e) => updateGroup(idx, { defaultTime: e.target.value })}
                  />
                </Field>
              </div>
              <div className="wizard-choices">
                <span className="wizard-field-label">Group Venues</span>
                {allVenueOptions.length === 0 ? (
                  <span className="wizard-choice-empty">No venues available. <Link to="/admin/venues">Add them in Admin → Venues.</Link></span>
                ) : (
                  <div className="wizard-choice-list" role="group" aria-label="Group Venues">
                    {allVenueOptions.map((venueName) => (
                      <label key={`${group.id}-${venueName}`} className="wizard-choice">
                        <input
                          type="checkbox"
                          checked={(group.venues || []).includes(venueName)}
                          onChange={(e) => {
                            const current = group.venues || [];
                            setGroupVenues(
                              idx,
                              e.target.checked
                                ? [...current, venueName]
                                : current.filter((v) => v !== venueName)
                            );
                          }}
                        />
                        {venueName}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => removeGroup(idx)}>Remove Group</button>
            </div>
          ))}
        </SectionCard>
        <div className="wizard-step-nav">
          <button type="button" className="wizard-secondary" onClick={() => { setSaveError(""); setStep(0); }}>
            ← Back: Tournament
          </button>
          <button type="button" className="wizard-primary" onClick={handleNext}>
            Next: Teams &amp; Fixtures →
          </button>
        </div>
        </>
      )}

      {step === 2 && (
        <div className="wizard-grid">
          <SectionCard
            title="Teams"
            actions={<button type="button" onClick={addTeam}>Add Team</button>}
          >
              {teams.map((team, idx) => {
              const teamHasGroup = Boolean(team.group_id);
              const teamHasName = Boolean(team.name?.trim());
              const teamHasFranchise = Boolean(team.franchise_name?.trim());
              return (
              <div className="wizard-block" key={team._key}>
                <div className="wizard-row">
                  <Field label="Team Group">
                    <select
                      value={team.group_id}
                      className={teamHasGroup ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => updateTeam(idx, { group_id: e.target.value })}
                    >
                      <option value="">— Select division —</option>
                      {groupOptions.map((g) => (
                        <option key={`team-group-${g.id}`} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Franchise">
                    <select
                      value={team.franchise_name}
                      className={teamHasFranchise ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => {
                        updateTeam(idx, { franchise_name: e.target.value });
                        loadFranchiseTeamNames(e.target.value);
                      }}
                    >
                      <option value="">— Select franchise —</option>
                      {franchiseOptions.map((name) => (
                        <option key={`franchise-${idx}-${name}`} value={name}>{name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="wizard-row">
                  <Field label="Team Name" hint={team.franchise_name && (franchiseTeamNames[team.franchise_name] || []).length > 0 ? "Select a known name or type a new one" : undefined}>
                    <input
                      type="text"
                      value={team.name}
                      className={teamHasName ? "wizard-input" : "wizard-input invalid"}
                      onChange={(e) => updateTeam(idx, { name: e.target.value })}
                      placeholder="PP Amber"
                      list={`franchise-team-names-${idx}`}
                    />
                    {team.franchise_name && (franchiseTeamNames[team.franchise_name] || []).length > 0 && (
                      <datalist id={`franchise-team-names-${idx}`}>
                        {(franchiseTeamNames[team.franchise_name] || []).map((n) => (
                          <option key={`${idx}-ftn-${n}`} value={n} />
                        ))}
                      </datalist>
                    )}
                  </Field>
                  <Field label="Placeholder">
                    <input
                      type="checkbox"
                      checked={team.is_placeholder}
                      onChange={(e) => updateTeam(idx, { is_placeholder: e.target.checked })}
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

      {step === 2 && (
        <>
        <SectionCard
          title="Fixtures"
          actions={<button type="button" onClick={addFixture}>Add Fixture</button>}
        >
          <div className="wizard-block">
            <div className="wizard-row">
              <Field label="Generator Group" error={generatorErrors.groupId}>
                <select
                  value={generator.groupId}
                  className={generatorErrors.groupId ? "wizard-input invalid" : "wizard-input"}
                  onChange={(e) => {
                    const selectedGroup = groups.find((g) => abbreviateGroup(g.label) === e.target.value);
                    setGenerator((prev) => ({
                      ...prev,
                      groupId: e.target.value,
                      ...(selectedGroup?.playDate ? { startDate: selectedGroup.playDate } : {}),
                      ...(selectedGroup?.defaultTime ? { time: selectedGroup.defaultTime } : {}),
                    }));
                  }}
                >
                  <option value="">— Select division —</option>
                  {groupOptions.map((g) => (
                    <option key={`gen-group-${g.id}`} value={g.id}>
                      {g.label}
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
                  type="time"
                  value={generator.time}
                  onChange={(e) => setGenerator((prev) => ({ ...prev, time: e.target.value }))}
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
            {generator.groupId ? (
              <button
                type="button"
                onClick={() => autoAssignPoolsForGroup(generator.groupId)}
              >
                Assign teams to pools for {groupOptions.find((g) => g.id === generator.groupId)?.label || generator.groupId}
              </button>
            ) : null}
          </div>
          {fixtures.map((fixture, idx) => {
            const fixtureHasGroup = Boolean(fixture.group_id);
            const fixtureHasDate = Boolean(fixture.date);
            const fixtureHasPool = Boolean(fixture.pool?.trim());
            const fixtureHasTeam1 = Boolean(fixture.team1?.trim());
            const fixtureHasTeam2 = Boolean(fixture.team2?.trim());
            return (
            <div className="wizard-block" key={fixture._key}>
              <div className="wizard-row">
                <Field label="Fixture Group">
                  <select
                    value={fixture.group_id}
                    className={fixtureHasGroup ? "wizard-input" : "wizard-input invalid"}
                    onChange={(e) => updateFixture(idx, { group_id: e.target.value })}
                  >
                    <option value="">— Select division —</option>
                    {groupOptions.map((g) => (
                      <option key={`fixture-group-${g.id}`} value={g.id}>
                        {g.label}
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
                    type="time"
                    value={fixture.time}
                    className="wizard-input"
                    onChange={(e) => updateFixture(idx, { time: e.target.value })}
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
                  <select
                    value={fixture.pool}
                    className={fixtureHasPool ? "wizard-input" : "wizard-input invalid"}
                    onChange={(e) => updateFixture(idx, { pool: e.target.value })}
                  >
                    <option value="">Select pool</option>
                    {(poolsByGroup.get(fixture.group_id) || ["A"]).map((label) => (
                      <option key={`fixture-pool-${idx}-${label}`} value={label}>{label}</option>
                    ))}
                  </select>
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
                {(() => {
                  const teamChoices = teamOptionsByGroup.get(fixture.group_id) || [];
                  if (teamChoices.length > 0) {
                    return (
                      <>
                        <Field label="Team 1">
                          <select
                            value={fixture.team1}
                            className={fixtureHasTeam1 ? "wizard-input" : "wizard-input invalid"}
                            onChange={(e) => updateFixture(idx, { team1: e.target.value })}
                          >
                            <option value="">— Select team —</option>
                            {teamChoices.map((teamName) => (
                              <option key={`${idx}-team1-${teamName}`} value={teamName}>{teamName}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Team 2">
                          <select
                            value={fixture.team2}
                            className={fixtureHasTeam2 ? "wizard-input" : "wizard-input invalid"}
                            onChange={(e) => updateFixture(idx, { team2: e.target.value })}
                          >
                            <option value="">— Select team —</option>
                            {teamChoices.map((teamName) => (
                              <option key={`${idx}-team2-${teamName}`} value={teamName}>{teamName}</option>
                            ))}
                          </select>
                        </Field>
                      </>
                    );
                  }
                  return (
                    <>
                      <Field label="Team 1">
                        <input
                          type="text"
                          value={fixture.team1}
                          className={fixtureHasTeam1 ? "wizard-input" : "wizard-input invalid"}
                          onChange={(e) => updateFixture(idx, { team1: e.target.value })}
                          placeholder="Team name"
                        />
                      </Field>
                      <Field label="Team 2">
                        <input
                          type="text"
                          value={fixture.team2}
                          className={fixtureHasTeam2 ? "wizard-input" : "wizard-input invalid"}
                          onChange={(e) => updateFixture(idx, { team2: e.target.value })}
                          placeholder="Team name"
                        />
                      </Field>
                    </>
                  );
                })()}
              </div>
              <button type="button" onClick={() => removeFixture(idx)}>Remove Fixture</button>
            </div>
          );
          })}
        </SectionCard>
        <div className="wizard-step-nav">
          <button type="button" className="wizard-secondary" onClick={() => { setSaveError(""); setStep(1); }}>
            ← Back: Groups &amp; Pools
          </button>
          <button type="button" className="wizard-primary" onClick={() => { setSaveError(""); setStep(3); }}>
            Review →
          </button>
        </div>
        </>
      )}

      {step === 3 && (
        <>
        <div className="wizard-grid">
          <SectionCard title="Review Tournament">
            <div className="wizard-review">
              <div className="wizard-review-row">
                <span className="wizard-review-label">Name</span>
                <span>{tournament.name || <em>—</em>}</span>
              </div>
              <div className="wizard-review-row">
                <span className="wizard-review-label">Season</span>
                <span>{tournament.season || <em>—</em>}</span>
              </div>
              <div className="wizard-review-row">
                <span className="wizard-review-label">ID</span>
                <code>{tournamentIdHint || "—"}</code>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Groups">
            <div className="wizard-review">
              {groups.filter((g) => g.label?.trim()).length === 0 ? (
                <p className="wizard-review-empty">No groups defined.</p>
              ) : (
                groups.filter((g) => g.label?.trim()).map((g) => (
                  <div key={g._key} className="wizard-review-row">
                    <span className="wizard-review-label">{g.label}</span>
                    <span>
                      {g.format || "No format"} &middot; {poolLabels(g.pool_count || 1).length} pool(s)
                      {g.playDate ? ` · ${g.playDate}` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Teams">
            <div className="wizard-review">
              {(() => {
                const real = teams.filter((t) => t.name?.trim() && t.group_id && !t.is_placeholder);
                const byGroup = groupOptions.map((g) => ({
                  ...g,
                  teams: real.filter((t) => t.group_id === g.id),
                }));
                return byGroup.map((g) => (
                  <div key={g.id} className="wizard-review-row">
                    <span className="wizard-review-label">{g.label}</span>
                    <span>{g.teams.length === 0 ? <em>No teams</em> : g.teams.map((t) => t.name).join(", ")}</span>
                  </div>
                ));
              })()}
            </div>
          </SectionCard>

          <SectionCard title="Fixtures">
            <div className="wizard-review">
              {(() => {
                const real = fixtures.filter((f) => f.team1?.trim() && f.team2?.trim() && f.group_id);
                if (real.length === 0) return <p className="wizard-review-empty">No fixtures generated.</p>;
                const byGroup = groupOptions.map((g) => ({
                  ...g,
                  count: real.filter((f) => f.group_id === g.id).length,
                  dates: [...new Set(real.filter((f) => f.group_id === g.id).map((f) => f.date))].sort((a, b) => a.localeCompare(b)),
                }));
                return byGroup.filter((g) => g.count > 0).map((g) => (
                  <div key={g.id} className="wizard-review-row">
                    <span className="wizard-review-label">{g.label}</span>
                    <span>{g.count} fixture{g.count !== 1 ? "s" : ""}{g.dates.length ? ` · ${g.dates.join(", ")}` : ""}</span>
                  </div>
                ));
              })()}
            </div>
          </SectionCard>

          {formErrors.length > 0 && (
            <div className="wizard-alert error">
              <strong>Issues to fix before submitting:</strong>
              {formErrors.map((msg) => (
                <div key={msg}>{msg}</div>
              ))}
            </div>
          )}
        </div>

        <div className="wizard-step-nav">
          <button type="button" className="wizard-secondary" onClick={() => { setSaveError(""); setStep(2); }}>
            ← Back: Teams &amp; Fixtures
          </button>
          <button
            type="button"
            className="wizard-primary"
            onClick={handleSubmit}
            disabled={saving || formErrors.length > 0}
          >
            {saving ? "Saving..." : "Confirm & Create"}
          </button>
        </div>
        </>
      )}
    </div>
  );
}
