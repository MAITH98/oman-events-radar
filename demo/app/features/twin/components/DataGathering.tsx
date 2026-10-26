import { useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import type { SourceHealth, SourceKind } from "../../events/api";
import type { RadarEvent } from "../../events/types";
import { liveEvents, upcomingIncludingReview } from "../stats";
import { ApiPromoCard } from "./ApiPromoCard";
import { AutomationFlow } from "./AutomationFlow";
import { groupByPlace } from "../places";

export interface NewsStats {
  total: number;
  withEvent: number;
  en: number;
  ar: number;
}

const KIND_ORDER: SourceKind[] = ["venue", "organiser", "site", "aggregator", "news", "team"];

/** Donut gauge: one value, one hue; the number in the middle is the real text. */
function Gauge({ value, label, hint }: { value: number; label: string; hint: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <figure className="hud-panel bento-tile flex h-full flex-col items-start gap-3 p-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-chart)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${(v / 100) * c} ${c}`} className="bento-gauge" style={{ ["--gauge-len" as string]: `${(v / 100) * c}` }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums text-ink">{v}%</span>
      </div>
      <figcaption className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </figcaption>
    </figure>
  );
}

function StageHead({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <header className="mb-4 flex items-start gap-3">
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand text-sm font-semibold text-brand dark:shadow-[0_0_18px_-4px_var(--radar-beam)]">
        {/* 0 = the live automation tile: a pulsing dot instead of a step number */}
        {n === 0 ? <span className="bento-live h-2.5 w-2.5 rounded-full bg-ok" /> : n}
      </span>
      <span>
        <h3 className="text-h3 text-ink">{title}</h3>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </header>
  );
}

/**
 * "The automation" for general users (bento, ref. "CARDS" riff): what the radar reads → the work it does for you →
 * what you get, as ready results with live numbers (full width); four trust gauges and the API card below. Every number is computed from the live API at request time.
 */
export function DataGathering({
  events,
  health,
  news,
  latestSequence,
}: {
  events: RadarEvent[];
  health: SourceHealth | null;
  news: NewsStats;
  latestSequence: number | null;
}) {
  const { t } = useI18n();
  const g = t.gather;
  // the API card can be dismissed; the gauges then widen into its slot so the row stays full
  const [promo, setPromo] = useState(true);
  const live = liveEvents(events);
  const upcoming = upcomingIncludingReview(events);
  const { places, unspecified, abroad } = groupByPlace(upcoming);
  const located = upcoming.length ? ((upcoming.length - unspecified - abroad) / upcoming.length) * 100 : 0;
  const crossChecked = live.length ? (live.filter((e) => e.sources.length >= 2).length / live.length) * 100 : 0;
  const avgConfidence = live.length ? live.reduce((s, e) => s + e.confidence, 0) / live.length : 0;
  const uptime = health && health.total ? (health.ok / health.total) * 100 : 0;
  const planned = live.filter((e) => Object.keys(e.workflow).length > 0).length;


  const inputs = KIND_ORDER.map((kind) => {
    const sources = health?.sources.filter((s) => s.kind === kind) ?? [];
    return { kind, label: g.kind[kind], count: sources.length, sources };
  }).filter((k) => k.count > 0);
  const o = g.flow.out;
  const outputs = [
    { key: "calendar", title: o.calendar, value: o.calendarV(live.length),
      icon: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></> },
    { key: "posts", title: o.posts, value: o.postsV(planned),
      icon: <><path d="M5 4h14v16l-7-4-7 4z" /></> },
    { key: "map", title: o.map, value: o.mapV(places.length),
      icon: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></> },
    { key: "trust", title: o.trust, value: o.trustV(Math.round(avgConfidence)),
      icon: <><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></> },
    { key: "alerts", title: o.alerts, value: o.alertsV(latestSequence ?? 0),
      icon: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></> },
    { key: "news", title: o.news, value: o.newsV(news.total),
      icon: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" /></> },
  ];

  return (
    <section aria-labelledby="gather-title">
      <h2 id="gather-title" tabIndex={-1} className="sr-only">{g.title}</h2>

      {/*
        ---- bento — 12 columns:
          row 1  the automation (12)
          row 2  4 trust gauges (9)  | API card (3)
      */}
      <div className="bento grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
        <div className="hud-panel bento-tile flex flex-col p-5 md:col-span-6 lg:col-span-12">
          <StageHead n={0} title={g.flowTitle} sub={g.flowSub} />
          <AutomationFlow inputs={inputs} steps={g.flow.steps} outputs={outputs} />

        </div>

        <div className={`grid grid-cols-2 gap-4 md:col-span-6 lg:grid-cols-4 ${promo ? "lg:col-span-9" : "lg:col-span-12"}`}>
          <Gauge value={uptime} label={g.gUptime} hint={health ? g.gUptimeHint(health.ok, health.total) : g.noHealth} />
          <Gauge value={avgConfidence} label={g.gConfidence} hint={g.gConfidenceHint} />
          <Gauge value={crossChecked} label={g.gCross} hint={g.gCrossHint} />
          <Gauge value={located} label={g.gVenue} hint={g.gVenueHint} />
        </div>

        {promo && <ApiPromoCard className="md:col-span-6 lg:col-span-3" onGone={() => setPromo(false)} />}
      </div>
    </section>
  );
}
