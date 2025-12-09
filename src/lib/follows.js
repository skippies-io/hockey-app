// src/lib/follows.js
const KEY = "hj_followed_teams_v2";

export function makeTeamFollowKey(ageId, teamName) {
  const age = String(ageId ?? "").trim();
  const name = String(teamName ?? "").trim();
  return `${age}:${name}`;
}

// read -> Set<string>
export function readFollows() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

// write
function writeFollows(set) {
  localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  // notify all tabs/components
  window.dispatchEvent(new Event("hj:follows"));
}

// public API
export function isFollowing(teamName) {
  const s = readFollows();
  return s.has(teamName);
}

export function toggleFollow(teamName) {
  const s = readFollows();
  if (s.has(teamName)) s.delete(teamName); else s.add(teamName);
  writeFollows(s);
  return s.has(teamName);
}

export function clearFollows() {
  writeFollows(new Set());
}

// React hook: subscribe to follow changes
import { useEffect, useState } from "react";

export function useFollows() {
  const [setVersion, setSetVersion] = useState(0);
  const [followSet, setFollowSet] = useState(() => readFollows());

  useEffect(() => {
    const onChange = () => {
      setFollowSet(readFollows());
      setSetVersion(v => v + 1);
    };
    window.addEventListener("hj:follows", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("hj:follows", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return {
    follows: followSet,
    isFollowing: (name) => followSet.has(name),
    toggleFollow: (name) => {
      const now = toggleFollow(name); // triggers event
      return now;
    },
    size: followSet.size,
    _v: setVersion, // forces re-render on change (unused outside)
  };
}
