"""Apply the radar's change feed to your system. Run once a day (e.g. 07:30 Muscat time)."""
import json
import pathlib
import urllib.request

API = "https://maith98.github.io/oman-events-radar"
CURSOR = pathlib.Path("radar_cursor.txt")   # highest sequence already applied


def apply_change(change):
    """Replace with your ERP logic. Must be idempotent: the same change may arrive twice."""
    event = change["event"]
    if change["type"] == "event.removed":
        print(f"deactivate {event['id']}")
    else:
        print(f"upsert {event['id']} v{change['event_version']} {event['status']}: {event['title']}")


last = int(CURSOR.read_text()) if CURSOR.exists() else 0
with urllib.request.urlopen(f"{API}/changes.json", timeout=10) as resp:
    feed = json.load(resp)

changes = sorted(feed["changes"], key=lambda c: c["sequence"])
if last and changes and changes[0]["sequence"] > last + 1:
    raise SystemExit("Cursor is older than the 60-day feed: re-sync everything from events.json first.")

for change in changes:
    if change["sequence"] > last:
        apply_change(change)
        last = change["sequence"]

CURSOR.write_text(str(last))
print(f"applied up to sequence {last}")
