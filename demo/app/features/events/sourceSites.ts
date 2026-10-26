/**
 * The website behind each radar source (keyed by the source id in watchlist.json, without its "#2"-style suffix).
 * Domains come from the radar's own configuration and code (the sites it actually reads). Used to show each
 * source's logo; this list is also the allowlist for /media/logo — no other site is ever fetched for a logo.
 * Sources without a website (the team sheet, community submissions) show their initials instead.
 */
export const SOURCE_SITES: Record<string, string> = {
  "allevents-muscat": "allevents.in",
  "eventbrite-muscat": "www.eventbrite.com",
  "Oman Convention & Exhibition Centre (OCEC)": "ocec.om",
  "CONNECT (Sabco Group)": "www.connectthroughus.com",
  "Arabian Research Bureau / OITE": "www.comex-global.com",
  "Al Nimr Expo": "www.alnimrexpo.com",
  "Oman Expo": "www.omanexpo.com",
  "Ministry of Transport, Communications and IT": "www.mtcit.gov.om",
  "omanlegalsummit.com": "omanlegalsummit.com",
  "project-oman.com": "project-oman.com",
  timesofoman: "www.timesofoman.com",
  "observer-local": "www.omanobserver.om",
  "observer-business": "www.omanobserver.om",
  "observer-lifestyle": "www.omanobserver.om",
  alroya: "alroya.om",
  omandaily: "www.omandaily.om",
};

const ALLOWED = new Set(Object.values(SOURCE_SITES));

/** The domain if it belongs to a known source, else null (the logo endpoint's input check). */
export function knownSourceSite(domain: string | null): string | null {
  return domain && ALLOWED.has(domain) ? domain : null;
}
