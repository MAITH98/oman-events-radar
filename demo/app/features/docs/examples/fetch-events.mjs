const API = "https://maith98.github.io/oman-events-radar";

const res = await fetch(`${API}/events.json`, { signal: AbortSignal.timeout(10_000) });
if (!res.ok) throw new Error(`Radar API answered ${res.status}`);
const { generated_at, events } = await res.json();

const highlights = events.filter((e) => e.status === "Upcoming" && e.relevance === "High");
console.log(`Updated ${generated_at} — ${highlights.length} high-relevance upcoming events`);
for (const e of highlights) console.log(e.start, e.title, "@", e.venue || e.city);
