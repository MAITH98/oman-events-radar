# ERP integration guide

For the team integrating Oman Events Radar into an ERP or CRM. The radar is a static, daily batch job: it has no server of its own. Choose one of three integration paths.

| Path | How | Best for |
|---|---|---|
| **1. Pull the change feed** (recommended) | Daily `GET https://<pages-host>/changes.json`, apply entries with `sequence` greater than the last one you stored | Any ERP with a scheduled job; no inbound firewall rules |
| **2. Webhook push** | Set `RADAR_WEBHOOK_URL` and `RADAR_WEBHOOK_SECRET` as GitHub Actions secrets; the radar POSTs each day's changes | ERPs that already accept signed webhooks |
| **3. Snapshot** | `GET events.json` (full list) or `events.csv` / `events.ics` | Reporting, spreadsheets, calendars |

Paths 1 and 2 carry identical entries, so an ERP can start with pulling and add the webhook later.

## Event record (`schema_version` 1.0)

```json
{
  "schema_version": "1.0",
  "id": "769993e81dcd",
  "version": 1,
  "kind": "event",
  "title": "COMEX – Global Technology Show 2027",
  "start": "2027-02-01", "end": "2027-02-04", "previous_start": "",
  "venue": "Oman Convention & Exhibition Centre (OCEC)", "city": "Muscat", "region": "Oman",
  "organizer": "OITE (Oman International Trade & Exhibitions)", "organizer_url": "https://comex-global.com/",
  "url": "https://www.comex-global.com",
  "description": "…",
  "ticket_deadline": "", "ticket_price": "",
  "category": "Tech & AI", "relevance": "High", "score": 18,
  "confidence": 100, "status": "Upcoming",
  "sources": ["allevents-muscat", "organiser:Arabian Research Bureau / OITE", "venue:Oman Convention & Exhibition Centre (OCEC)"],
  "tiers": ["A", "C"],
  "first_seen": "2026-10-25", "last_seen": "2026-10-25",
  "workflow": { "brief": "2027-01-11", "announce": "2027-01-18", "design_lock": "2027-01-25",
                "reminder": "2027-01-29", "live": "2027-02-01", "recap": "2027-02-05" },
  "hashtags": ["#Oman", "#OmanEvents", "#فعاليات_عمان", "#OmanTech", "#DigitalOman", "#التحول_الرقمي"]
}
```

| Field | Meaning |
|---|---|
| `id` | Stable identifier. Survives title spelling changes and rescheduling (up to 120 days); a new yearly edition gets a new id. Use it as the external key in the ERP. |
| `version` | Increases by 1 whenever a tracked field changes (title, dates, venue, url, status, relevance, ticket price, organiser). |
| `kind` | `event`, `expected` (predicted next edition — not confirmed) or `occasion` (national day). |
| `status` | `Upcoming`, `Ongoing`, `Rescheduled`, `Cancelled`, `Needs review`, `Lead – verify`, `Expected – confirm`, `Occasion`, `Past`, `Removed`. |
| `confidence` | 0–100 from fixed rules: best source tier (A 70, B 60, C 40, D 25) + 25 if an independent source agrees + 5 venue + 5 organiser. |
| `region` | `Oman`, `GCC`, `Other`, `Unknown` — independent of relevance. |
| `workflow` | Content preparation dates (ISO). Empty for Low relevance, unconfirmed or past events. |
| Dates | ISO `YYYY-MM-DD`, Asia/Muscat calendar dates, `end` inclusive. |

**Suggested ERP rule:** create or update a record only when `status` is `Upcoming`, `Ongoing`, `Rescheduled` or `Cancelled`; route `Needs review` / `Expected – confirm` to a review list; ignore `Lead – verify`.

## Change feed (`changes.json`)

```json
{
  "schema_version": "1.0",
  "latest_sequence": 94,
  "changes": [
    {
      "schema_version": "1.0",
      "sequence": 94,
      "type": "event.updated",
      "occurred_at": "2026-10-26T03:04:11+00:00",
      "event_id": "769993e81dcd",
      "event_version": 2,
      "idempotency_key": "769993e81dcd:2:event.updated",
      "event": { "…full record…": "" }
    }
  ]
}
```

| `type` | When |
|---|---|
| `event.created` | First time an id is seen |
| `event.updated` | A tracked field changed |
| `event.rescheduled` | `start` changed (also see `previous_start`) |
| `event.cancelled` | Source marked it cancelled |
| `event.removed` | An upcoming event disappeared while its sources were healthy. It is a tombstone: keep the record, mark it inactive. |

Rules for consumers:

- Process entries in `sequence` order; store the highest sequence applied.
- `idempotency_key` is unique per change; applying the same entry twice must be a no-op.
- The feed keeps 60 days of history. If your stored sequence is older than the first entry, re-sync from `events.json`.
- A source that fails or suddenly returns nothing does **not** produce `event.removed`; its previous events are kept.

## Webhook

`POST` to `RADAR_WEBHOOK_URL` (must be `https`, public address) with body `{"schema_version": "1.0", "changes": [ … ]}`.

Headers:

```
Content-Type: application/json
X-Radar-Timestamp: 1793065451
X-Radar-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>" with RADAR_WEBHOOK_SECRET>
```

Verify before processing, and reject timestamps older than 5 minutes (replay protection):

```python
import hashlib, hmac, time

def verify(raw_body: bytes, timestamp: str, signature: str, secret: str) -> bool:
    if abs(time.time() - int(timestamp)) > 300:
        return False
    expected = hmac.new(secret.encode(), timestamp.encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

```javascript
const crypto = require("crypto");
function verify(rawBody, timestamp, signature, secret) {
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

Delivery: up to 3 attempts (5 s, 10 s back-off), then the run logs the failure. Return any 2xx to acknowledge. Missed deliveries are recoverable from `changes.json`.

## Hosting options

- **As is:** GitHub Actions + GitHub Pages (public data, nothing to host).
- **Inside the ERP environment:** run `python3 -m radar` daily (Python 3.10+, no packages). Give it outbound internet only and no access to internal networks (see `SECURITY.md`). Point the ERP at the generated `docs/` files or at the webhook.
- **Private Nahj additions** (CEO attendance decisions, internal relevance overrides, client links) should live in the ERP, keyed by `id` — not in the public repository.

## Open questions for the integration owner

1. Which ERP (and version) and which module should own events — CRM activities, marketing calendar, or a custom doctype?
2. Pull (path 1) or push (path 2)? If push: the endpoint URL and who holds the secret.
3. Who reviews the `Needs review` queue, and should approvals flow back (e.g. by adding rows to `community/submissions.csv`)?
