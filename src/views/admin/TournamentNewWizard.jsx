import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./tournamentNewWizard.css";

const STEPS = [
  "Tournament Details",
  "Franchises",
  "Teams & Pools",
  "Fixtures & Time Slots",
  "Review & Submit",
];

const FRANCHISE_COLOUR_ROTATION = [
  "#2E5BFF",
  "#22C55E",
  "#F97316",
  "#A855F7",
  "#EF4444",
  "#06B6D4",
  "#F59E0B",
  "#10B981",
  "#6366F1",
  "#EC4899",
];

function normaliseId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

const franchiseShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  colour: PropTypes.string.isRequired,
});

function Step2Franchises({ value, onChange, onValidityChange }) {
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
        <button type="button" className="hj-tw2-btn hj-tw2-btn--primary" disabled={!isValid}>
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
};

function StepRail({ step }) {
  return (
    <nav className="hj-tw2-stepper" aria-label="Tournament wizard steps">
      {STEPS.map((label, idx) => {
        const state = idx === step ? "current" : idx < step ? "done" : "todo";
        return (
          <div key={label} className={`hj-tw2-step hj-tw2-step--${state}`}
            aria-current={idx === step ? "step" : undefined}
          >
            <div className="hj-tw2-step-bullet">
              {idx < step ? "✓" : idx + 1}
            </div>
            <div className="hj-tw2-step-label">{label}</div>
          </div>
        );
      })}
    </nav>
  );
}

StepRail.propTypes = {
  step: PropTypes.number.isRequired,
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
    directory: [
      { id: "f-beaulieu", name: "Beaulieu College", colour: "#2E5BFF" },
      { id: "f-stithians", name: "St Stithians", colour: "#22C55E" },
      { id: "f-kings", name: "King Edward VII", colour: "#F97316" },
      { id: "f-randpark", name: "Rand Park", colour: "#A855F7" },
      { id: "f-stdavids", name: "St David's", colour: "#EF4444" },
      { id: "f-westerford", name: "Westerford", colour: "#06B6D4" },
    ],
    selectedIds: [],
    query: "",
    draftName: "",
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
    />
  ) : (
    <section className="hj-tw2-main">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step {step + 1} of 5, {STEPS[step]}</div>
      </header>
      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">WIP</div>
        <div style={{ color: "var(--hj-color-ink-muted)" }}>
          This step is not implemented yet.
        </div>
      </div>
      <div className="hj-tw2-footer">
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          onClick={() => setStep((s) => Math.min(4, s + 1))}
          disabled={!canProceed}
        >
          Next
        </button>
      </div>
    </section>
  );

  return (
    <div className="hj-tw2-shell">
      <StepRail step={step} />
      {main}
      <SummarySidebar
        tournamentName={step1.name}
        venuesCount={step1.selectedVenues.length}
        divisionsCount={activeDivisions.length}
      />
    </div>
  );
}
