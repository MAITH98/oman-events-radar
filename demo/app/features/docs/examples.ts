// The examples are real files, run against the live API before publishing.
// They are imported as raw text so the docs always show exactly the tested code.
import quickstartSh from "./examples/quickstart.sh?raw";
import fetchEventsJs from "./examples/fetch-events.mjs?raw";
import fetchEventsPy from "./examples/fetch_events.py?raw";
import fetchEventsPhp from "./examples/fetch_events.php?raw";
import consumeChangesPy from "./examples/consume_changes.py?raw";
import verifyWebhookPy from "./examples/verify_webhook.py?raw";
import verifyWebhookJs from "./examples/verify-webhook.mjs?raw";
import expressReceiverJs from "./examples/express-receiver.mjs?raw";

export interface Snippet {
  label: string;
  language: string;
  filename?: string;
  code: string;
  run?: string;
}

export const FETCH_EVENTS: Snippet[] = [
  { label: "curl + jq", language: "bash", filename: "quickstart.sh", code: quickstartSh, run: "bash quickstart.sh" },
  { label: "JavaScript", language: "javascript", filename: "fetch-events.mjs", code: fetchEventsJs, run: "node fetch-events.mjs   # Node 18+" },
  { label: "Python", language: "python", filename: "fetch_events.py", code: fetchEventsPy, run: "python3 fetch_events.py   # no packages needed" },
  { label: "PHP", language: "php", filename: "fetch_events.php", code: fetchEventsPhp, run: "php fetch_events.php" },
];

export const CONSUME_CHANGES: Snippet = {
  label: "Python",
  language: "python",
  filename: "consume_changes.py",
  code: consumeChangesPy,
  run: "python3 consume_changes.py",
};

export const VERIFY_WEBHOOK: Snippet[] = [
  { label: "Python", language: "python", filename: "verify_webhook.py", code: verifyWebhookPy },
  { label: "Node.js", language: "javascript", filename: "verify-webhook.mjs", code: verifyWebhookJs },
];

export const EXPRESS_RECEIVER: Snippet = {
  label: "Express",
  language: "javascript",
  filename: "express-receiver.mjs",
  code: expressReceiverJs,
  run: "npm install express && RADAR_WEBHOOK_SECRET=… node express-receiver.mjs",
};

export const REACT_ROUTER_LOADER: Snippet = {
  label: "React Router",
  language: "tsx",
  filename: "app/routes/home.tsx",
  code: `import type { Route } from "./+types/home";

const API = "https://maith98.github.io/oman-events-radar";

// Runs on the server: no CORS, no API calls from visitors' browsers.
export async function loader({}: Route.LoaderArgs) {
  const res = await fetch(\`\${API}/events.json\`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Response("Events unavailable", { status: 502 });
  const { events } = await res.json();
  return { events: events.filter((e: { status: string }) => e.status === "Upcoming") };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <ul>
      {loaderData.events.map((e: { id: string; title: string; start: string }) => (
        <li key={e.id}>{e.start} — {e.title}</li>
      ))}
    </ul>
  );
}`,
};

export const SHEETS_FORMULA = `=IMPORTDATA("https://maith98.github.io/oman-events-radar/events.csv")`;
export const WEBCAL_EVENTS = "webcal://maith98.github.io/oman-events-radar/events.ics";
export const WEBCAL_POSTS = "webcal://maith98.github.io/oman-events-radar/posts.ics";
