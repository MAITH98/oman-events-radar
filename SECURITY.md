# Security

## Reporting

Please report vulnerabilities privately through GitHub's "Report a vulnerability" (Security tab) rather than a public issue.

## How the radar protects itself

- **Untrusted URLs.** Submitted and discovered links are untrusted. The fetcher only allows `http`/`https`, rejects URLs with credentials, resolves the host and refuses private, loopback, link-local, reserved and multicast addresses (e.g. `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`), and repeats that check on every redirect (max 5).
- **Limits.** Responses are capped at 5 MB. Each socket wait times out after 25 s (one retry at 50 s for slow sites) and a whole download must finish within 3× that wait, so a site that trickles bytes cannot stall the daily run. Per-host delays and `robots.txt` are honoured.
- **No code execution.** Fetched content is parsed as text/JSON/XML only. The web page renders event data with `textContent` (never `innerHTML`) and only links `http(s)` URLs.
- **Spreadsheet and calendar output.** Cells in `events.csv` that would start a formula (`= + - @`) are prefixed with `'`; URLs in `events.ics` / `posts.ics` are stripped of control characters, so scraped text cannot run in a sheet or inject calendar lines.
- **Webhook.** The ERP webhook only posts to an `https` URL on a public address and never follows a redirect (the signed payload is not re-sent anywhere else). Payloads are signed with HMAC-SHA256 over `timestamp + "." + body` (`X-Radar-Timestamp`, `X-Radar-Signature`). The URL and secret are GitHub Actions secrets — never commit them.
- **Data.** Only public event facts are stored. Do not add personal contact details to any file in this repository.

## Known limitation

The address check happens before the connection is made, so a host whose DNS answer changes between the check and the connection (DNS rebinding) is not fully prevented. The scheduled job runs on GitHub-hosted runners with no access to internal Nahj systems, which limits the impact. Self-hosted deployments (for example inside an ERP network) should run the radar in an isolated network segment with outbound-only internet access.
