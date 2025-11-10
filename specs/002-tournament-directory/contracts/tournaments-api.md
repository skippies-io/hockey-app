# Contracts — Tournament Directory API

Base URL: `${VITE_API_BASE}` (Google Apps Script)

## GET `?tournaments=1`
Returns grouped tournaments (Live, Upcoming, Past) plus freshness metadata.

### Response
```json
{
  "generatedAt": "2025-11-09T10:00:00Z",
  "freshness": [
    { "source": "Tournaments", "fetchedAt": "2025-11-09T09:58:00Z", "status": "ok" }
  ],
  "tournaments": {
    "live": [
      {
        "slug": "indoor-2025",
        "name": "Indoor Championship 2025",
        "hostClub": "HJ Club",
        "city": "Cape Town",
        "venueName": "Bellville Velodrome",
        "startDate": "2025-06-01",
        "endDate": "2025-06-05",
        "derivedStatus": "live",
        "status": "live",
        "heroImageUrl": "https://.../indoor.jpg"
      }
    ],
    "upcoming": [],
    "past": []
  }
}
```

## GET `?tournament=indoor-2025`
Returns a single tournament detail payload.

### Response
```json
{
  "slug": "indoor-2025",
  "name": "Indoor Championship 2025",
  "status": "live",
  "derivedStatus": "live",
  "startDate": "2025-06-01",
  "endDate": "2025-06-05",
  "venueName": "Bellville Velodrome",
  "city": "Cape Town",
  "hostClub": "HJ Club",
  "heroImageUrl": "https://.../indoor.jpg",
  "description": "Five-day indoor showdown",
  "contactEmail": "indoor@hjclub.co.za",
  "resources": [
    { "type": "rules", "label": "Rules PDF", "url": "https://.../rules.pdf" },
    { "type": "form", "label": "Volunteer signup", "url": "https://forms.gle/..." }
  ],
  "divisions": [
    { "divisionId": "U13G", "divisionLabel": "U13 Girls", "teamCount": 8 },
    { "divisionId": "U11B", "divisionLabel": "U11 Boys", "teamCount": 6 }
  ],
  "contacts": [
    { "name": "Sarah Jacobs", "email": "sarah@hjclub.co.za", "phone": "+27 82 000 0000" }
  ]
}
```

## Error handling
- Unknown slug → `{ "error": "not_found" }` with HTTP 404. Frontend should redirect to `/tournaments` and show toast.
- Missing sheets/columns → return `{ "error": "config_error" }` with HTTP 500 so the client surfaces a friendly message.

## Notes
- Apps Script determines `derivedStatus` using current date:
  - Live: `startDate <= today <= endDate`
  - Upcoming: `today < startDate`
  - Past: `today > endDate`
- Detail pages use `derivedStatus` to decide whether to auto-refresh tabs (live only).
- Sorting: Upcoming by `startDate`, Live by `name`, Past by `endDate` descending.
