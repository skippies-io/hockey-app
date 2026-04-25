#!/usr/bin/env node
/*
  Sonar PR preflight (no secrets committed)

  Usage:
    node scripts/sonar-preflight.mjs --pr 299

  Requirements:
    - gh CLI authenticated (uses `gh api`)
    - SonarCloud must be reachable (public endpoints)

  Prints:
    - Quality gate status for the PR
    - Any failing conditions
    - Open new-code vulnerabilities (since leak period)
*/

import { execFileSync } from 'node:child_process';

function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function ghApi(url) {
  const out = execFileSync('gh', ['api', url], { encoding: 'utf8' });
  return JSON.parse(out);
}

const pr = arg('--pr');
if (!pr) {
  console.error('Missing --pr <number>');
  process.exit(2);
}

const projectKey = 'skippies-io_hockey-app';

const gate = ghApi(`https://sonarcloud.io/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pr)}`);
const status = gate?.projectStatus?.status ?? 'UNKNOWN';

console.log(`Sonar PR #${pr} gate: ${status}`);

const failing = (gate?.projectStatus?.conditions ?? []).filter((c) => c.status === 'ERROR');
if (failing.length) {
  console.log('Failing conditions:');
  for (const c of failing) {
    console.log(`- ${c.metricKey}: actual=${c.actualValue ?? ''} threshold=${c.errorThreshold ?? ''}`);
  }
} else {
  console.log('Failing conditions: (none)');
}

const issues = ghApi(
  `https://sonarcloud.io/api/issues/search?componentKeys=${encodeURIComponent(projectKey)}` +
    `&resolved=false&types=VULNERABILITY&sinceLeakPeriod=true&pullRequest=${encodeURIComponent(pr)}&ps=100`
);

console.log(`New-code vulnerabilities (open): ${issues?.total ?? 0}`);
for (const i of issues?.issues ?? []) {
  const loc = `${i.component?.replace(`${projectKey}:`, '')}:${i.line ?? '?'}`;
  console.log(`- ${i.severity}\t${i.rule}\t${loc}\t${i.message}`);
}
