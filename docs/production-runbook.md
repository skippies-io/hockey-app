# Production Runbook

## Northflank public API connectivity (hj-api)

- Copy the Public DNS from “Port will be accessible at” and use that as the source of truth.
- Configure a single public HTTP port that maps to container port 8787.
- Do not publish port 80 if the container listens on 8787; it causes Envoy 503 (connection refused).

Common failure modes:
- zsh globbing on `?`/`&` → wrap the URL in single quotes.
- DNS not resolving → ensure you copied the Public DNS for the exposed port.
- Envoy 503 connection refused → check public port maps to 8787 (remove port 80).

Verification:
- `curl -i "https://<PUBLIC_DNS>/"` -> `404 {"ok":false,"error":"Not found"}`
- `curl -i "https://<PUBLIC_DNS>/api?sheet=Fixtures&age=U13B"` -> `200 {"ok":true,...}`
