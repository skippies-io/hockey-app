# Agent Testing Guide — hockey-app

Comprehensive guidelines for writing tests that don't cause memory bloat or OOM errors in CI.

**See also:** [AGENT-BRIEF.md](./AGENT-BRIEF.md) for general repo guidelines.

---

## Test authoring: Memory cleanup is critical

**Lesson learned (Issue #100):** Incomplete test cleanup causes memory bloat and OOM errors in CI.

### Root cause analysis

- Test suite has 240+ tests across 30 files
- Agents wrote tests without proper `afterEach` cleanup
- Mocks and stubs accumulated across test files → Node.js heap grew during run
- After ~12 minutes: heap limit hit (default 2GB) → worker crashed
- Result: 234/240 tests passed, then OOM error
- Workaround: Increased heap to 4GB in CI (PR #99), but this is a bandaid

### Required cleanup pattern

Every test file that uses mocks, stubs, or global state must include:

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('MyComponent', () => {
  beforeEach(() => {
    // Set up test fixtures
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    // CRITICAL: Clean up everything
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    // If using vi.mock(...), also call:
    // vi.unmock('../path/to/module');
  });

  it('should test something', () => {
    // test code
  });
});
```

### Why this matters

- **Missing cleanup** → mocks/stubs accumulate across test files
- **Accumulated state** → Node.js heap grows during test run
- **Heap limit hit** → worker crashes after ~12 minutes (234/240 tests pass, then OOM)
- **Solution** → Comprehensive cleanup in every `afterEach` hook

### Checklist before writing tests

- [ ] Every test file has `afterEach` hook with all cleanup calls
- [ ] `afterEach` calls `vi.unstubAllGlobals()`
- [ ] `afterEach` calls `vi.clearAllMocks()`
- [ ] `afterEach` calls `vi.restoreAllMocks()`
- [ ] `afterEach` calls `localStorage.clear()` if tests use localStorage
- [ ] `afterEach` calls `sessionStorage.clear()` if tests use sessionStorage
- [ ] Global state (like `window.fetch`) is stubbed, not replaced
- [ ] All `vi.mock()` calls have corresponding `vi.unmock()` in cleanup
- [ ] Verify locally: `npm run test` completes without memory warnings

### Memory anti-patterns

❌ **Don't do this:**
```javascript
afterEach(() => {
  vi.unstubAllGlobals(); // Missing: clearAllMocks, restoreAllMocks
});
```

❌ **Don't do this:**
```javascript
// No afterEach at all
describe('MyComponent', () => {
  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

❌ **Don't do this:**
```javascript
vi.mock('../lib/api'); // Missing: vi.unmock in afterEach
```

❌ **Don't do this:**
```javascript
beforeEach(() => {
  global.fetch = vi.fn(); // Use vi.stubGlobal instead
});
```

### Reference

- **Vitest docs:** https://vitest.dev/api/
- **Issue #100:** Test suite memory bloat (root cause analysis)
- **PR #99:** CI heap limit increase (pragmatic workaround)
- **Memory cleanup lesson learned:** See MEMORY.md (2026-02-23)
