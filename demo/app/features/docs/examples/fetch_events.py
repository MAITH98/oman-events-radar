import json
import urllib.request

API = "https://maith98.github.io/oman-events-radar"

with urllib.request.urlopen(f"{API}/events.json", timeout=10) as resp:
    data = json.load(resp)

for e in data["events"]:
    if e["status"] == "Upcoming" and e["relevance"] == "High":
        print(e["start"], e["title"], "@", e["venue"] or e["city"])
