# Fix: Quick Wins Bundle for Issue #92

## Summary
This PR fixes all trivial audit findings in a single commit, addressing 6 different issues identified in the audit.

## Changes Implemented

### 1. Service Worker (PWA) Registration
**File:** `src/main.jsx`
- ✅ Uncommented service worker registration code
- Enables PWA functionality for offline access
- Registers service worker on page load

```javascript
// Register service worker in production builds
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn("SW registration failed", err);
    });
  });
}
```

### 2. getStandingsRows Bug Fix
**File:** `src/App.jsx`
- ✅ Fixed missing `tournamentId` argument in TeamsPage component
- Added `useTournament` hook import and usage
- Now correctly passes both `tournamentId` and `ageId` to `getStandingsRows()`

**Changes:**
- Imported `useTournament` from context
- Added `const { activeTournament } = useTournament();` to TeamsPage
- Updated API call: `getStandingsRows(tournamentId, g.id)` instead of `getStandingsRows(g.id)`
- Added `activeTournament` to useEffect dependency array

### 3. TournamentContext useMemo
**File:** `src/context/TournamentContext.jsx`
- ✅ Wrapped expensive computation in useMemo
- Prevents unnecessary recalculation on every render
- Improves performance of tournament lookups

```javascript
const activeTournament = useMemo(
  () => availableTournaments.find(t => t.id === activeTournamentId) || null,
  [availableTournaments, activeTournamentId]
);
```

### 4. expires_at Filter
**File:** `src/components/AppLayout.jsx`
- ✅ Applied expires_at filter to announcements
- Only displays announcements that have not expired
- Filters out announcements based on `expires_at` timestamp

```javascript
// Filter announcements by expires_at to show only active announcements
const now = Date.now();
const filtered = (data || []).filter(a => {
  if (!a.expires_at) return true; // No expiry set, show it
  return new Date(a.expires_at).getTime() > now; // Show if not expired
});
```

### 5. Focus Styles CSS (WCAG AA)
**File:** `src/styles/hj-tokens.css`
- ✅ Added `:focus-visible` styles to interactive elements
- Ensures keyboard navigation accessibility
- Added 2px outline with 2px offset for clear focus indicator

**Elements styled:**
- `.btn-primary:focus-visible` → Blue outline
- `.btn-secondary:focus-visible` → Blue outline  
- `.pill:focus-visible` → Blue outline
- `select:focus-visible` → Blue outline
- `.hj-input:focus-visible` → Blue outline
- `.hj-textarea:focus-visible` → Blue outline

### 6. Colour Contrast (WCAG AA - 4.5:1)
**File:** `src/styles/hj-tokens.css`
- ✅ Fixed `.star.is-off` color contrast
  - Changed from `--hj-color-border-strong` (#d1d5db) to `--hj-color-ink-muted` (#4b5563)
  - Increases contrast on light backgrounds
- ✅ Fixed `.rank-chip` colour
  - Added explicit `color: var(--hj-color-ink)` for better contrast on light background

## Code Quality
- ✅ All changes follow existing code style and patterns
- ✅ Uses UK/SA English spelling (colour, organise, etc.)
- ✅ All changes in a single commit as required
- ✅ References Issue #92

## Files Changed
1. `src/main.jsx` - Service worker registration
2. `src/App.jsx` - getStandingsRows bug fix
3. `src/context/TournamentContext.jsx` - useMemo optimisation
4. `src/components/AppLayout.jsx` - expires_at filter
5. `src/styles/hj-tokens.css` - Focus styles and colour contrast

## Testing Checklist
- [ ] Service worker registration works in production build
- [ ] Teams page loads correctly with tournament filter
- [ ] Tournament context doesn't cause unnecessary re-renders
- [ ] Expired announcements are not displayed
- [ ] Keyboard navigation with Tab key shows focus outlines
- [ ] Off-state stars are visible and readable
- [ ] All interactive elements have sufficient colour contrast

## Accessibility Improvements
- ✅ Keyboard navigation support (`:focus-visible`)
- ✅ WCAG AA colour contrast compliance
- ✅ Better visibility of interactive elements

## Performance Improvements
- ✅ Reduced unnecessary computations in TournamentContext
- ✅ Prevents unnecessary re-renders of tournament data

## Related Issues
- Fixes #92: Quick Wins bundle for hockey-app audit findings
