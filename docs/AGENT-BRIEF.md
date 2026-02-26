# Agent Brief — hockey-app

This file is the **first document any agent should read** before making changes.
It defines how work happens in this repo, the complete development workflow, and how correctness is verified.

---

## 1. Repo purpose (high level)

hockey-app is a production PWA for viewing tournaments, fixtures, standings,
and related content. It has an active CI/CD pipeline and protected main branch.

Stability and reversibility matter more than speed.

---

## 2. Golden rule: verify before proposing changes

All agents must run the following locally before suggesting a PR-ready change:

```bash
npm run verify
```

This runs linting, tests, and build. **All must pass before opening a PR.**

---

## 3. Development workflow: The 5-phase SOP

This section defines how agents should approach work on hockey-app — from understanding code to shipping tested features.

### Phase 0: Code Comprehension (BEFORE writing code)

**Do not skip this.** Agents who jump straight to code/tests waste time guessing.

Before writing ANY code or tests:

1. **Read the actual source file** you'll be modifying or testing (20% of time)
2. **Document its structure:**
   - What components/functions exist?
   - What state does it manage?
   - What API calls does it make?
   - What are the edge cases?
3. **Identify all code paths:**
   - Happy path (success case)
   - Error paths (failures, exceptions)
   - Loading states (async operations)
   - Edge cases (null, empty, boundary values)
4. **THEN write code/tests** that cover these paths

**Checklist:**
- [ ] Read source file(s) completely
- [ ] Document structure and dependencies
- [ ] List all code paths (success, error, edge cases)
- [ ] Plan tests/changes BEFORE coding

**Example:**
```
Before implementing LoginPage tests:
□ Read src/views/admin/LoginPage.jsx — what inputs/buttons?
□ Read server/auth.mjs — what do auth functions actually do?
□ List paths: email submit, email validation error, fetch error, success + redirect
□ Write tests for EACH path
```

### Phase 1-2: Implementation

Write code/tests that execute the paths you identified in Phase 0.

For tests: **Read [AGENT-TESTING.md](./AGENT-TESTING.md) for cleanup requirements.**

### Phase 3: Local verification

```bash
npm run verify
```

✅ Linting passes
✅ All tests pass locally
✅ Build succeeds

If any fail, fix before moving to Phase 3.5.

### Phase 3.5: Real gate verification (NEW — CRITICAL)

**Do NOT skip this. Local coverage != real coverage.**

Before reporting work as done:

1. **Check actual SonarQube report** (not just local `npm test`)
   - Local npm coverage is inflated (too much mocking)
   - SonarQube is the real gate (80% minimum on new code)
2. **Identify uncovered lines:**
   - Not just the %, but which specific lines are untested
   - Example: "LoginPage.jsx lines 45-52 (error handler) are 0% covered"
3. **Write targeted tests** for those specific lines:
   - Test that triggers the catch block (line 45-52)
   - Test that triggers the success path (line 60-68)
   - Test button click (line 70-75)
4. **Verify SonarQube again** until ≥80%

**Checklist:**
- [ ] Ran `npm run verify` locally ✅
- [ ] Pulled actual SonarQube coverage report (not npm estimate)
- [ ] Identified specific uncovered files/line numbers
- [ ] Wrote tests targeting those lines
- [ ] SonarQube report shows ≥80% coverage on new code

### Phase 4: CI/CD

Push to branch → GitHub Actions runs full pipeline:
- Linting check
- Full test suite (with 4GB heap limit)
- Build check
- SonarQube analysis

All checks must pass ✅

### Phase 5: Diagnostic-driven iteration

If SonarQube fails coverage gate:

❌ **Don't do this:**
```
"Write more tests to reach 80% coverage"
```

✅ **Do this instead:**
```
"SonarQube shows AdminLayout.jsx at 45% (24 lines uncovered).

Uncovered code paths:
- Lines 15-22: logout button click (test button click + verify localStorage clear)
- Lines 45-52: error state rendering (test with failed API response)
- Lines 60-68: nav rendering for different roles (test admin vs user paths)

Write tests that execute each path.
Verify locally: npm test AdminLayout.test.jsx
THEN check SonarQube — must show ≥80% before reporting done."
```

Key difference: **Specific files + line numbers** instead of vague "improve coverage."

---

## 4. Orchestration rules: How Curtis directs agents

When spawning agents or reviewing their work:

### Rule 1: Diagnostic First

Never spawn an agent with vague requests like "improve test coverage."

Instead:
- Pull actual SonarQube data (coverage %, uncovered files, line numbers)
- Create diagnostic document showing the problem
- Spawn agent WITH the diagnosis, not after

### Rule 2: Real gates, not local metrics

- ❌ "Local npm coverage shows 84%" (often inflated)
- ✅ "SonarQube shows 27% coverage" (the real gate)

Make SonarQube % the explicit completion condition, not local npm output.

### Rule 3: Provide better context

When spawning agents, include:
- Actual source code snippets (the file they'll test)
- Component structure (what inputs/outputs exist)
- Specific untested code paths (with line numbers)
- Links to related issues/PRs

### Rule 4: Iteration with metrics

Each iteration should improve the SonarQube %, not just "write more tests."

Example progress:
- Iteration 1: 0% → 35% (added basic tests)
- Iteration 2: 35% → 62% (added error path tests)
- Iteration 3: 62% → 85% (targeted uncovered lines 45-52, 70-75)
- Done ✅

### Rule 5: Checkpoint before spawn

Before spawning a dev agent:

- [ ] Ran diagnostic (pulled SonarQube coverage data)
- [ ] Identified specific problem files/lines
- [ ] Created agent task WITH diagnostics
- [ ] Set explicit gate (SonarQube ≥80%, not local npm)

---

## 5. Before writing tests

Read **[AGENT-TESTING.md](./AGENT-TESTING.md)** for comprehensive test authoring guidelines.

**Key principle:** Proper cleanup is critical — missing cleanup in test teardown causes memory bloat and OOM errors in CI.

---

## 6. Common pitfalls

### ❌ Pitfall: Skipping Phase 0

Jumping straight to code/tests without understanding the source file structure.

**Result:** Tests don't cover real code paths. Coverage inflated. SonarQube fails.

**Fix:** Always read source file first. Document structure + code paths.

### ❌ Pitfall: Trusting local npm coverage

Local `npm test --coverage` often shows 84%+ even when SonarQube shows 27%.

**Why:** Tests use aggressive mocking. Code never executes. Coverage is fake.

**Fix:** Always verify against actual SonarQube report before reporting done.

### ❌ Pitfall: Vague test improvements

"Write more tests to reach 80% coverage" → agent guesses what's missing.

**Result:** Wasted iterations. Tests still fail.

**Fix:** Provide exact file + line numbers of uncovered code.

---

## 7. Questions?

- See **[AGENT-TESTING.md](./AGENT-TESTING.md)** for test cleanup details
- See **docs/AGENTS.md** in the original workspace for general Curtis guidelines
- See **Issue #100** for memory bloat root cause analysis
