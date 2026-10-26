import type { Route } from "./+types/data-model";
import { Callout } from "../../features/docs/components/Callout";
import { CodeBlock } from "../../features/docs/components/CodeBlock";
import { DocPage, H2, InlineCode } from "../../features/docs/components/DocPage";
import { FieldTable } from "../../features/docs/components/FieldTable";
import { useDocsI18n } from "../../features/docs/i18n";
import { CHANGE_FIELDS, EVENT_FIELDS, STATUSES } from "../../features/docs/reference";
import { langFromMatches } from "../../shared/i18n";

const SAMPLE = `{
  "schema_version": "1.0",
  "id": "769993e81dcd",
  "version": 1,
  "kind": "event",
  "title": "COMEX – Global Technology Show 2027",
  "start": "2027-02-01",
  "end": "2027-02-04",
  "start_time": "10:00",
  "end_time": "18:00",
  "previous_start": "",
  "venue": "Oman Convention & Exhibition Centre (OCEC)",
  "city": "Muscat",
  "region": "Oman",
  "organizer": "OITE (Oman International Trade & Exhibitions)",
  "organizer_url": "https://comex-global.com/",
  "url": "https://www.comex-global.com",
  "category": "Tech & AI",
  "relevance": "High",
  "score": 18,
  "confidence": 100,
  "status": "Upcoming",
  "sources": ["allevents-muscat", "organiser:Arabian Research Bureau / OITE",
              "venue:Oman Convention & Exhibition Centre (OCEC)"],
  "tiers": ["A", "C"],
  "first_seen": "2026-10-25",
  "workflow": {
    "brief": "2027-01-11", "announce": "2027-01-18", "design_lock": "2027-01-25",
    "reminder": "2027-01-29", "live": "2027-02-01", "recap": "2027-02-05"
  },
  "hashtags": ["#Oman", "#OmanEvents", "#OmanTech", "#DigitalOman"]
}`;

const COPY = {
  en: {
    metaTitle: "Data model — Oman Events Radar API",
    title: "Data model",
    lead: "One record shape for every event, plus a change entry that wraps it. Field names are stable within schema version 1.x.",
    event: "Event",
    sampleCaption: "Example: one record from events.json (description trimmed)",
    eventFields: "Event fields",
    statuses: "Statuses",
    statusesIntro: (
      <>Show <strong>calendar</strong> statuses to end users; route <strong>review</strong> statuses to an editor; keep <strong>archive</strong> statuses for history.</>
    ),
    statusCaption: "Event statuses",
    change: "Change entry",
    changeCaption: "Change entry fields",
    ids: "Identity and versions",
    idItems: [
      <><InlineCode>id</InlineCode> never changes for the same event, even if it is rescheduled or its title is corrected.</>,
      <>Next year's edition is a different event with a new <InlineCode>id</InlineCode>.</>,
      <><InlineCode>version</InlineCode> only increases. If you receive a lower version than you have, ignore it.</>,
      <>Removed events stay in the feed for 30 days with <InlineCode>status: "Removed"</InlineCode> so you can deactivate them.</>,
    ],
    warnTitle: "Treat text fields as untrusted",
    warn: (
      <>Titles, descriptions and URLs come from public websites. Escape them when rendering, never insert them as HTML, and only link <InlineCode>http(s)</InlineCode> URLs.</>
    ),
  },
  ar: {
    metaTitle: "نموذج البيانات — واجهة رادار فعاليات عُمان",
    title: "نموذج البيانات",
    lead: "شكل سجل واحد لكل الفعاليات، ومُدخل تغيير يحتويه. أسماء الحقول ثابتة ضمن الإصدار 1.x من المخطط.",
    event: "الفعالية",
    sampleCaption: "مثال: سجل واحد من events.json (الوصف مختصر)",
    eventFields: "حقول الفعالية",
    statuses: "الحالات",
    statusesIntro: (
      <>اعرض حالات <strong>التقويم</strong> للمستخدمين، ووجّه حالات <strong>المراجعة</strong> إلى محرر، واحتفظ بحالات <strong>الأرشيف</strong> للسجل.</>
    ),
    statusCaption: "حالات الفعالية",
    change: "مُدخل التغيير",
    changeCaption: "حقول مُدخل التغيير",
    ids: "المعرّف والإصدارات",
    idItems: [
      <>لا يتغير <InlineCode>id</InlineCode> للفعالية نفسها حتى لو أُعيدت جدولتها أو صُحِّح عنوانها.</>,
      <>نسخة العام القادم فعالية مختلفة بمعرّف <InlineCode>id</InlineCode> جديد.</>,
      <>قيمة <InlineCode>version</InlineCode> تزيد فقط. إن وصلك إصدار أقل مما لديك فتجاهله.</>,
      <>تبقى الفعاليات المُزالة في السجل 30 يومًا بالحالة <InlineCode>status: "Removed"</InlineCode> لتتمكن من إيقافها لديك.</>,
    ],
    warnTitle: "تعامل مع الحقول النصية كمدخلات غير موثوقة",
    warn: (
      <>العناوين والأوصاف والروابط مصدرها مواقع عامة. اهرب محارفها عند العرض، ولا تُدرجها كـ HTML، واربط روابط <InlineCode>http(s)</InlineCode> فقط.</>
    ),
  },
};

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: COPY[langFromMatches(matches)].metaTitle }];
}

export default function DataModel() {
  const { d, lang } = useDocsI18n();
  const c = COPY[lang];
  return (
    <DocPage title={c.title} lead={c.lead}>
      <section aria-labelledby="event" className="space-y-3">
        <H2 id="event">{c.event}</H2>
        <CodeBlock code={SAMPLE} language="json" filename={c.sampleCaption} />
        <FieldTable fields={EVENT_FIELDS} caption={c.eventFields} />
      </section>

      <section aria-labelledby="statuses" className="space-y-3">
        <H2 id="statuses">{c.statuses}</H2>
        <p>{c.statusesIntro}</p>
        <FieldTable fields={STATUSES} caption={c.statusCaption} typeHeader={d.group} />
      </section>

      <section aria-labelledby="change" className="space-y-3">
        <H2 id="change">{c.change}</H2>
        <FieldTable fields={CHANGE_FIELDS} caption={c.changeCaption} />
      </section>

      <section aria-labelledby="ids" className="space-y-3">
        <H2 id="ids">{c.ids}</H2>
        <ul className="list-disc space-y-1 ps-5">
          {c.idItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>

      <Callout title={c.warnTitle} tone="warning">
        <p>{c.warn}</p>
      </Callout>
    </DocPage>
  );
}
