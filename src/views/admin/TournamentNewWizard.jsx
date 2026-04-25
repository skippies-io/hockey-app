import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./tournamentNewWizard.css";

import { adminFetch } from "../../lib/adminAuth";

import {
  FRANCHISE_COLOUR_ROTATION,
  FRANCHISE_DIRECTORY,
  TEAM_DIRECTORY,
  getAutoFormat,
  normaliseId,
} from "./TournamentNewWizard.utils";

const STEPS = [
  "Tournament Details",
  "Franchises",
  "Teams & Pools",
  "Rules",
  "Fixtures",
];



const franchiseShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  colour: PropTypes.string.isRequired,
});

function roundRobinPairs(teamIds) {
  const n = teamIds.length;
  if (n < 2) return [];

  const isOdd = n % 2 === 1;
  const ids = isOdd ? [...teamIds, "BYE"] : [...teamIds];
  const m = ids.length;
  const half = m / 2;

  let arr = [...ids];
  const rounds = m - 1;
  const all = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[m - 1 - i];
      if (a === "BYE" || b === "BYE") continue;
      all.push([a, b, r + 1]);
    }

    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }

  return all;
}

/**
 * Collect all team names for a division from the new entries data model.
 * Returns [{ name, franchiseId }] for teams in opted-in franchises.
 */
function getTeamsForDivision(entries, divKey) {
  const result = [];
  const divEntries = entries[divKey] ?? {};
  for (const [franchiseId, entry] of Object.entries(divEntries)) {
    if (entry.optedIn) {
      for (const slot of entry.slots) {
        if (slot.name.trim()) result.push({ name: slot.name.trim(), franchiseId });
      }
    }
  }
  return result;
}

/**
 * Build round-robin fixtures for Step 5 from the new data model.
 * Skips same-franchise pairings and returns the count of skipped pairs.
 */
function buildFixturesForStep5({ activeDivisions, step3Entries, step4 }) {
  const allFixtures = [];
  let skippedSameFranchise = 0;

  for (const divKey of activeDivisions) {
    const teams = getTeamsForDivision(step3Entries, divKey);
    if (teams.length < 2) continue;

    const format = step4.formats[divKey] || getAutoFormat(teams.length);
    const poolsA = step4.poolsA?.[divKey] ?? [];
    const poolsB = step4.poolsB?.[divKey] ?? [];

    const isGS = format === "gs_ko" && (poolsA.length >= 2 || poolsB.length >= 2);

    let groups;
    if (isGS) {
      groups = [
        { pool: "A", names: poolsA },
        { pool: "B", names: poolsB },
      ].filter((g) => g.names.length >= 2);
      if (groups.length === 0) groups = [{ pool: null, names: teams.map((t) => t.name) }];
    } else {
      groups = [{ pool: null, names: teams.map((t) => t.name) }];
    }

    const repeats = format === "rr1" ? 2 : 1;

    for (const { pool, names } of groups) {
      const pairings = roundRobinPairs(names);
      for (let rep = 0; rep < repeats; rep++) {
        for (const [a, b, roundNum] of pairings) {
          const teamA = teams.find((t) => t.name === a);
          const teamB = teams.find((t) => t.name === b);
          if (teamA && teamB && teamA.franchiseId === teamB.franchiseId) {
            skippedSameFranchise++;
            continue;
          }
          allFixtures.push({
            group_id: normaliseId(divKey),
            date: "",
            time: "",
            venue: "",
            pool: pool ?? null,
            team1: a,
            team2: b,
            round: `Round ${roundNum}`,
            slotDay: null,
          });
        }
      }
    }
  }

  return { fixtures: allFixtures, skippedSameFranchise };
}

let _slotCounter = 0;
function newSlotId() {
  return `slot-${++_slotCounter}`;
}

/** Get used names for a franchise in a division (excludes a specific slot id). */
function getUsedNames(entries, divKey, franchiseId, excludeSlotId = null) {
  const entry = entries[divKey]?.[franchiseId];
  if (!entry) return new Set();
  return new Set(
    entry.slots
      .filter((s) => s.id !== excludeSlotId && !s.custom && s.name)
      .map((s) => s.name)
  );
}

/** Pick the next unused name from TEAM_DIRECTORY for a franchise+division entry. */
function nextUnusedName(entries, divKey, franchiseId) {
  const names = TEAM_DIRECTORY[franchiseId] ?? [];
  const used = getUsedNames(entries, divKey, franchiseId);
  return names.find((n) => !used.has(n)) ?? null;
}

function Step3Teams({ activeDivisions, selectedFranchises, value, onChange, onValidityChange, onNext, onBack }) {
  const getEntry = (divKey, fId) =>
    value.entries?.[divKey]?.[fId] ?? { optedIn: false, slots: [] };

  const updateEntry = (divKey, fId, updater) => {
    const current = getEntry(divKey, fId);
    const next = updater(current);
    onChange({
      ...value,
      entries: {
        ...value.entries,
        [divKey]: { ...(value.entries[divKey] ?? {}), [fId]: next },
      },
    });
  };

  // Team count per division (for summary chips + bye detection)
  const teamsPerDiv = activeDivisions.map((divKey) => {
    let count = 0;
    for (const f of selectedFranchises) {
      const e = getEntry(divKey, f.id);
      if (e.optedIn) count += e.slots.filter((s) => s.name.trim()).length;
    }
    return { divKey, count };
  });

  const isValid = teamsPerDiv.some((d) => d.count >= 2);

  React.useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const toggleOptIn = (divKey, franchise) => {
    const entry = getEntry(divKey, franchise.id);
    if (entry.optedIn) {
      updateEntry(divKey, franchise.id, () => ({ optedIn: false, slots: [] }));
    } else {
      const firstName = nextUnusedName(value.entries, divKey, franchise.id);
      const slot = firstName
        ? { id: newSlotId(), name: firstName, custom: false, isEditing: false }
        : { id: newSlotId(), name: "", custom: true, isEditing: true };
      updateEntry(divKey, franchise.id, () => ({ optedIn: true, slots: [slot] }));
    }
  };

  const addSlot = (divKey, franchise) => {
    updateEntry(divKey, franchise.id, (entry) => {
      const nextName = nextUnusedName(
        { ...value.entries, [divKey]: { ...(value.entries[divKey] ?? {}), [franchise.id]: entry } },
        divKey,
        franchise.id
      );
      const slot = nextName
        ? { id: newSlotId(), name: nextName, custom: false, isEditing: false }
        : { id: newSlotId(), name: "", custom: true, isEditing: true };
      return { ...entry, slots: [...entry.slots, slot] };
    });
  };

  const removeSlot = (divKey, franchise, slotId) => {
    updateEntry(divKey, franchise.id, (entry) => {
      const slots = entry.slots.filter((s) => s.id !== slotId);
      if (slots.length === 0) return { optedIn: false, slots: [] };
      return { ...entry, slots };
    });
  };

  const changeSlotName = (divKey, franchise, slotId, name) => {
    updateEntry(divKey, franchise.id, (entry) => ({
      ...entry,
      slots: entry.slots.map((s) => (s.id === slotId ? { ...s, name } : s)),
    }));
  };

  const setSlotEditing = (divKey, franchise, slotId, isEditing) => {
    updateEntry(divKey, franchise.id, (entry) => ({
      ...entry,
      slots: entry.slots.map((s) =>
        s.id === slotId ? { ...s, isEditing, custom: isEditing ? true : s.custom } : s
      ),
    }));
  };

  const revertSlot = (divKey, franchise, slotId) => {
    updateEntry(divKey, franchise.id, (entry) => {
      const used = getUsedNames(value.entries, divKey, franchise.id, slotId);
      const names = TEAM_DIRECTORY[franchise.id] ?? [];
      const firstName = names.find((n) => !used.has(n));
      return {
        ...entry,
        slots: entry.slots.map((s) =>
          s.id === slotId
            ? { ...s, name: firstName ?? s.name, custom: false, isEditing: false }
            : s
        ),
      };
    });
  };

  return (
    <section className="hj-tw2-main" aria-label="Step 3 Teams">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step 3 of 5, Teams</div>
      </header>

      {/* Division summary chips */}
      <div className="hj-tw2-div-chips" aria-label="Division team counts">
        {teamsPerDiv.map(({ divKey, count }) => {
          const isBye = count > 0 && count % 2 === 1;
          return (
            <span key={divKey} className="hj-tw2-div-chip">
              {divKey}
              <span className="hj-tw2-div-chip-badge">{count}</span>
              {isBye ? (
                <span className="hj-tw2-bye-notice" aria-label="Bye auto-added">Bye auto-added</span>
              ) : null}
            </span>
          );
        })}
      </div>

      {/* One card per franchise */}
      {selectedFranchises.map((franchise) => (
        <div
          key={franchise.id}
          className="hj-tw2-card hj-tw2-fr-card-teams"
          style={{ "--accent": franchise.colour }}
        >
          <div className="hj-tw2-card-title hj-tw2-card-title--accented">
            {franchise.name}
          </div>

          <div className="hj-tw2-div-tiles">
            {activeDivisions.map((divKey) => {
              const entry = getEntry(divKey, franchise.id);
              const isOptedIn = entry.optedIn;

              return (
                <div
                  key={divKey}
                  className={`hj-tw2-div-tile ${isOptedIn ? "is-opted-in" : ""}`}
                >
                  {/* Tile header — click to toggle */}
                  <button
                    type="button"
                    className="hj-tw2-div-tile-header"
                    onClick={() => toggleOptIn(divKey, franchise)}
                    aria-pressed={isOptedIn}
                  >
                    <span className="hj-tw2-div-tile-name">{divKey}</span>
                    <span
                      className={`hj-tw2-div-tile-badge ${isOptedIn ? "is-opted-in" : ""}`}
                      aria-hidden="true"
                    >
                      {isOptedIn ? "✓" : "+"}
                    </span>
                  </button>

                  {/* Slot list — shown when opted in */}
                  {isOptedIn ? (
                    <div className="hj-tw2-div-tile-body">
                      {entry.slots.map((slot) => {
                        const used = getUsedNames(value.entries, divKey, franchise.id, slot.id);
                        const available = (TEAM_DIRECTORY[franchise.id] ?? []).filter(
                          (n) => !used.has(n)
                        );

                        return (
                          <div key={slot.id} className="hj-tw2-slot">
                            {slot.isEditing ? (
                              <>
                                <input
                                  className="hj-tw2-input hj-tw2-slot-input--custom"
                                  aria-label={`Custom team name for ${divKey}`}
                                  value={slot.name}
                                  placeholder="Team name"
                                  onChange={(e) =>
                                    changeSlotName(divKey, franchise, slot.id, e.target.value)
                                  }
                                />
                                {(TEAM_DIRECTORY[franchise.id] ?? []).length > 0 ? (
                                  <button
                                    type="button"
                                    className="hj-tw2-slot-revert"
                                    aria-label="Revert to directory name"
                                    onClick={() => revertSlot(divKey, franchise, slot.id)}
                                  >
                                    ↩
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <select
                                className="hj-tw2-input hj-tw2-select hj-tw2-slot-select"
                                aria-label={`Team name for ${divKey}`}
                                value={slot.name}
                                onChange={(e) => {
                                  if (e.target.value === "__new__") {
                                    setSlotEditing(divKey, franchise, slot.id, true);
                                  } else {
                                    changeSlotName(divKey, franchise, slot.id, e.target.value);
                                  }
                                }}
                              >
                                {slot.name ? (
                                  <option value={slot.name}>{slot.name}</option>
                                ) : null}
                                {available
                                  .filter((n) => n !== slot.name)
                                  .map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                <option value="__new__">＋ New name…</option>
                              </select>
                            )}
                            <button
                              type="button"
                              className="hj-tw2-slot-remove"
                              aria-label={`Remove team slot for ${divKey}`}
                              onClick={() => removeSlot(divKey, franchise, slot.id)}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        className="hj-tw2-slot-add"
                        onClick={() => addSlot(divKey, franchise)}
                      >
                        + Add team
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!isValid ? (
        <div className="hj-tw2-error" role="alert">
          At least one division needs 2 or more teams to continue.
        </div>
      ) : null}

      <div className="hj-tw2-footer">
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--ghost"
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          disabled={!isValid}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </section>
  );
}

Step3Teams.propTypes = {
  activeDivisions: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedFranchises: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      colour: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.shape({
    entries: PropTypes.object.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onValidityChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

function Step4Rules({ activeDivisions, step3Entries, value, onChange, onValidityChange, onNext, onBack }) {
  // Derive teams per division from step3 entries
  const divTeams = useMemo(() => {
    const map = {};
    for (const divKey of activeDivisions) {
      map[divKey] = getTeamsForDivision(step3Entries, divKey);
    }
    return map;
  }, [activeDivisions, step3Entries]);

  // Only show divisions that have at least one team
  const activeDivs = activeDivisions.filter((d) => (divTeams[d] ?? []).length >= 1);

  React.useEffect(() => {
    onValidityChange(true); // Step 4 has no blocking validation
  }, [onValidityChange]);

  const getFormat = (divKey) => {
    return value.formats[divKey] || getAutoFormat((divTeams[divKey] ?? []).length);
  };

  const isAutoSuggested = (divKey) => !value.overridden[divKey];

  const setFormat = (divKey, fmt) => {
    onChange({
      ...value,
      formats: { ...value.formats, [divKey]: fmt },
      overridden: { ...value.overridden, [divKey]: true },
    });
  };

  const moveToPool = (divKey, teamName, pool) => {
    const curA = value.poolsA[divKey] ?? [];
    const curB = value.poolsB[divKey] ?? [];
    let nextA = curA.filter((n) => n !== teamName);
    let nextB = curB.filter((n) => n !== teamName);
    if (pool === "A") nextA = [...nextA, teamName];
    if (pool === "B") nextB = [...nextB, teamName];
    onChange({
      ...value,
      poolsA: { ...value.poolsA, [divKey]: nextA },
      poolsB: { ...value.poolsB, [divKey]: nextB },
    });
  };

  const FORMAT_OPTIONS = [
    { value: "rr2", label: "Round Robin x1" },
    { value: "rr1", label: "Round Robin x2" },
    { value: "gs_ko", label: "Group Stage + KO" },
    { value: "ko", label: "Knockout Only" },
  ];

  return (
    <section className="hj-tw2-main" aria-label="Step 4 Division Rules">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step 4 of 5, Division Rules</div>
      </header>

      {activeDivs.map((divKey) => {
        const teams = divTeams[divKey] ?? [];
        const fmt = getFormat(divKey);
        const isAuto = isAutoSuggested(divKey);
        const isGS = fmt === "gs_ko";

        const poolsA = value.poolsA[divKey] ?? [];
        const poolsB = value.poolsB[divKey] ?? [];
        const unassigned = teams.map((t) => t.name).filter(
          (n) => !poolsA.includes(n) && !poolsB.includes(n)
        );

        return (
          <div key={divKey} className="hj-tw2-card">
            <div className="hj-tw2-card-title">
              {divKey}
              {isAuto ? (
                <span className="hj-tw2-autosuggested" style={{ marginLeft: 10 }}>
                  AUTO-SUGGESTED
                </span>
              ) : null}
            </div>

            <div style={{ padding: "8px 20px 0", color: "#64748b", fontSize: 13 }}>
              {teams.length} team{teams.length !== 1 ? "s" : ""}
            </div>

            <div
              className="hj-tw2-rule-options"
              role="radiogroup"
              aria-label={`${divKey} format`}
              style={{ padding: "12px 20px" }}
            >
              {FORMAT_OPTIONS.map((opt) => {
                const isSel = fmt === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`hj-tw2-opt ${isSel ? "is-selected" : ""}`}
                    onClick={() => setFormat(divKey, opt.value)}
                    aria-pressed={isSel}
                  >
                    <span
                      className={`hj-tw2-opt-radio ${isSel ? "is-checked" : ""}`}
                      aria-hidden="true"
                    />
                    <span className="hj-tw2-opt-label">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Pool assignment — only shown for Group Stage */}
            {isGS ? (
              <div className="hj-tw2-pool-assignment" aria-label={`${divKey} pool assignment`}>
                <div className="hj-tw2-pool-col hj-tw2-pool-col--a">
                  <div className="hj-tw2-pool-col-title">Pool A</div>
                  {poolsA.map((name) => (
                    <div key={name} className="hj-tw2-pool-team-row">
                      <span className="hj-tw2-pool-team-name">{name}</span>
                      <button
                        type="button"
                        className="hj-tw2-pool-arrow"
                        aria-label={`Move ${name} to Pool B`}
                        onClick={() => moveToPool(divKey, name, "B")}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        className="hj-tw2-pool-arrow hj-tw2-pool-arrow--unassign"
                        aria-label={`Unassign ${name}`}
                        onClick={() => moveToPool(divKey, name, null)}
                      >
                        ↩
                      </button>
                    </div>
                  ))}
                </div>

                <div className="hj-tw2-pool-col hj-tw2-pool-col--b">
                  <div className="hj-tw2-pool-col-title">Pool B</div>
                  {poolsB.map((name) => (
                    <div key={name} className="hj-tw2-pool-team-row">
                      <button
                        type="button"
                        className="hj-tw2-pool-arrow"
                        aria-label={`Move ${name} to Pool A`}
                        onClick={() => moveToPool(divKey, name, "A")}
                      >
                        ←
                      </button>
                      <span className="hj-tw2-pool-team-name">{name}</span>
                      <button
                        type="button"
                        className="hj-tw2-pool-arrow hj-tw2-pool-arrow--unassign"
                        aria-label={`Unassign ${name}`}
                        onClick={() => moveToPool(divKey, name, null)}
                      >
                        ↩
                      </button>
                    </div>
                  ))}
                </div>

                <div className="hj-tw2-pool-col hj-tw2-pool-col--unassigned">
                  <div className="hj-tw2-pool-col-title">Unassigned</div>
                  {unassigned.map((name) => (
                    <div key={name} className="hj-tw2-pool-team-row">
                      <span className="hj-tw2-pool-team-name">{name}</span>
                      <button
                        type="button"
                        className="hj-tw2-pool-arrow"
                        aria-label={`Move ${name} to Pool A`}
                        onClick={() => moveToPool(divKey, name, "A")}
                      >
                        → A
                      </button>
                      <button
                        type="button"
                        className="hj-tw2-pool-arrow"
                        aria-label={`Move ${name} to Pool B`}
                        onClick={() => moveToPool(divKey, name, "B")}
                      >
                        → B
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="hj-tw2-footer">
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--ghost"
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </section>
  );
}

Step4Rules.propTypes = {
  activeDivisions: PropTypes.arrayOf(PropTypes.string).isRequired,
  step3Entries: PropTypes.object.isRequired,
  value: PropTypes.shape({
    formats: PropTypes.object.isRequired,
    overridden: PropTypes.object.isRequired,
    poolsA: PropTypes.object.isRequired,
    poolsB: PropTypes.object.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onValidityChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

function Step2Franchises({ value, onChange, onValidityChange, onNext }) {
  const filtered = useMemo(() => {
    const q = value.query.trim().toLowerCase();
    if (!q) return value.directory;
    return value.directory.filter((f) => f.name.toLowerCase().includes(q));
  }, [value.directory, value.query]);

  const selectedCount = value.selectedIds.length;
  const isValid = selectedCount >= 2;

  React.useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const toggle = (id) => {
    const has = value.selectedIds.includes(id);
    onChange({
      ...value,
      selectedIds: has ? value.selectedIds.filter((x) => x !== id) : [...value.selectedIds, id],
    });
  };

  const nextColour = () => {
    const used = new Set(value.directory.map((f) => f.colour));
    for (const c of FRANCHISE_COLOUR_ROTATION) {
      if (!used.has(c)) return c;
    }
    return FRANCHISE_COLOUR_ROTATION[value.directory.length % FRANCHISE_COLOUR_ROTATION.length];
  };

  const addFranchise = () => {
    const name = value.draftName.trim();
    if (!name) return;
    if (value.directory.some((f) => f.name.toLowerCase() === name.toLowerCase())) return;

    const idBase = normaliseId(name) || "franchise";
    let id = `f-${idBase}`;
    let i = 2;
    while (value.directory.some((f) => f.id === id)) {
      id = `f-${idBase}-${i++}`;
    }

    const entry = { id, name, colour: nextColour() };
    onChange({
      ...value,
      directory: [...value.directory, entry],
      selectedIds: [...value.selectedIds, entry.id],
      draftName: "",
    });
  };

  const selected = value.selectedIds
    .map((id) => value.directory.find((f) => f.id === id))
    .filter(Boolean);

  return (
    <section className="hj-tw2-main" aria-label="Step 2 Franchises">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step 2 of 5, Franchises</div>
      </header>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Franchises</div>

        <label className="hj-tw2-field">
          <div className="hj-tw2-label">Search</div>
          <input
            className="hj-tw2-input"
            aria-label="Search franchises"
            placeholder="Search"
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
          />
        </label>

        <div className="hj-tw2-fr-grid" role="list" aria-label="Franchise directory">
          {filtered.map((f) => {
            const isSelected = value.selectedIds.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                role="listitem"
                className={`hj-tw2-fr-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => toggle(f.id)}
                aria-pressed={isSelected}
              >
                <span className="hj-tw2-fr-swatch" style={{ background: f.colour }} aria-hidden="true" />
                <span className="hj-tw2-fr-name">{f.name}</span>
              </button>
            );
          })}
        </div>

        <div className="hj-tw2-add">
          <input
            className="hj-tw2-input"
            aria-label="Add franchise"
            placeholder="Add franchise"
            value={value.draftName}
            onChange={(e) => onChange({ ...value, draftName: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFranchise();
              }
            }}
          />
          <button type="button" className="hj-tw2-btn hj-tw2-btn--ghost" onClick={addFranchise}>
            Add
          </button>
        </div>

        {!isValid ? <div className="hj-tw2-error">Select at least two franchises</div> : null}
      </div>

      <div className="hj-tw2-summarybar" role="status" aria-label="Franchises selected summary">
        <div className="hj-tw2-summarybar-left">
          <div className="hj-tw2-summarybar-count">{selectedCount} selected</div>
          <div className="hj-tw2-summarybar-chips" aria-label="Selected franchises">
            {selected.map((f) => (
              <span key={f.id} className="hj-tw2-chip" style={{ borderColor: f.colour }}>
                <span className="hj-tw2-chip-dot" style={{ background: f.colour }} aria-hidden="true" />
                {f.name}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          onClick={onNext}
          disabled={!isValid}
        >
          Save & Continue
        </button>
      </div>
    </section>
  );
}

Step2Franchises.propTypes = {
  value: PropTypes.shape({
    directory: PropTypes.arrayOf(franchiseShape).isRequired,
    selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    query: PropTypes.string.isRequired,
    draftName: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onValidityChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
};

function TopStepper({ step, maxStep, onStepChange }) {
  return (
    <nav className="hj-tw2-topstep" aria-label="Tournament wizard progress">
      <div className="hj-tw2-topstep-inner">
        {STEPS.map((label, idx) => {
          const state = idx === step ? "current" : idx < step ? "done" : "todo";
          const isLocked = idx > maxStep;
          return (
            <button
              key={label}
              type="button"
              className={`hj-tw2-topstep-item hj-tw2-topstep-item--${state} ${isLocked ? "is-locked" : ""}`}
              onClick={() => {
                if (isLocked) return;
                onStepChange(idx);
              }}
              aria-current={idx === step ? "step" : undefined}
              aria-disabled={isLocked}
              disabled={isLocked}
            >
              <div className="hj-tw2-topstep-node" aria-hidden="true">
                {idx < step ? "✓" : idx + 1}
              </div>
              <div className="hj-tw2-topstep-label">{label}</div>
              {idx < STEPS.length - 1 ? <div className="hj-tw2-topstep-rail" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

TopStepper.propTypes = {
  step: PropTypes.number.isRequired,
  maxStep: PropTypes.number.isRequired,
  onStepChange: PropTypes.func.isRequired,
};

function SummarySidebar({ tournamentName, venuesCount, divisionsCount }) {
  return (
    <aside className="hj-tw2-sidebar" aria-label="Tournament summary">
      <div className="hj-tw2-sidebar-card">
        <div className="hj-tw2-sidebar-title">Summary</div>
        <dl className="hj-tw2-sidebar-dl">
          <div>
            <dt>Tournament</dt>
            <dd>{tournamentName || "—"}</dd>
          </div>
          <div>
            <dt>Venues</dt>
            <dd>{venuesCount}</dd>
          </div>
          <div>
            <dt>Divisions</dt>
            <dd>{divisionsCount}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

SummarySidebar.propTypes = {
  tournamentName: PropTypes.string.isRequired,
  venuesCount: PropTypes.number.isRequired,
  divisionsCount: PropTypes.number.isRequired,
};

function Step1({ value, onChange, onValidityChange }) {
  const errors = useMemo(() => {
    const next = {};
    if (!value.name.trim()) next.name = "Tournament name is required";
    if (!value.startDate) next.startDate = "Start date is required";
    if (!value.endDate) next.endDate = "End date is required";
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      next.endDate = "End date must be on or after start date";
    }
    if (!value.selectedVenues.length) next.venues = "Select at least one venue";
    if (!value.activeDivisions.length) next.divisions = "Select at least one division";
    return next;
  }, [value]);

  const isValid = Object.keys(errors).length === 0;

  React.useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  React.useEffect(() => {
    if (!isValid) return;
    if (!value._continue) return;
    onValidityChange(true);
  }, [isValid, onValidityChange, value._continue]);

  const addVenue = () => {
    const name = value.customVenueDraft.trim();
    if (!name) return;
    if (value.venueDirectory.some((v) => v.toLowerCase() === name.toLowerCase())) return;
    onChange({
      ...value,
      venueDirectory: [...value.venueDirectory, name],
      selectedVenues: [...value.selectedVenues, name],
      customVenueDraft: "",
    });
  };

  const toggleVenue = (v) => {
    const has = value.selectedVenues.includes(v);
    const selectedVenues = has
      ? value.selectedVenues.filter((x) => x !== v)
      : [...value.selectedVenues, v];
    onChange({ ...value, selectedVenues });
  };

  const removeSelectedVenue = (v) => {
    onChange({ ...value, selectedVenues: value.selectedVenues.filter((x) => x !== v) });
  };

  const toggleDivisionCell = (age, key) => {
    const current = value.divisionTable[age] || { boys: false, girls: false, mixed: false, custom: false };
    let next = { ...current, [key]: !current[key] };

    if (key === "mixed" && next.mixed) {
      next = { ...next, boys: false, girls: false };
    }
    if ((key === "boys" || key === "girls") && next[key]) {
      next = { ...next, mixed: false };
    }

    const divisionTable = { ...value.divisionTable, [age]: next };
    onChange({ ...value, divisionTable });
  };

  const addAgeGroup = () => {
    const raw = value.customAgeGroupDraft.trim();
    if (!raw) return;
    const age = raw.toUpperCase();
    if (value.ageGroups.includes(age)) return;

    onChange({
      ...value,
      ageGroups: [...value.ageGroups, age],
      divisionTable: {
        ...value.divisionTable,
        [age]: { boys: false, girls: false, mixed: false, custom: true },
      },
      customAgeGroupDraft: "",
    });
  };

  const totalMinPerGame =
    Number(value.chakasPerGame || 0) * Number(value.chakaMinutes || 0) +
    Number(value.halftimeMinutes || 0) +
    Number(value.changeoverMinutes || 0);

  return (
    <section className="hj-tw2-main" aria-label="Step 1 Tournament Details">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step 1 of 5, Tournament Details</div>
      </header>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Tournament Details</div>

        <label className="hj-tw2-field">
          <div className="hj-tw2-label">Name</div>
          <input
            className="hj-tw2-input"
            aria-label="Name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="e.g. HJ Intercity"
          />
          {errors.name ? <div className="hj-tw2-error">{errors.name}</div> : null}
        </label>

        <label className="hj-tw2-field">
          <div className="hj-tw2-label">Season</div>
          <select
            className="hj-tw2-input hj-tw2-select"
            aria-label="Season"
            value={value.season}
            onChange={(e) => onChange({ ...value, season: e.target.value })}
          >
            {value.seasonOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <div className="hj-tw2-date-group" role="group" aria-label="Start and end date">
          <div className="hj-tw2-date-cell">
            <div className="hj-tw2-date-label">START DATE</div>
            <input
              className="hj-tw2-date-input"
              type="date"
              aria-label="Start date"
              value={value.startDate}
              onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            />
            {errors.startDate ? <div className="hj-tw2-error">{errors.startDate}</div> : null}
          </div>
          <div className="hj-tw2-date-cell">
            <div className="hj-tw2-date-label">END DATE</div>
            <input
              className="hj-tw2-date-input"
              type="date"
              aria-label="End date"
              value={value.endDate}
              onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            />
            {errors.endDate ? <div className="hj-tw2-error">{errors.endDate}</div> : null}
          </div>
        </div>
      </div>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Venues</div>
        <div className="hj-tw2-pills" role="group" aria-label="Venue directory">
          {value.venueDirectory.map((v) => {
            const selected = value.selectedVenues.includes(v);
            return (
              <button
                key={v}
                type="button"
                className={`hj-tw2-pill ${selected ? "is-selected" : ""}`}
                onClick={() => toggleVenue(v)}
                aria-pressed={selected}
              >
                {v}
              </button>
            );
          })}
        </div>

        <div className="hj-tw2-row" aria-label="Selected venues">
          {value.selectedVenues.map((v) => (
            <button
              key={v}
              type="button"
              className="hj-tw2-chip hj-tw2-chip--green"
              onClick={() => removeSelectedVenue(v)}
              aria-label={`Remove selected venue ${v}`}
            >
              {v}
              <span className="hj-tw2-pill-x">×</span>
            </button>
          ))}
        </div>

        <div className="hj-tw2-add">
          <input
            className="hj-tw2-input"
            aria-label="Add custom venue"
            value={value.customVenueDraft}
            onChange={(e) => onChange({ ...value, customVenueDraft: e.target.value })}
            placeholder="Add venue"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVenue();
              }
            }}
          />
          <button type="button" className="hj-tw2-btn hj-tw2-btn--ghost" onClick={addVenue}>
            Add
          </button>
        </div>
        {errors.venues ? <div className="hj-tw2-error">{errors.venues}</div> : null}
      </div>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Divisions</div>
        <div className="hj-tw2-div-table" role="table" aria-label="Divisions table">
          <div className="hj-tw2-div-head" role="row">
            <div role="columnheader">Age Group</div>
            <div role="columnheader">Boys</div>
            <div role="columnheader">Girls</div>
            <div role="columnheader">Mixed</div>
          </div>
          {value.ageGroups.map((age, idx) => {
            const row = value.divisionTable[age] || { boys: false, girls: false, mixed: false, custom: false };
            const zebra = idx % 2 === 0 ? "is-even" : "is-odd";
            return (
              <div key={age} className={`hj-tw2-div-row ${zebra}`} role="row">
                <div role="cell" className="hj-tw2-div-age">
                  <span>{age}</span>
                  {row.custom ? <span className="hj-tw2-badge hj-tw2-badge--custom">CUSTOM</span> : null}
                </div>
                <div role="cell" className="hj-tw2-div-cell">
                  <input
                    type="checkbox"
                    aria-label={`${age} Boys`}
                    checked={!!row.boys}
                    onChange={() => toggleDivisionCell(age, "boys")}
                  />
                </div>
                <div role="cell" className="hj-tw2-div-cell">
                  <input
                    type="checkbox"
                    aria-label={`${age} Girls`}
                    checked={!!row.girls}
                    onChange={() => toggleDivisionCell(age, "girls")}
                  />
                </div>
                <div role="cell" className="hj-tw2-div-cell">
                  <input
                    type="checkbox"
                    aria-label={`${age} Mixed`}
                    checked={!!row.mixed}
                    onChange={() => toggleDivisionCell(age, "mixed")}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="hj-tw2-add hj-tw2-add--age">
          <input
            className="hj-tw2-input"
            aria-label="Add age group"
            value={value.customAgeGroupDraft}
            onChange={(e) => onChange({ ...value, customAgeGroupDraft: e.target.value })}
            placeholder="Add age group"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAgeGroup();
              }
            }}
          />
          <button type="button" className="hj-tw2-btn hj-tw2-btn--ghost" onClick={addAgeGroup}>
            Add
          </button>
        </div>
        {errors.divisions ? (
          <div className="hj-tw2-error">{errors.divisions}</div>
        ) : null}
      </div>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Game Timing</div>
        <div className="hj-tw2-grid4">
          <label className="hj-tw2-field">
            <div className="hj-tw2-label hj-tw2-label--baseline">Chakas/Game</div>
            <input
              className="hj-tw2-input"
              inputMode="numeric"
              type="number"
              aria-label="Chakas per game"
              value={value.chakasPerGame}
              onChange={(e) => onChange({ ...value, chakasPerGame: e.target.value })}
            />
          </label>
          <label className="hj-tw2-field">
            <div className="hj-tw2-label hj-tw2-label--baseline">Duration (min)</div>
            <input
              className="hj-tw2-input"
              inputMode="numeric"
              type="number"
              aria-label="Chaka minutes"
              value={value.chakaMinutes}
              onChange={(e) => onChange({ ...value, chakaMinutes: e.target.value })}
            />
          </label>
          <label className="hj-tw2-field">
            <div className="hj-tw2-label hj-tw2-label--baseline">Half-time (min)</div>
            <input
              className="hj-tw2-input"
              inputMode="numeric"
              type="number"
              aria-label="Halftime minutes"
              value={value.halftimeMinutes}
              onChange={(e) => onChange({ ...value, halftimeMinutes: e.target.value })}
            />
          </label>
          <label className="hj-tw2-field">
            <div className="hj-tw2-label hj-tw2-label--baseline">Changeover (min)</div>
            <input
              className="hj-tw2-input"
              inputMode="numeric"
              type="number"
              aria-label="Changeover minutes"
              value={value.changeoverMinutes}
              onChange={(e) => onChange({ ...value, changeoverMinutes: e.target.value })}
            />
          </label>
        </div>

        <div className="hj-tw2-banner" aria-label="Game duration formula">
          {Number(value.chakasPerGame || 0)} x {Number(value.chakaMinutes || 0)}min + {Number(value.halftimeMinutes || 0)}min half-time + {Number(value.changeoverMinutes || 0)}min changeover = {totalMinPerGame} min/game
        </div>
      </div>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Points System</div>
        <div className="hj-tw2-points">
          {[
            { key: "win", label: "WIN", theme: "win" },
            { key: "draw", label: "DRAW", theme: "draw" },
            { key: "loss", label: "LOSS", theme: "loss" },
          ].map((t) => (
            <div key={t.key} className={`hj-tw2-points-tile hj-tw2-points-tile--${t.theme}`}>
              <div className="hj-tw2-points-label">{t.label}</div>
              <div className="hj-tw2-points-row">
                <button
                  type="button"
                  className="hj-tw2-stepper-btn"
                  aria-label={`${t.label} minus`}
                  onClick={() =>
                    onChange({
                      ...value,
                      points: {
                        ...value.points,
                        [t.key]: Math.max(0, Number(value.points[t.key] || 0) - 1),
                      },
                    })
                  }
                >
                  −
                </button>
                <input
                  className="hj-tw2-points-input"
                  type="number"
                  inputMode="numeric"
                  aria-label={`${t.label} points`}
                  value={value.points[t.key]}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      points: {
                        ...value.points,
                        [t.key]: Number(e.target.value || 0),
                      },
                    })
                  }
                />
                <button
                  type="button"
                  className="hj-tw2-stepper-btn"
                  aria-label={`${t.label} plus`}
                  onClick={() =>
                    onChange({
                      ...value,
                      points: {
                        ...value.points,
                        [t.key]: Number(value.points[t.key] || 0) + 1,
                      },
                    })
                  }
                >
                  +
                </button>
              </div>
              <div className="hj-tw2-points-pts">pts</div>
            </div>
          ))}
        </div>
      </div>

      <div className="hj-tw2-footer">
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          disabled={!isValid}
          onClick={() => {
            if (!isValid) return;
            onChange({ ...value, _continue: (value._continue || 0) + 1 });
          }}
        >
          Next
        </button>
      </div>
    </section>
  );
}

Step1.propTypes = {
  value: PropTypes.shape({
    name: PropTypes.string.isRequired,
    season: PropTypes.string.isRequired,
    seasonOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    venueDirectory: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      })
    ).isRequired,
    selectedVenues: PropTypes.arrayOf(PropTypes.string).isRequired,
    customVenueDraft: PropTypes.string.isRequired,
    divisionTable: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        ageGroup: PropTypes.string.isRequired,
        isCustom: PropTypes.bool,
        boys: PropTypes.bool.isRequired,
        girls: PropTypes.bool.isRequired,
        mixed: PropTypes.bool.isRequired,
      })
    ).isRequired,
    ageGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
    customAgeGroupDraft: PropTypes.string.isRequired,
    chakasPerGame: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    chakaMinutes: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    halftimeMinutes: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    changeoverMinutes: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    points: PropTypes.shape({
      win: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      draw: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      loss: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }).isRequired,
    _continue: PropTypes.bool,
    activeDivisions: PropTypes.array,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onValidityChange: PropTypes.func.isRequired,
};

export default function TournamentNewWizard() {
  const [step, setStep] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const [maxStep, setMaxStep] = useState(0);
  const mainRef = React.useRef(null);

  const [step4, setStep4] = useState({
    formats: {},
    overridden: {},
    poolsA: {},
    poolsB: {},
  });

  const [step5, setStep5] = useState({
    isSubmitting: false,
    submitError: "",
    createdTournamentId: "",
    fixtures: [],
    skippedSameFranchise: 0,
  });

  const [step1, setStep1] = useState({
    _continue: 0,
    name: "",
    season: String(new Date().getFullYear()),
    seasonOptions: [
      new Date().getFullYear() - 2,
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ],
    startDate: "",
    endDate: "",
    venueDirectory: ["Beaulieu College", "St Stithians"],
    selectedVenues: [],
    customVenueDraft: "",
    ageGroups: ["U9", "U11", "U13", "U14", "U16"],
    divisionTable: {
      U9: { boys: false, girls: false, mixed: false, custom: false },
      U11: { boys: false, girls: false, mixed: false, custom: false },
      U13: { boys: false, girls: false, mixed: false, custom: false },
      U14: { boys: false, girls: false, mixed: false, custom: false },
      U16: { boys: false, girls: false, mixed: false, custom: false },
    },
    customAgeGroupDraft: "",
    chakasPerGame: 2,
    chakaMinutes: 20,
    halftimeMinutes: 5,
    changeoverMinutes: 3,
    points: { win: 3, draw: 1, loss: 0 },
  });

  const [step2, setStep2] = useState({
    directory: FRANCHISE_DIRECTORY.map((f) => ({ ...f })),
    selectedIds: [],
    query: "",
    draftName: "",
  });


  const [step3, setStep3] = useState({
    entries: {},
  });

  const activeDivisions = useMemo(() => {
    const next = [];
    for (const age of step1.ageGroups) {
      const row = step1.divisionTable[age];
      if (!row) continue;
      if (row.boys) next.push(`${age} Boys`);
      if (row.girls) next.push(`${age} Girls`);
      if (row.mixed) next.push(`${age} Mixed`);
    }
    return next;
  }, [step1.ageGroups, step1.divisionTable]);

  React.useEffect(() => {
    if (step !== 0) return;
    if (step1._continue && canProceed) setStep(1);
  }, [step, step1._continue, canProceed]);

  React.useEffect(() => {
    setMaxStep((m) => Math.max(m, step));
  }, [step]);

  React.useEffect(() => {
    if (!mainRef.current) return;
    mainRef.current.scrollTop = 0;
  }, [step]);

  // Derive selected franchise objects for Step 3
  const selectedFranchises = useMemo(
    () =>
      step2.selectedIds
        .map((id) => step2.directory.find((f) => f.id === id))
        .filter(Boolean),
    [step2.selectedIds, step2.directory]
  );

  const main = step === 0 ? (
    <Step1
      value={{ ...step1, activeDivisions }}
      onChange={setStep1}
      onValidityChange={setCanProceed}
    />
  ) : step === 1 ? (
    <Step2Franchises
      value={step2}
      onChange={setStep2}
      onValidityChange={setCanProceed}
      onNext={() => setStep(2)}
    />
  ) : step === 2 ? (
    <Step3Teams
      activeDivisions={activeDivisions}
      selectedFranchises={selectedFranchises}
      value={step3}
      onChange={setStep3}
      onValidityChange={setCanProceed}
      onNext={() => setStep(3)}
      onBack={() => setStep(1)}
    />
  ) : step === 3 ? (
    <Step4Rules
      activeDivisions={activeDivisions}
      step3Entries={step3.entries}
      value={step4}
      onChange={setStep4}
      onValidityChange={setCanProceed}
      onNext={() => setStep(4)}
      onBack={() => setStep(2)}
    />
  ) : step === 4 ? (
    <section className="hj-tw2-main" aria-label="Step 5 Fixtures">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step 5 of 5, Fixtures</div>
      </header>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Fixtures</div>

        <div className="hj-tw2-footer" style={{ padding: 0, marginTop: 12 }}>
          <button
            type="button"
            className="hj-tw2-btn hj-tw2-btn--ghost"
            onClick={() => {
              const { fixtures, skippedSameFranchise } = buildFixturesForStep5({
                activeDivisions,
                step3Entries: step3.entries,
                step4,
              });
              setStep5((s) => ({ ...s, fixtures, skippedSameFranchise }));
            }}
          >
            Auto-generate fixtures
          </button>
        </div>

        {step5.skippedSameFranchise > 0 ? (
          <div className="hj-tw2-banner hj-tw2-banner--amber" role="status">
            ⚠ {step5.skippedSameFranchise} same-franchise match(es) skipped.
          </div>
        ) : null}

        {step5.fixtures.length ? (
          <div className="hj-tw2-fixtures" aria-label="Fixtures preview">
            {step5.fixtures.map((f, idx) => (
              <div key={idx} className="hj-tw2-fixture">
                <div className="hj-tw2-fixture-meta">
                  {f.group_id}{f.pool ? ` · Pool ${f.pool}` : ""} · {f.round}
                </div>
                <div className="hj-tw2-fixture-teams">
                  {f.team1} vs {f.team2}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hj-tw2-empty">No fixtures generated yet. Click Auto-generate to build round-robin fixtures.</div>
        )}
      </div>

      {step5.submitError ? (
        <div className="hj-tw2-error" role="alert">{step5.submitError}</div>
      ) : null}

      <div className="hj-tw2-footer">
        <button type="button" className="hj-tw2-btn hj-tw2-btn--ghost" onClick={() => setStep(3)}>
          ← Back
        </button>
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          disabled={step5.isSubmitting}
          onClick={async () => {
            setStep5((s) => ({ ...s, isSubmitting: true, submitError: "" }));
            try {
              const franchiseDir = step2.directory;
              const allTeams = [];
              for (const divKey of activeDivisions) {
                const divEntries = step3.entries[divKey] ?? {};
                for (const [fId, entry] of Object.entries(divEntries)) {
                  if (!entry.optedIn) continue;
                  const fObj = franchiseDir.find((f) => f.id === fId);
                  for (const slot of entry.slots) {
                    if (!slot.name.trim()) continue;
                    allTeams.push({
                      group_id: normaliseId(divKey),
                      name: slot.name.trim(),
                      franchise_name: fObj ? fObj.name : fId,
                      is_placeholder: false,
                    });
                  }
                }
              }

              const payload = {
                tournament: {
                  id: normaliseId(`${step1.name} ${step1.season}`),
                  name: step1.name,
                  season: String(step1.season),
                },
                venues: step1.selectedVenues,
                groups: activeDivisions.map((d) => ({
                  id: normaliseId(d),
                  label: d,
                  format: step4.formats[d] || getAutoFormat(getTeamsForDivision(step3.entries, d).length),
                })),
                franchises: selectedFranchises.map((f) => ({ name: f.name })),
                teams: allTeams,
                fixtures: step5.fixtures
                  .filter((f) => f.slotDay !== null && f.time && f.venue)
                  .map((f) => ({
                    group_id: f.group_id,
                    date: f.date,
                    time: f.time,
                    venue: f.venue,
                    pool: f.pool ?? null,
                    team1: f.team1,
                    team2: f.team2,
                  })),
              };

              const res = await adminFetch("/admin/tournament-wizard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || json.ok === false) {
                throw new Error(json.error || `HTTP ${res.status}`);
              }
              setStep5((s) => ({
                ...s,
                createdTournamentId: typeof json.tournament_id === "string" ? json.tournament_id : "",
              }));
            } catch (e) {
              setStep5((s) => ({ ...s, submitError: e.message || "Submit failed" }));
            } finally {
              setStep5((s) => ({ ...s, isSubmitting: false }));
            }
          }}
        >
          {step5.isSubmitting ? "Creating…" : "Create Tournament →"}
        </button>
      </div>
    </section>
  ) : null;

  return (
    <div className="hj-tw2-shell">
      <TopStepper step={step} maxStep={maxStep} onStepChange={setStep} />
      <div className="hj-tw2-body">
        <div ref={mainRef}>{main}</div>
        <SummarySidebar
          tournamentName={step1.name}
          venuesCount={step1.selectedVenues.length}
          divisionsCount={activeDivisions.length}
        />
      </div>
    </div>
  );
}
