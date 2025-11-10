# Contracts — Overview & Digest API

All endpoints live behind the existing Google Apps Script deployment (`VITE_API_BASE`). Requests use query parameters because Apps Script exposes a single HTTPS entry point.

## GET `?overview=1&season=2025&userKey={anon}`
Fetches the consolidated payload for the Overview page.

### Response
```json
{
  "season": "2025",
  "generatedAt": "2025-02-14T09:32:00Z",
  "freshness": [
    { "source": "fixtures", "fetchedAt": "2025-02-14T09:30:00Z", "status": "ok", "recordsLoaded": 220 },
    { "source": "standings", "fetchedAt": "2025-02-14T09:29:12Z", "status": "ok", "recordsLoaded": 96 },
    { "source": "announcements", "fetchedAt": "2025-02-14T09:28:30Z", "status": "warning", "issues": ["U11G feed paused"] }
  ],
  "cards": [
    {
      "id": "fixture-U13B-2025-02-14T16:00",
      "type": "fixture",
      "entityId": "fx-123",
      "ageId": "U13B",
      "headline": "Jaguars vs Dragons",
      "subtext": "16:00 • Court 2",
      "statusBadge": "live",
      "metrics": { "score": "2-1", "round": "Pool A" },
      "links": { "deep": "/U13B/fixtures#fx-123" },
      "followed": true
    },
    {
      "id": "standing-U11G-jaguars",
      "type": "standing",
      "headline": "Jaguars (1st)",
      "subtext": "Pts 12 • GD +9",
      "statusBadge": "info",
      "links": { "deep": "/U11G/standings" }
    }
  ],
  "announcements": [
    { "id": "ann-45", "title": "Venue change", "body": "U9M now on Court 3", "severity": "warning", "visibleUntil": "2025-02-14T20:00:00Z" }
  ],
  "followPreference": {
    "teams": ["U13B:Jaguars", "U11G:Knights"],
    "ageGroups": ["U9M"],
    "season": "2025"
  }
}
```

## POST `?digests=1`
Creates or updates a digest definition. Body is `application/json`.

### Request
```json
{
  "title": "Saturday Finals",
  "selectedTeams": ["U13B:Jaguars", "U13B:Dragons"],
  "selectedAgeGroups": ["U9M"],
  "ownerUserKey": "hj_7f820",
  "expiresAt": "2025-02-16T23:59:00Z"
}
```

### Response
```json
{
  "token": "a9dj3kqp",
  "shareUrl": "https://hj.app/digest/a9dj3kqp",
  "expiresAt": "2025-02-16T23:59:00Z"
}
```

## GET `?digest=a9dj3kqp`
Public read-only endpoint used by shared links.

### Response
```json
{
  "title": "Saturday Finals",
  "season": "2025",
  "expiresAt": "2025-02-16T23:59:00Z",
  "cards": [ /* same schema as overview cards but scoped */ ],
  "generatedAt": "2025-02-14T10:12:00Z"
}
```

## POST `?alerts=1`
Used by staff tooling to flag delays/cancellations.

### Request
```json
{
  "fixtureId": "fx-123",
  "alertType": "delay",
  "message": "Running 15 minutes late",
  "flaggedBy": "Coach D",
  "season": "2025"
}
```

### Response
```json
{ "ok": true }
```

### Notes
- Apps Script validates user via simple shared secret or Apps Script built-in auth (TBD with tournament admins).
- Alerts are merged into the Overview feed as `type = "alert"` cards until `resolvedAt` is set via the same endpoint.
