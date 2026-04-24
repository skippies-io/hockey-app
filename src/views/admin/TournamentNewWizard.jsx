import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./tournamentNewWizard.css";

import { FRANCHISE_COLOUR_ROTATION, normaliseId } from "./TournamentNewWizard.utils";

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
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          onClick={() => {
            if (!isValid) return;
            onChange({ ...value, _continue: (value._continue || 0) + 1 });
          }}
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
    _continue: PropTypes.number,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onValidityChange: PropTypes.func.isRequired,
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

  const [step3, setStep3] = useState({
    teamNameDraft: "",
    teams: [],
    poolCount: 2,
    pools: {},
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

  const poolState = useMemo(() => {
    const poolCount = Math.max(1, Math.min(12, Number(step3.poolCount) || 1));
    const poolNames = Array.from({ length: poolCount }, (_, i) => `Pool ${String.fromCharCode(65 + i)}`);

    const pools = {};
    for (const p of poolNames) pools[p] = [];

    for (const t of step3.teams) {
      const desired = step3.pools[t.id];
      const chosen = poolNames.includes(desired) ? desired : poolNames[0];
      pools[chosen].push(t.id);
    }

    return { poolCount, poolNames, pools };
  }, [step3.poolCount, step3.pools, step3.teams]);

  React.useEffect(() => {
    if (step === 0) return;
    if (step === 1) return;
    if (step === 2) {
      const hasMinTeams = step3.teams.length >= 2;
      const hasAtLeastTwoPools = poolState.poolCount >= 2;
      const hasNoEmptyPools = poolState.poolNames.every((p) => poolState.pools[p].length > 0);
      setCanProceed(hasMinTeams && hasAtLeastTwoPools && hasNoEmptyPools);
    }
  }, [step, step3.teams.length, poolState.poolCount, poolState.poolNames, poolState.pools]);

  const isStep3PoolInvalid =
    step3.teams.length >= 2 &&
    poolState.poolCount >= 2 &&
    poolState.poolNames.some((p) => poolState.pools[p].length === 0);

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
      onValidityChange={(isValid) => {
        setCanProceed(isValid);
        if (isValid && step2._continue) setStep(2);
      }}
    />
  ) : step === 2 ? (
    <section className="hj-tw2-main" aria-label="Step 3 Teams & Pools">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step 3 of 5, Teams & Pools</div>
      </header>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Teams</div>
        <div className="hj-tw2-row">
          <label className="hj-tw2-label" htmlFor="tw2-team-name">
            Add team
          </label>
          <div className="hj-tw2-row-inline">
            <input
              id="tw2-team-name"
              className="hj-tw2-input"
              value={step3.teamNameDraft}
              placeholder="Team name"
              onChange={(e) =>
                setStep3((s) => ({
                  ...s,
                  teamNameDraft: e.target.value,
                }))
              }
            />
            <button
              type="button"
              className="hj-tw2-btn"
              onClick={() => {
                const name = step3.teamNameDraft.trim();
                if (!name) return;
                setStep3((s) => ({
                  ...s,
                  teams: [...s.teams, { id: `t-${s.teams.length + 1}`, name }],
                  teamNameDraft: "",
                }));
              }}
            >
              Add
            </button>
          </div>
        </div>

        {step3.teams.length ? (
          <ul className="hj-tw2-list" aria-label="Teams list">
            {step3.teams.map((t) => (
              <li key={t.id} className="hj-tw2-list-item">
                {t.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="hj-tw2-empty">No teams added yet.</div>
        )}
      </div>

      <div className="hj-tw2-card">
        <div className="hj-tw2-card-title">Pools</div>

        <div className="hj-tw2-row hj-tw2-row--tight">
          <label className="hj-tw2-label" htmlFor="tw2-pool-count">
            Number of pools
          </label>
          <input
            id="tw2-pool-count"
            className="hj-tw2-input hj-tw2-input--small"
            type="number"
            min={2}
            max={12}
            value={step3.poolCount}
            onChange={(e) => {
              const next = Number(e.target.value);
              setStep3((s) => ({ ...s, poolCount: next }));
            }}
          />
        </div>

        <div className="hj-tw2-pools" role="group" aria-label="Pool assignments">
          {poolState.poolNames.map((poolName) => (
            <div key={poolName} className="hj-tw2-pool">
              <div className="hj-tw2-pool-title">{poolName}</div>
              <div className="hj-tw2-pool-body">
                {step3.teams.map((t) => (
                  <label key={t.id} className="hj-tw2-pool-row">
                    <input
                      type="radio"
                      aria-label={t.name}
                      name={`team-${t.id}-pool`}
                      value={poolName}
                      checked={(step3.pools[t.id] || poolState.poolNames[0]) === poolName}
                      onChange={() => {
                        setStep3((s) => ({
                          ...s,
                          pools: { ...s.pools, [t.id]: poolName },
                        }));
                      }}
                    />
                    <span className="hj-tw2-pool-team">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {isStep3PoolInvalid ? (
          <div className="hj-tw2-error">Each pool must have at least one team</div>
        ) : null}
      </div>

      <div className="hj-tw2-footer">
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--ghost"
          onClick={() => setStep(1)}
        >
          Back
        </button>
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          onClick={() => {
            setStep(3);
            setCanProceed(false);
          }}
          disabled={!canProceed}
        >
          Save & Continue
        </button>
      </div>
    </section>
  ) : step === 3 ? (
    <section className="hj-tw2-main" aria-label="Step 4 Rules">
      <header className="hj-tw2-header">
        <h1 className="hj-tw2-title">Create a new tournament</h1>
        <div className="hj-tw2-subtitle">Step 4 of 5, Rules</div>
      </header>

      {activeDivisions.map((division) => {
        const teamCount = step3.teams.length;
        const defaultFormat = teamCount === 3 ? "rr2" : "rr1";
        const selected = step4.formats[division] || defaultFormat;
        const isAuto = teamCount === 3 && selected === "rr2";
        return (
          <div key={division} className="hj-tw2-card">
            <div className="hj-tw2-card-title">{division}</div>
            <div className="hj-tw2-rule-meta">
              <span>{teamCount} teams</span>
              {isAuto ? <span className="hj-tw2-autosuggested">AUTO-SUGGESTED</span> : null}
            </div>

            <div className="hj-tw2-rule-options" role="radiogroup" aria-label={`${division} format`}>
              <button
                type="button"
                className={`hj-tw2-opt ${selected === "rr1" ? "is-selected" : ""}`}
                onClick={() => setStep4((s) => ({ ...s, formats: { ...s.formats, [division]: "rr1" } }))}
              >
                <span className={`hj-tw2-opt-radio ${selected === "rr1" ? "is-checked" : ""}`} aria-hidden="true" />
                <span className="hj-tw2-opt-label">Round Robin x1</span>
              </button>
              <button
                type="button"
                className={`hj-tw2-opt ${selected === "rr2" ? "is-selected" : ""}`}
                onClick={() => setStep4((s) => ({ ...s, formats: { ...s.formats, [division]: "rr2" } }))}
              >
                <span className={`hj-tw2-opt-radio ${selected === "rr2" ? "is-checked" : ""}`} aria-hidden="true" />
                <span className="hj-tw2-opt-label">Round Robin x2</span>
              </button>
              <button
                type="button"
                className={`hj-tw2-opt ${selected === "gsk" ? "is-selected" : ""}`}
                onClick={() => setStep4((s) => ({ ...s, formats: { ...s.formats, [division]: "gsk" } }))}
              >
                <span className={`hj-tw2-opt-radio ${selected === "gsk" ? "is-checked" : ""}`} aria-hidden="true" />
                <span className="hj-tw2-opt-label">Group Stage + Knockout</span>
              </button>
              <button
                type="button"
                className={`hj-tw2-opt ${selected === "ko" ? "is-selected" : ""}`}
                onClick={() => setStep4((s) => ({ ...s, formats: { ...s.formats, [division]: "ko" } }))}
              >
                <span className={`hj-tw2-opt-radio ${selected === "ko" ? "is-checked" : ""}`} aria-hidden="true" />
                <span className="hj-tw2-opt-label">Knockout Only</span>
              </button>
            </div>
          </div>
        );
      })}

      <div className="hj-tw2-footer">
        <button type="button" className="hj-tw2-btn hj-tw2-btn--ghost" onClick={() => setStep(2)}>
          Back
        </button>
        <button
          type="button"
          className="hj-tw2-btn hj-tw2-btn--primary"
          onClick={() => {
            setStep(4);
            setCanProceed(false);
          }}
        >
          Save & Continue
        </button>
      </div>
    </section>
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
