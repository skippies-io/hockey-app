const COLORS = new Set([
  "black",
  "white",
  "green",
  "blue",
  "pink",
  "purple",
  "orange",
  "yellow",
  "royal",
  "red",
  "silver",
  "gold",
]);

const VARIANTS = new Set(["boys", "girls", "mixed", "league"]);
const AGE_RE = /^(u\d{1,2})$/i;
const ORDINAL_RE = /^\d+(st|nd|rd|th)$/i;
const PLACEHOLDER_RE = /(winner|loser|place|qf|sf|final)/i;
const SEED_RE = /^[A-Z]\d$/; // B1, B2, etc.

const ACRONYM_KEEP = new Set(["BHA", "GS", "SMS"]);

const ALIASES = [
  { re: /^pp\b/i, franchise: "Purple Panthers" },
];

const CORRECTIONS = [
  { re: /\bgaurdian(s)?\b/gi, replace: "Guardian$1" },
  { re: /\bgaurdians\b/gi, replace: "Guardians" },
  { re: /\bmight ducks\b/gi, replace: "Mighty Ducks" },
  { re: /\bpurple panters\b/gi, replace: "Purple Panthers" },
  { re: /\bpurple panther(s)?\b/gi, replace: "Purple Panthers" },
  { re: /\bblue crane(s)?\b/gi, replace: "Blue Cranes" },
];

function normalizeSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeTeamName(name) {
  const raw = normalizeSpaces(name);
  if (!raw) return "";
  return normalizeSpaces(raw.replace(/\s*-\s*/g, " "));
}

function toTitleCase(value) {
  return normalizeSpaces(value)
    .split(" ")
    .map((word) => {
      if (!word) return word;
      const clean = word.replace(/[^A-Za-z0-9]/g, "");
      const upper = clean.toUpperCase();
      if (ACRONYM_KEEP.has(upper)) return upper;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function applyCorrections(value) {
  let s = normalizeSpaces(value);
  for (const rule of CORRECTIONS) {
    s = s.replace(rule.re, rule.replace);
  }
  return s;
}

export function parseFranchiseName(name) {
  const raw = normalizeTeamName(name);
  if (!raw) return { franchise: "", placeholder: false, reason: "empty" };

  if (
    PLACEHOLDER_RE.test(raw) ||
    ORDINAL_RE.test(raw.split(" ")[0]) ||
    SEED_RE.test(raw)
  ) {
    return { franchise: "", placeholder: true, reason: "placeholder" };
  }

  for (const { re, franchise } of ALIASES) {
    if (re.test(raw)) {
      return { franchise, placeholder: false, reason: "alias" };
    }
  }

  const tokens = raw.split(" ");
  let end = tokens.length;
  while (end > 0) {
    const token = tokens[end - 1].replace(/[^A-Za-z0-9]/g, "");
    const tokenLower = token.toLowerCase();
    if (!token) {
      end -= 1;
      continue;
    }
    if (
      AGE_RE.test(tokenLower) ||
      ORDINAL_RE.test(tokenLower) ||
      COLORS.has(tokenLower) ||
      VARIANTS.has(tokenLower) ||
      /^\d+$/.test(tokenLower)
    ) {
      end -= 1;
      continue;
    }
    break;
  }

  const candidate = tokens.slice(0, end).join(" ");
  const corrected = applyCorrections(candidate);
  const normalized = toTitleCase(corrected);
  if (normalized === "Northern Guardian") {
    return { franchise: "Northern Guardians", placeholder: false, reason: "corrected" };
  }
  return { franchise: normalized, placeholder: false, reason: "tail-strip" };
}
