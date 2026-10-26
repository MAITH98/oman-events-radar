import type { SourceKind } from "../../events/api";

/** Line icons per source type (24 px box, drawn with currentColor) — shared by the automation and the credits page. */
export const KIND_ICONS: Record<SourceKind, React.ReactNode> = {
  venue: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  organiser: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  site: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></>,
  aggregator: <><path d="M4 8.5V6a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 6v2.5a2.5 2.5 0 0 0 0 5V16a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16v-2.5a2.5 2.5 0 0 0 0-5z" /><path d="M14 5v12" /></>,
  news: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" /></>,
  team: <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M15 15c2.2 0 3.9 1.2 4.5 3.5" /></>,
};
