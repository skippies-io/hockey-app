# Incident: Tournaments selector not loading on GitHub Pages

## Summary
Users on GitHub Pages could not load or switch tournaments because the frontend bundle was wired to the wrong API base and Pages sometimes served a stale JS bundle, making it hard to confirm which code was running. The fix aligned the tournaments endpoint with the baked API base and added build fingerprint logging to make bundle provenance visible.

## Impact
Pages users could not switch tournaments and the multi-tournament experience was effectively blocked.

## Detection
We confirmed the issue by checking the browser console for the HJ build fingerprint, verifying the TournamentContext init URL, and comparing the deployed assets/index-*.js referenced by Pages.

## Root causes
- Env/endpoint mismatch in the frontend: tournaments endpoint derivation did not consistently use the baked API base.
- Build fingerprint and caching ambiguity: Pages could serve an older bundle without a clear way to verify the active build.
- CI/lint parsing issue in vite.config.js (the '\x27' parsing problem) distracted from the core issue during iteration.

## Fix
- Derive the tournaments endpoint from API_BASE and /api/tournaments (Option A).
- Add build fingerprint logging ("HJ build <sha>").
- Confirm /api/tournaments returns JSON and Pages is serving the correct assets/index-*.js bundle.

## Verification steps
- `curl -sS https://p01--hj-api--wlt9xynp45bk.code.run/api/tournaments | head -c 200 && echo`
- `curl -sS https://p01--hj-api--wlt9xynp45bk.code.run/api?groups=1 | head -c 200 && echo`
- `curl -sS "https://skippies-io.github.io/hockey-app/" | rg -n "assets/index-.*\.js"`
- `curl -sS --compressed "https://skippies-io.github.io/hockey-app/assets/index-<hash>.js" > /tmp/index.js`
- `rg -n "HJ build|TournamentContext init|/api/tournaments" /tmp/index.js || true`

## Prevention / follow-ups
- Keep provider-agnostic logs for tournaments initialization.
- Consider adding a small “version panel” in the UI for quick build provenance checks.
- Keep incident notes to speed up future debugging.
