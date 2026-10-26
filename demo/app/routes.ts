import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("search", "routes/search.tsx"),
  route("credits", "routes/credits.tsx"),
  route("media/preview", "routes/media.preview.ts"),
  route("media/logo", "routes/media.logo.ts"),
  route("calendar", "routes/calendar.tsx"),
  route("events/:id", "routes/event.tsx"),
  route("changes", "routes/changes.tsx"),
  route("news", "routes/news.tsx"),
  route("prefs", "routes/prefs.ts"),
  route("docs", "routes/docs/layout.tsx", [
    index("routes/docs/overview.tsx"),
    route("endpoints", "routes/docs/endpoints.tsx"),
    route("data-model", "routes/docs/data-model.tsx"),
    route("examples", "routes/docs/examples.tsx"),
    route("webhooks", "routes/docs/webhooks.tsx"),
    route("guides", "routes/docs/guides.tsx"),
  ]),
] satisfies RouteConfig;
