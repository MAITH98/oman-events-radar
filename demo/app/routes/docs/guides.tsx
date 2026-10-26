import type { Route } from "./+types/guides";
import { DocPage, H2, InlineCode } from "../../features/docs/components/DocPage";
import { useDocsI18n } from "../../features/docs/i18n";
import { langFromMatches } from "../../shared/i18n";

const COPY = {
  en: {
    metaTitle: "Guides & FAQ — Oman Events Radar API",
    title: "Guides & FAQ",
    lead: "How to use the API reliably, what to do when something fails, and common questions.",
    practices: "Best practices",
    practiceItems: [
      ["Call from your server", "Fetch in back-end code or a loader and cache the result, rather than from every visitor's browser."],
      ["Cache", "Data changes once a day. Cache for 5–60 minutes and send If-None-Match with the last ETag."],
      ["Set a timeout", "10 seconds is plenty. On failure, keep showing your last good copy."],
      ["Validate", "Check that start/end are YYYY-MM-DD and that arrays are arrays before using a record. Skip records that fail."],
      ["Escape text", "Titles and descriptions come from public websites. Never render them as HTML."],
      ["Filter by status", "Show Upcoming, Ongoing, Rescheduled, Cancelled and Occasion to users. Treat the rest as editorial."],
      ["Key on id", "Store id and version. Ignore a version lower than the one you have."],
      ["Attribute", "Link to the event's official url and mention \"Data: Oman Events Radar\"."],
    ],
    errors: "Handling errors",
    errorItems: [
      ["Network error or timeout", "Retry later with back-off; keep your cached copy."],
      ["404", "A mistyped path. The endpoints are listed on the Endpoints page."],
      ["Unexpected shape", "Check schema_version. Same major version = only additive changes; ignore unknown fields."],
      ["Gap in sequence numbers", "Normal if you missed days within the 60-day window. If your stored sequence is older than the oldest entry, re-sync from events.json."],
    ],
    versioning: "Versioning",
    versioningText: (
      <>Every payload carries <InlineCode>schema_version</InlineCode> (currently <InlineCode>1.0</InlineCode>). Minor versions only add fields. A new major version will be announced in the repository before the old format is retired.</>
    ),
    faq: "FAQ",
    faqItems: [
      ["Is it AI-generated?", "No. Fixed rules collect, de-duplicate, score and verify events. The rules are in the open-source repository."],
      ["Where does the data come from?", "Venue calendars (e.g. OCEC), organiser websites (e.g. CONNECT, Arabian Research Bureau/OITE), official event sites, aggregators, Omani newspapers and community submissions. robots.txt is respected; social networks are not scraped."],
      ["How do I add an event?", "Open the \"Add an event\" form on GitHub or comment the link on our LinkedIn post. A maintainer reviews it."],
      ["Is there a rate limit?", "No API keys or quotas. The files are served by GitHub Pages; normal caching keeps you well within its limits."],
      ["Can I self-host it?", "Yes. Fork the repository: it is Python standard library only and runs on GitHub Actions or any server with Python 3.10+."],
      ["Will fields change?", "Within schema 1.x fields are only added, never renamed or removed. Breaking changes will bump schema_version to 2.0."],
    ],
    support: "Support",
    supportA: "Questions, wrong data or a missing source:",
    supportLink: "open an issue on GitHub",
    supportB: ". Security reports: use GitHub's private \"Report a vulnerability\".",
  },
  ar: {
    metaTitle: "أدلة وأسئلة شائعة — واجهة رادار فعاليات عُمان",
    title: "أدلة وأسئلة شائعة",
    lead: "كيف تستخدم الواجهة بموثوقية، وماذا تفعل عند حدوث خطأ، وإجابات الأسئلة الشائعة.",
    practices: "أفضل الممارسات",
    practiceItems: [
      ["اطلبها من خادمك", "اجلب البيانات في شيفرة الخادم أو في loader واحفظ النتيجة مؤقتًا، بدل الطلب من متصفح كل زائر."],
      ["التخزين المؤقت", "تتغير البيانات مرة يوميًا. خزّنها من 5 إلى 60 دقيقة وأرسل If-None-Match مع آخر ETag."],
      ["حدّد مهلة", "10 ثوانٍ كافية. عند الفشل استمر في عرض آخر نسخة سليمة لديك."],
      ["تحقّق من البيانات", "تأكد أن start وend بصيغة YYYY-MM-DD وأن المصفوفات مصفوفات قبل استخدام السجل، وتجاوز السجلات غير السليمة."],
      ["اهرب النصوص", "العناوين والأوصاف مصدرها مواقع عامة. لا تعرضها أبدًا كـ HTML."],
      ["صفِّ حسب الحالة", "اعرض للمستخدمين Upcoming وOngoing وRescheduled وCancelled وOccasion، وتعامل مع البقية كمادة تحريرية."],
      ["اعتمد على id", "احفظ id وversion، وتجاهل أي إصدار أقل مما لديك."],
      ["انسب المصدر", "اربط بالصفحة الرسمية للفعالية واذكر \"البيانات: رادار فعاليات عُمان\"."],
    ],
    errors: "معالجة الأخطاء",
    errorItems: [
      ["خطأ في الشبكة أو انتهاء المهلة", "أعد المحاولة لاحقًا بفواصل متزايدة، واحتفظ بالنسخة المخزنة."],
      ["404", "خطأ في كتابة المسار. نقاط الوصول مدرجة في صفحة نقاط الوصول."],
      ["شكل غير متوقع", "تحقّق من schema_version. الإصدار الرئيسي نفسه = إضافات فقط؛ تجاهل الحقول غير المعروفة."],
      ["فجوة في أرقام التسلسل", "طبيعي إن فاتتك أيام ضمن نافذة الستين يومًا. إن كان رقمك المحفوظ أقدم من أقدم مُدخل فأعد المزامنة من events.json."],
    ],
    versioning: "الإصدارات",
    versioningText: (
      <>كل حمولة تحمل <InlineCode>schema_version</InlineCode> (حاليًا <InlineCode>1.0</InlineCode>). الإصدارات الفرعية تضيف حقولًا فقط، وسيُعلن عن أي إصدار رئيسي جديد في المستودع قبل إيقاف الصيغة القديمة.</>
    ),
    faq: "الأسئلة الشائعة",
    faqItems: [
      ["هل البيانات مولّدة بالذكاء الاصطناعي؟", "لا. قواعد ثابتة تجمع الفعاليات وتزيل التكرار وتقيّمها وتتحقق منها، والقواعد منشورة في المستودع مفتوح المصدر."],
      ["من أين تأتي البيانات؟", "من تقاويم الأماكن (مثل مركز عُمان للمؤتمرات والمعارض)، ومواقع الجهات المنظِّمة (مثل CONNECT والمكتب العربي للبحوث/OITE)، والمواقع الرسمية للفعاليات، ومواقع التجميع، والصحف العُمانية، ومساهمات المجتمع. يُحترم ملف robots.txt ولا تُجمع بيانات من شبكات التواصل."],
      ["كيف أضيف فعالية؟", "افتح نموذج \"Add an event\" على GitHub أو ضع الرابط في تعليق على منشورنا في LinkedIn، وسيراجعه أحد المشرفين."],
      ["هل يوجد حد للطلبات؟", "لا مفاتيح ولا حصص. الملفات تُخدَّم عبر GitHub Pages، والتخزين المؤقت المعتاد يبقيك ضمن حدودها بسهولة."],
      ["هل يمكنني استضافته بنفسي؟", "نعم. انسخ المستودع؛ فهو يعتمد على مكتبة Python القياسية فقط ويعمل على GitHub Actions أو أي خادم فيه Python 3.10 أو أحدث."],
      ["هل ستتغير الحقول؟", "ضمن المخطط 1.x تُضاف الحقول فقط ولا تُغيَّر أسماؤها أو تُحذف. أي تغيير جذري سيرفع schema_version إلى 2.0."],
    ],
    support: "الدعم",
    supportA: "للأسئلة أو البيانات الخاطئة أو مصدر ناقص:",
    supportLink: "افتح بلاغًا على GitHub",
    supportB: ". ولبلاغات الأمان: استخدم خيار \"Report a vulnerability\" الخاص في GitHub.",
  },
};

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: COPY[langFromMatches(matches)].metaTitle }];
}

export default function Guides() {
  const { lang } = useDocsI18n();
  const c = COPY[lang];
  return (
    <DocPage title={c.title} lead={c.lead}>
      <section aria-labelledby="practices" className="space-y-3">
        <H2 id="practices">{c.practices}</H2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {c.practiceItems.map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] p-4">
              <dt className="font-semibold">{k}</dt>
              <dd className="mt-1 text-sm text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="errors" className="space-y-3">
        <H2 id="errors">{c.errors}</H2>
        <dl className="rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] divide-y divide-line">
          {c.errorItems.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-1 p-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="font-medium">{k}</dt>
              <dd className="text-sm text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="versioning" className="space-y-3">
        <H2 id="versioning">{c.versioning}</H2>
        <p>{c.versioningText}</p>
      </section>

      <section aria-labelledby="faq" className="space-y-3">
        <H2 id="faq">{c.faq}</H2>
        <div className="space-y-2">
          {c.faqItems.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] p-4">
              <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-3 font-medium">
                {q}
                <span aria-hidden="true" className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="support" className="space-y-2">
        <H2 id="support">{c.support}</H2>
        <p>
          {c.supportA}{" "}
          <a href="https://github.com/MAITH98/oman-events-radar/issues" className="text-brand underline">{c.supportLink}</a>
          {c.supportB}
        </p>
      </section>
    </DocPage>
  );
}
