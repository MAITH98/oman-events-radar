import { API_BASE } from "../events/api";
import type { Lang } from "../../shared/preferences";

export { API_BASE };

/** Text kept in both languages. Code, field names and URLs are never translated. */
export type L = Record<Lang, string>;

export const DOCS_PAGES = [
  { to: "/docs", label: { en: "Overview", ar: "نظرة عامة" } },
  { to: "/docs/endpoints", label: { en: "Endpoints", ar: "نقاط الوصول" } },
  { to: "/docs/data-model", label: { en: "Data model", ar: "نموذج البيانات" } },
  { to: "/docs/examples", label: { en: "Code examples", ar: "أمثلة برمجية" } },
  { to: "/docs/webhooks", label: { en: "Webhooks", ar: "الإشعارات الفورية" } },
  { to: "/docs/guides", label: { en: "Guides & FAQ", ar: "أدلة وأسئلة شائعة" } },
] as const;

export interface Endpoint {
  path: string;
  format: "JSON" | "CSV" | "iCalendar";
  summary: L;
  useFor: L;
  shape: string;
}

export const ENDPOINTS: Endpoint[] = [
  {
    path: "events.json",
    format: "JSON",
    summary: {
      en: "Every event record the radar knows: upcoming, past (2 years), review queue, expected editions, occasions and recent removals.",
      ar: "كل سجلات الفعاليات المعروفة للرادار: القادمة، والمنتهية (سنتان)، وقائمة المراجعة، والنسخ المتوقعة، والمناسبات، وما أُزيل مؤخرًا.",
    },
    useFor: { en: "Websites, apps, dashboards, a full ERP re-sync.", ar: "المواقع والتطبيقات ولوحات المتابعة وإعادة المزامنة الكاملة لنظام تخطيط الموارد." },
    shape: `{
  "schema_version": "1.0",
  "generated_at": "2026-10-25T11:11:14+00:00",
  "count": 82,
  "events": [ Event, … ]
}`,
  },
  {
    path: "changes.json",
    format: "JSON",
    summary: {
      en: "Ordered feed of what changed in the last 60 days, one entry per change with a global sequence number.",
      ar: "سجل مرتب بما تغيّر خلال آخر 60 يومًا، لكل تغيير مُدخل واحد برقم تسلسل عام.",
    },
    useFor: { en: "Keeping an ERP or database in sync without reloading everything.", ar: "إبقاء نظام تخطيط الموارد أو قاعدة البيانات متزامنًا دون إعادة تحميل كل شيء." },
    shape: `{
  "schema_version": "1.0",
  "latest_sequence": 106,
  "changes": [ Change, … ]
}`,
  },
  {
    path: "leads.json",
    format: "JSON",
    summary: {
      en: "Undated announcements from news feeds and items waiting for human review.",
      ar: "إعلانات بلا تاريخ من مصادر الأخبار، وعناصر بانتظار المراجعة البشرية.",
    },
    useFor: { en: "Editors who want to spot events early.", ar: "المحررون الذين يريدون اكتشاف الفعاليات مبكرًا." },
    shape: `{
  "generated_at": "…",
  "leads": [
    { "title": "…", "url": "https://…", "source": "news-en", "found": "2026-10-25",
      "start": "2027-02-08", "status": "Expected – confirm" }   // start/status only when known
  ]
}`,
  },
  {
    path: "news.json",
    format: "JSON",
    summary: {
      en: "Event-related stories from Omani newspapers (EN + AR). Each article is opened and read by rules: dates, venue and organiser found in the text are attached.",
      ar: "أخبار متعلقة بالفعاليات من الصحف العُمانية (عربي وإنجليزي). يُفتح كل مقال ويُقرأ بقواعد ثابتة، وتُرفق التواريخ والمكان والجهة المنظِّمة الموجودة في نصه.",
    },
    useFor: { en: "News tickers, editorial monitoring, early detection of events.", ar: "شرائط الأخبار والمتابعة التحريرية والاكتشاف المبكر للفعاليات." },
    shape: `{
  "generated_at": "…",
  "count": 37,
  "articles": [
    { "id": "…", "title": "…", "url": "https://…", "source": "Times of Oman", "lang": "en",
      "published": "2026-10-25", "summary": "…", "image": "https://…/picture.jpg",
      "event": { "start": "2026-11-12", "end": "2026-11-14", "venue": "OCEC", "organizer": "",
                 "matched_event_id": "1a2b3c4d5e6f" },
      "also": [ { "source": "Oman Observer", "url": "https://…", "title": "…" } ] }
  ]
}`,
  },
  {
    path: "watchlist.json",
    format: "JSON",
    summary: {
      en: "Health of every source, venue, organiser and auto-discovered website on the last run.",
      ar: "حالة كل مصدر ومكان وجهة منظِّمة وموقع اكتُشف تلقائيًا في آخر تشغيل.",
    },
    useFor: { en: "Monitoring and debugging coverage.", ar: "مراقبة التغطية وتشخيص مشكلاتها." },
    shape: `{
  "generated_at": "…",
  "entities": [
    { "entity": "venue:Oman Convention & Exhibition Centre (OCEC)", "type": "source",
      "events": 19, "status": "ok", "page_changed": "" },
    { "entity": "project-oman.com", "type": "discovered site", "events": 1,
      "status": "ok", "discovered_from": "Project Oman", "checked": "2026-10-25" }
  ]
}`,
  },
  {
    path: "events.csv",
    format: "CSV",
    summary: {
      en: "Spreadsheet export, UTF-8 with BOM. The first 13 columns match the team's events sheet; then category, region, workflow dates, confidence, hashtags, sources, first seen, previous start and id.",
      ar: "ملف جدول بيانات بترميز UTF-8. أول 13 عمودًا تطابق جدول فعاليات الفريق، تليها الفئة والمنطقة وتواريخ سير العمل ودرجة الثقة والوسوم والمصادر وتاريخ أول رصد والموعد السابق والمعرّف.",
    },
    useFor: { en: "Google Sheets, Excel, quick reporting.", ar: "جداول Google وExcel والتقارير السريعة." },
    shape: `START DATE,END DATE,EVENT,AVENUE,ORGANIZED BY,ORGANIZED FOR,WEBSITE,GENERAL INFO,
TICKET DEADLINE,TICKET PRICE,RELEVANCE,EVENT STATUS,CEO ATTENDANCE RECOMMENDATION,
CATEGORY,REGION,BRIEF,ANNOUNCE,DESIGN LOCK,REMINDER,LIVE,RECAP,CONFIDENCE,
SUGGESTED HASHTAGS,SOURCES,FIRST SEEN,PREVIOUS START,ID`,
  },
  {
    path: "events.ics",
    format: "iCalendar",
    summary: {
      en: "Calendar feed of confirmed events, cancellations and national occasions (all-day events).",
      ar: "تقويم للفعاليات المؤكدة والإلغاءات والمناسبات الوطنية (فعاليات طوال اليوم).",
    },
    useFor: { en: "Subscribing in Google Calendar, Outlook or Apple Calendar.", ar: "الاشتراك عبر تقويم Google أو Outlook أو Apple." },
    shape: `BEGIN:VEVENT
UID:769993e81dcd@oman-events-radar
DTSTART;VALUE=DATE:20270201
DTEND;VALUE=DATE:20270205
SUMMARY:COMEX – Global Technology Show 2027
…`,
  },
  {
    path: "posts.ics",
    format: "iCalendar",
    summary: {
      en: "The content plan: one all-day entry per preparation step (brief, announce, design lock, reminder, live, recap).",
      ar: "خطة المحتوى: مدخل لكل خطوة تحضير (الملخص، الإعلان، اعتماد التصميم، التذكير، التغطية المباشرة، الملخص الختامي).",
    },
    useFor: { en: "Marketing and social-media teams.", ar: "فرق التسويق ووسائل التواصل الاجتماعي." },
    shape: `SUMMARY:📝 Content brief due: COMEX – Global Technology Show 2027
SUMMARY:📣 Announce: COMEX – Global Technology Show 2027
…`,
  },
];

export interface Field {
  name: string;
  type: string;
  description: L;
}

export const EVENT_FIELDS: Field[] = [
  { name: "schema_version", type: "string", description: { en: "Contract version, currently \"1.0\". Breaking changes bump the major number.", ar: "إصدار العقد، حاليًا \"1.0\". التغييرات الجذرية ترفع الرقم الرئيسي." } },
  { name: "id", type: "string", description: { en: "Stable identifier. Survives spelling changes and rescheduling (up to 120 days). A new yearly edition gets a new id. Use it as your external key.", ar: "معرّف ثابت لا يتغير مع تصحيح الإملاء أو إعادة الجدولة (حتى 120 يومًا). النسخة السنوية الجديدة تأخذ معرّفًا جديدًا. استخدمه مفتاحًا خارجيًا." } },
  { name: "version", type: "integer", description: { en: "Increases by 1 whenever a tracked field changes.", ar: "يزيد بمقدار 1 كلما تغيّر حقل مُتتبَّع." } },
  { name: "kind", type: "\"event\" | \"expected\" | \"occasion\"", description: { en: "expected = predicted next edition (not confirmed); occasion = national day.", ar: "expected = نسخة قادمة متوقعة (غير مؤكدة)؛ occasion = مناسبة وطنية." } },
  { name: "title", type: "string", description: { en: "Event name as published by the best source.", ar: "اسم الفعالية كما نشره أفضل مصدر." } },
  { name: "start, end", type: "YYYY-MM-DD", description: { en: "Calendar days in Asia/Muscat. end is inclusive and equals start for one-day events.", ar: "أيام تقويمية بتوقيت مسقط. end شامل، ويساوي start في فعاليات اليوم الواحد." } },
  { name: "start_time, end_time", type: "HH:MM | \"\"", description: { en: "Local Muscat time (UTC+4) when the source publishes one; empty for all-day or unknown. UTC times are converted.", ar: "الوقت المحلي بتوقيت مسقط (UTC+4) حين ينشره المصدر؛ فارغ لفعاليات اليوم الكامل أو غير المعروفة. تُحوَّل الأوقات المنشورة بتوقيت UTC." } },
  { name: "previous_start", type: "YYYY-MM-DD | \"\"", description: { en: "Set when the event was rescheduled.", ar: "يُملأ عند إعادة جدولة الفعالية." } },
  { name: "venue, city", type: "string", description: { en: "Where it takes place. May be empty.", ar: "مكان الانعقاد. قد يكون فارغًا." } },
  { name: "region", type: "\"Oman\" | \"GCC\" | \"Other\" | \"Unknown\"", description: { en: "Geography, independent from relevance.", ar: "النطاق الجغرافي، مستقل عن الأهمية." } },
  { name: "organizer, organizer_url", type: "string", description: { en: "Organiser name and website when published.", ar: "اسم الجهة المنظِّمة وموقعها عند نشرهما." } },
  { name: "audience", type: "string", description: { en: "Who it is organised for (from the team sheet).", ar: "الفئة المستهدفة (من جدول الفريق)." } },
  { name: "url", type: "string", description: { en: "Official page. Treat as untrusted input: render only http(s) links.", ar: "الصفحة الرسمية. تعامل معها كمدخل غير موثوق: اعرض روابط http(s) فقط." } },
  { name: "description", type: "string", description: { en: "Plain text, up to ~400 characters.", ar: "نص عادي حتى نحو 400 حرف." } },
  { name: "ticket_deadline, ticket_price", type: "string", description: { en: "Free text, e.g. \"Free\", \"5 OMR\". Often empty.", ar: "نص حر مثل \"Free\" أو \"5 OMR\". غالبًا فارغ." } },
  { name: "category", type: "string", description: { en: "Tech & AI, Startups & SMEs, Fintech & Finance, Government & Vision 2040, Industry & Energy, Education & Careers, Health, Lifestyle & Culture, National occasion, General.", ar: "إحدى الفئات: Tech & AI، Startups & SMEs، Fintech & Finance، Government & Vision 2040، Industry & Energy، Education & Careers، Health، Lifestyle & Culture، National occasion، General (القيم بالإنجليزية دائمًا)." } },
  { name: "relevance, score", type: "\"High\" | \"Medium\" | \"Low\", integer", description: { en: "Business relevance from keyword rules (title words count double).", ar: "أهمية الأعمال وفق قواعد الكلمات المفتاحية (كلمات العنوان تُحسب مرتين)." } },
  { name: "confidence", type: "0–100", description: { en: "Best source tier (A 70, B 60, C 40, D 25) + 25 if an independent source agrees + 5 venue + 5 organiser.", ar: "أعلى فئة مصدر (A 70، B 60، C 40، D 25) + 25 إن أكّد مصدر مستقل + 5 للمكان + 5 للجهة المنظِّمة." } },
  { name: "status", type: "Status", description: { en: "Lifecycle state — see the table below.", ar: "حالة دورة الحياة — انظر الجدول أدناه." } },
  { name: "sources, tiers", type: "string[]", description: { en: "Which sources reported the event and their trust tiers.", ar: "المصادر التي رصدت الفعالية وفئات الثقة الخاصة بها." } },
  { name: "first_seen, last_seen", type: "YYYY-MM-DD", description: { en: "When the radar first and last saw the event.", ar: "أول وآخر مرة رصد فيها الرادار الفعالية." } },
  { name: "workflow", type: "{ step: date }", description: { en: "Content preparation dates: brief, announce, design_lock, reminder, live, recap (High); brief, announce, reminder (Medium); empty otherwise.", ar: "تواريخ تحضير المحتوى: brief وannounce وdesign_lock وreminder وlive وrecap (للأهمية العالية)؛ brief وannounce وreminder (للمتوسطة)؛ وفارغ لغير ذلك." } },
  { name: "hashtags", type: "string[]", description: { en: "Suggested hashtags in English and Arabic.", ar: "وسوم مقترحة بالعربية والإنجليزية." } },
];

export const STATUSES: Field[] = [
  { name: "Upcoming", type: "calendar", description: { en: "Confirmed (confidence ≥ 60) and in the future.", ar: "مؤكدة (الثقة ≥ 60) وفي المستقبل." } },
  { name: "Ongoing", type: "calendar", description: { en: "Started, not yet finished.", ar: "بدأت ولم تنتهِ بعد." } },
  { name: "Rescheduled", type: "calendar", description: { en: "Dates changed; see previous_start.", ar: "تغيّرت المواعيد؛ انظر previous_start." } },
  { name: "Cancelled", type: "calendar", description: { en: "The source marked it cancelled (schema.org eventStatus).", ar: "أعلن المصدر إلغاءها (schema.org eventStatus)." } },
  { name: "Occasion", type: "calendar", description: { en: "National day (fixed Gregorian date).", ar: "مناسبة وطنية (تاريخ ميلادي ثابت)." } },
  { name: "Needs review", type: "review", description: { en: "Confidence 40–59, usually a single aggregator source.", ar: "الثقة 40–59، غالبًا من مصدر تجميعي واحد." } },
  { name: "Lead – verify", type: "review", description: { en: "Confidence below 40: news or page-watch finding.", ar: "الثقة أقل من 40: مؤشر من الأخبار أو مراقبة الصفحات." } },
  { name: "Expected – confirm", type: "review", description: { en: "Predicted next edition, 364 days after the last one.", ar: "نسخة قادمة متوقعة بعد 364 يومًا من السابقة." } },
  { name: "Past", type: "archive", description: { en: "Finished.", ar: "انتهت." } },
  { name: "Removed", type: "archive", description: { en: "Tombstone: vanished while its sources were healthy. Kept 30 days.", ar: "شاهد حذف: اختفت رغم سلامة مصادرها. تُحفظ 30 يومًا." } },
];

export const CHANGE_FIELDS: Field[] = [
  { name: "sequence", type: "integer", description: { en: "Global, strictly increasing. Store the highest one you applied.", ar: "رقم عام متزايد دائمًا. احفظ أعلى رقم طبّقته." } },
  { name: "type", type: "string", description: { en: "event.created · event.updated · event.rescheduled · event.cancelled · event.removed", ar: "event.created · event.updated · event.rescheduled · event.cancelled · event.removed" } },
  { name: "occurred_at", type: "ISO datetime", description: { en: "When the radar detected the change (UTC).", ar: "وقت رصد الرادار للتغيير (UTC)." } },
  { name: "event_id, event_version", type: "string, integer", description: { en: "Which event and which version this change produced.", ar: "الفعالية والإصدار الناتجان عن هذا التغيير." } },
  { name: "idempotency_key", type: "string", description: { en: "event_id:version:type — unique per change. Applying it twice must be a no-op.", ar: "event_id:version:type — فريد لكل تغيير. تطبيقه مرتين يجب ألا يُحدث أثرًا." } },
  { name: "event", type: "Event", description: { en: "The full event record after the change.", ar: "سجل الفعالية الكامل بعد التغيير." } },
];
