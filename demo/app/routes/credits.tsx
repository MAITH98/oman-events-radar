import type { Route } from "./+types/credits";
import { fetchSourceHealth } from "../features/events/api";
import { SourceCredits } from "../features/events/components/SourceCredits";
import { dict, langFromMatches } from "../shared/i18n";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: dict(langFromMatches(matches)).credits.metaTitle }];
}

/** Credits page (opened from the footer): every source, the map, pictures, type and software. */
export async function loader({}: Route.LoaderArgs) {
  const health = await fetchSourceHealth(); // optional: the roll still shows the fixed credits without it
  return { sources: health?.sources.map(({ kind, name, site, events }) => ({ kind, name, site, events })) ?? [] };
}

export default function Credits({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <SourceCredits sources={loaderData.sources} />
    </div>
  );
}
