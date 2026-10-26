import { Link } from "react-router";
import type { Route } from "./+types/examples";
import { Callout } from "../../features/docs/components/Callout";
import { CodeBlock } from "../../features/docs/components/CodeBlock";
import { CodeTabs } from "../../features/docs/components/CodeTabs";
import { DocPage, H2, InlineCode } from "../../features/docs/components/DocPage";
import {
  CONSUME_CHANGES,
  FETCH_EVENTS,
  REACT_ROUTER_LOADER,
  SHEETS_FORMULA,
  WEBCAL_EVENTS,
  WEBCAL_POSTS,
} from "../../features/docs/examples";
import { useDocsI18n } from "../../features/docs/i18n";
import { langFromMatches } from "../../shared/i18n";

const COPY = {
  en: {
    metaTitle: "Code examples — Oman Events Radar API",
    title: "Code examples",
    lead: "Copy-paste examples. Every script on this page was run against the live API before it was published, and needs no extra packages.",
    fetch: "1. Fetch upcoming high-relevance events",
    fetchIntro: "The simplest integration: download the list and filter it.",
    website: "2. Show events on a website (React Router)",
    websiteIntro: (
      <>Fetch in a route <InlineCode>loader</InlineCode> so the request runs on your server. This is the pattern the{" "}
        <Link to="/" className="text-brand underline">demo pages of this site</Link> use.</>
    ),
    sync: "3. Keep an ERP or database in sync",
    syncSteps: [
      <>First run: import everything from <InlineCode>events.json</InlineCode> and store <InlineCode>latest_sequence</InlineCode> from <InlineCode>changes.json</InlineCode>.</>,
      <>Every day: apply the changes whose <InlineCode>sequence</InlineCode> is higher than the one you stored.</>,
      <>Make the apply step idempotent (key on <InlineCode>idempotency_key</InlineCode>), so re-running is safe.</>,
    ],
    syncNote: "— a second run right after prints the same sequence and applies nothing.",
    noCode: "4. No code",
    sheets: "Google Sheets",
    sheetsIntro: "Paste into cell A1 of an empty sheet. Google refreshes it about every hour.",
    formula: "Formula",
    calendars: "Google Calendar, Outlook, Apple Calendar",
    calendarsIntro: (
      <>Add a calendar "from URL" and paste one of these. <InlineCode>events.ics</InlineCode> holds the events, <InlineCode>posts.ics</InlineCode> the content-preparation steps.</>
    ),
    calendarUrls: "Calendar subscription URLs",
    excel: "Excel",
    excelIntro: <>Data → From Web → paste <InlineCode>https://maith98.github.io/oman-events-radar/events.csv</InlineCode>.</>,
    pushTitle: "Need push instead of pull?",
    push: <>See <Link to="/docs/webhooks" className="underline">Webhooks</Link> for signed real-time delivery of the same change entries.</>,
  },
  ar: {
    metaTitle: "أمثلة برمجية — واجهة رادار فعاليات عُمان",
    title: "أمثلة برمجية",
    lead: "أمثلة جاهزة للنسخ. شُغِّل كل نص برمجي في هذه الصفحة على الواجهة الحية قبل نشره، ولا يحتاج أي حزم إضافية.",
    fetch: "1. جلب الفعاليات القادمة عالية الأهمية",
    fetchIntro: "أبسط طريقة ربط: نزّل القائمة ثم صفِّها.",
    website: "2. عرض الفعاليات في موقع (React Router)",
    websiteIntro: (
      <>اجلب البيانات داخل <InlineCode>loader</InlineCode> للمسار حتى يُنفَّذ الطلب على خادمك. هذا هو النمط الذي تستخدمه{" "}
        <Link to="/" className="text-brand underline">صفحات العرض في هذا الموقع</Link>.</>
    ),
    sync: "3. إبقاء نظام تخطيط الموارد أو قاعدة البيانات متزامنًا",
    syncSteps: [
      <>التشغيل الأول: استورد كل شيء من <InlineCode>events.json</InlineCode> واحفظ <InlineCode>latest_sequence</InlineCode> من <InlineCode>changes.json</InlineCode>.</>,
      <>يوميًا: طبّق التغييرات التي رقم <InlineCode>sequence</InlineCode> فيها أعلى من الرقم المحفوظ لديك.</>,
      <>اجعل خطوة التطبيق آمنة للتكرار (اعتمد على <InlineCode>idempotency_key</InlineCode>) حتى تكون إعادة التشغيل آمنة.</>,
    ],
    syncNote: "— التشغيل الثاني مباشرة بعده يطبع رقم التسلسل نفسه ولا يطبّق شيئًا.",
    noCode: "4. دون برمجة",
    sheets: "جداول Google",
    sheetsIntro: "الصق الصيغة في الخلية A1 من ورقة فارغة. تحدّثها Google كل ساعة تقريبًا.",
    formula: "الصيغة",
    calendars: "تقويم Google وOutlook وApple",
    calendarsIntro: (
      <>أضف تقويمًا "من رابط" والصق أحد هذين الرابطين. <InlineCode>events.ics</InlineCode> يحوي الفعاليات، و<InlineCode>posts.ics</InlineCode> خطوات تحضير المحتوى.</>
    ),
    calendarUrls: "روابط الاشتراك في التقويم",
    excel: "Excel",
    excelIntro: <>البيانات ← من الويب ← الصق <InlineCode>https://maith98.github.io/oman-events-radar/events.csv</InlineCode>.</>,
    pushTitle: "تحتاج الدفع بدل السحب؟",
    push: <>راجع <Link to="/docs/webhooks" className="underline">الإشعارات الفورية</Link> لاستقبال مُدخلات التغيير نفسها فوريًا وموقّعة.</>,
  },
};

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: COPY[langFromMatches(matches)].metaTitle }];
}

export default function Examples() {
  const { d, lang } = useDocsI18n();
  const c = COPY[lang];
  return (
    <DocPage title={c.title} lead={c.lead}>
      <section aria-labelledby="fetch" className="space-y-3">
        <H2 id="fetch">{c.fetch}</H2>
        <p>{c.fetchIntro}</p>
        <CodeTabs snippets={FETCH_EVENTS} />
      </section>

      <section aria-labelledby="website" className="space-y-3">
        <H2 id="website">{c.website}</H2>
        <p>{c.websiteIntro}</p>
        <CodeBlock code={REACT_ROUTER_LOADER.code} language={REACT_ROUTER_LOADER.language} filename={REACT_ROUTER_LOADER.filename} />
      </section>

      <section aria-labelledby="sync" className="space-y-3">
        <H2 id="sync">{c.sync}</H2>
        <ol className="list-decimal space-y-1 ps-5">
          {c.syncSteps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        <CodeBlock code={CONSUME_CHANGES.code} language={CONSUME_CHANGES.language} filename={CONSUME_CHANGES.filename} />
        <p className="text-sm text-muted">
          {d.run} <InlineCode><bdi>{CONSUME_CHANGES.run}</bdi></InlineCode> {c.syncNote}
        </p>
      </section>

      <section aria-labelledby="no-code" className="space-y-4">
        <H2 id="no-code">{c.noCode}</H2>
        <div className="space-y-2">
          <h3 className="text-h3">{c.sheets}</h3>
          <p>{c.sheetsIntro}</p>
          <CodeBlock code={SHEETS_FORMULA} language="spreadsheet" filename={c.formula} />
        </div>
        <div className="space-y-2">
          <h3 className="text-h3">{c.calendars}</h3>
          <p>{c.calendarsIntro}</p>
          <CodeBlock code={`${WEBCAL_EVENTS}\n${WEBCAL_POSTS}`} language="url" filename={c.calendarUrls} />
        </div>
        <div className="space-y-2">
          <h3 className="text-h3">{c.excel}</h3>
          <p>{c.excelIntro}</p>
        </div>
      </section>

      <Callout title={c.pushTitle}>
        <p>{c.push}</p>
      </Callout>
    </DocPage>
  );
}
