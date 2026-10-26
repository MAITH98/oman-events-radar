import type { Route } from "./+types/endpoints";
import { Badge } from "../../features/events/components/Badges";
import { CodeBlock } from "../../features/docs/components/CodeBlock";
import { DocPage, H2, InlineCode } from "../../features/docs/components/DocPage";
import { useDocsI18n } from "../../features/docs/i18n";
import { API_BASE, ENDPOINTS } from "../../features/docs/reference";
import { langFromMatches } from "../../shared/i18n";

const COPY = {
  en: {
    metaTitle: "Endpoints — Oman Events Radar API",
    title: "Endpoints",
    lead: (
      <>
        All endpoints are static files under the base URL, answered with <InlineCode>GET</InlineCode>. They are regenerated together once a
        day, so they are always consistent with each other.
      </>
    ),
    shape: "Response shape",
    http: "HTTP behaviour",
    httpItems: [
      <><InlineCode>200</InlineCode> with the file. There are no query parameters: filter on your side.</>,
      <><InlineCode>404</InlineCode> only for a mistyped path.</>,
      <>Served by GitHub Pages over HTTPS with <InlineCode>Access-Control-Allow-Origin: *</InlineCode> and ETags (use conditional requests to save bandwidth).</>,
      <>Size: events.json is about 90 KB today.</>,
    ],
  },
  ar: {
    metaTitle: "نقاط الوصول — واجهة رادار فعاليات عُمان",
    title: "نقاط الوصول",
    lead: (
      <>
        كل نقاط الوصول ملفات ثابتة تحت عنوان الأساس وتُطلب بـ <InlineCode>GET</InlineCode>. تُعاد كتابتها معًا مرة يوميًا، لذا تبقى متسقة
        فيما بينها دائمًا.
      </>
    ),
    shape: "شكل الاستجابة",
    http: "سلوك HTTP",
    httpItems: [
      <>الرمز <InlineCode>200</InlineCode> مع الملف. لا توجد معاملات استعلام: صفِّ البيانات لديك.</>,
      <>الرمز <InlineCode>404</InlineCode> فقط عند الخطأ في كتابة المسار.</>,
      <>تُخدَّم عبر GitHub Pages بـ HTTPS مع <InlineCode>Access-Control-Allow-Origin: *</InlineCode> وقيم ETag (استخدم الطلبات المشروطة لتوفير البيانات).</>,
      <>الحجم: ملف events.json نحو 90 كيلوبايت حاليًا.</>,
    ],
  },
};

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: COPY[langFromMatches(matches)].metaTitle }];
}

export default function Endpoints() {
  const { d, lang } = useDocsI18n();
  const c = COPY[lang];
  return (
    <DocPage title={c.title} lead={c.lead}>
      <nav aria-label={d.onThisPage} className="hud-panel p-4 text-sm">
        <p className="mb-2 font-semibold">{d.onThisPage}</p>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {ENDPOINTS.map((e) => (
            <li key={e.path}>
              <a href={`#${e.path.replace(".", "-")}`} className="inline-flex min-h-8 items-center font-mono text-brand underline-offset-4 hover:underline" dir="ltr">
                /{e.path}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {ENDPOINTS.map((e) => (
        <section key={e.path} aria-labelledby={e.path.replace(".", "-")} className="space-y-3">
          <H2 id={e.path.replace(".", "-")}>
            <span className="font-mono" dir="ltr">/{e.path}</span>
          </H2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-high-bg text-high">GET</Badge>
            <Badge>{e.format}</Badge>
            <a href={`${API_BASE}/${e.path}`} target="_blank" rel="noopener noreferrer" dir="ltr"
              className="inline-flex min-h-6 items-center font-mono text-xs text-brand underline [overflow-wrap:anywhere]">
              {API_BASE}/{e.path} ↗
            </a>
          </div>
          <p>{e.summary[lang]}</p>
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">{d.useFor}</span> {e.useFor[lang]}
          </p>
          <CodeBlock code={e.shape} language={e.format.toLowerCase()} filename={c.shape} />
        </section>
      ))}

      <section aria-labelledby="http" className="space-y-3">
        <H2 id="http">{c.http}</H2>
        <ul className="list-disc space-y-1 ps-5">
          {c.httpItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>
    </DocPage>
  );
}
