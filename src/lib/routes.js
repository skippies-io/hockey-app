export function teamProfilePath(ageId, teamName) {
  const safeAge = encodeURIComponent(ageId || "");
  const safeTeam = encodeURIComponent(teamName || "");
  return `/${safeAge}/team/${safeTeam}`;
}
