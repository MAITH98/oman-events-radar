import type { Route } from "./+types/webhooks";
import { Callout } from "../../features/docs/components/Callout";
import { CodeBlock } from "../../features/docs/components/CodeBlock";
import { CodeTabs } from "../../features/docs/components/CodeTabs";
import { DocPage, H2, InlineCode } from "../../features/docs/components/DocPage";
import { EXPRESS_RECEIVER, VERIFY_WEBHOOK } from "../../features/docs/examples";
import { useDocsI18n } from "../../features/docs/i18n";
import { langFromMatches } from "../../shared/i18n";

const REQUEST = `POST /your/endpoint HTTP/1.1
Content-Type: application/json
User-Agent: OmanEventsRadar/0.2 (+https://github.com/MAITH98/oman-events-radar)
X-Radar-Timestamp: 1793065451
X-Radar-Signature: sha256=5d41402abc4b2a76b9719d911017c592…

{
  "schema_version": "1.0",
  "changes": [
    {
      "schema_version": "1.0",
      "sequence": 107,
      "type": "event.rescheduled",
      "occurred_at": "2026-10-26T03:04:11+00:00",
      "event_id": "769993e81dcd",
      "event_version": 2,
      "idempotency_key": "769993e81dcd:2:event.rescheduled",
      "event": { "id": "769993e81dcd", "start": "2027-02-08", "previous_start": "2027-02-01", … }
    }
  ]
}`;

const COPY = {
  en: {
    metaTitle: "Webhooks — Oman Events Radar API",
    title: "Webhooks",
    lead: "Get the day's changes pushed to your server instead of polling. Each delivery carries the same entries as changes.json, signed with a shared secret.",
    setup: "Set up",
    setupSteps: [
      <>Create an HTTPS endpoint on a public address that accepts <InlineCode>POST</InlineCode> with JSON.</>,
      <>Generate a long random secret (e.g. <InlineCode>openssl rand -hex 32</InlineCode>).</>,
      <>Self-hosting the radar: add <InlineCode>RADAR_WEBHOOK_URL</InlineCode> and <InlineCode>RADAR_WEBHOOK_SECRET</InlineCode> as GitHub Actions secrets of your fork. The public instance has no webhook configured — use changes.json there.</>,
    ],
    request: "The request",
    example: "Example delivery",
    signature: (
      <>Signature = hex HMAC-SHA256 of <InlineCode>{"<X-Radar-Timestamp>.<raw body>"}</InlineCode> using your secret, prefixed with <InlineCode>sha256=</InlineCode>.</>
    ),
    verify: "Verify every delivery",
    verifyIntro: (
      <>Compute the signature over the <strong>raw</strong> bytes before parsing JSON, compare in constant time, and reject timestamps older than 5 minutes (replay protection). Both functions below were tested against the radar's own signing code with valid, tampered and expired requests.</>
    ),
    receiver: "Complete receiver (Express)",
    delivery: "Delivery rules",
    deliveryItems: [
      <>One delivery per daily run, only when something changed.</>,
      <>Answer any <InlineCode>2xx</InlineCode> within 30 seconds. Do slow work after responding.</>,
      <>Up to 3 attempts (after 5 s and 10 s). After that the run gives up; the same entries stay in <InlineCode>changes.json</InlineCode> for 60 days.</>,
      <>Entries can arrive twice. Skip any <InlineCode>idempotency_key</InlineCode> you have already processed.</>,
    ],
    secretTitle: "Keep the secret secret",
    secret: "Store it in your server's secret manager, never in front-end code, a repository, logs or screenshots. Rotate it if it leaks.",
  },
  ar: {
    metaTitle: "الإشعارات الفورية — واجهة رادار فعاليات عُمان",
    title: "الإشعارات الفورية (Webhooks)",
    lead: "استقبل تغييرات اليوم على خادمك بدل الاستعلام الدوري. كل إرسال يحمل المُدخلات نفسها الموجودة في changes.json، موقّعة بسرٍّ مشترك.",
    setup: "الإعداد",
    setupSteps: [
      <>أنشئ نقطة استقبال HTTPS على عنوان عام تقبل <InlineCode>POST</InlineCode> بصيغة JSON.</>,
      <>ولّد سرًّا عشوائيًا طويلًا (مثلًا <InlineCode>openssl rand -hex 32</InlineCode>).</>,
      <>عند استضافة الرادار بنفسك: أضف <InlineCode>RADAR_WEBHOOK_URL</InlineCode> و<InlineCode>RADAR_WEBHOOK_SECRET</InlineCode> كأسرار في GitHub Actions لنسختك. النسخة العامة لا تُرسل إشعارات — استخدم changes.json معها.</>,
    ],
    request: "الطلب",
    example: "مثال على إرسال",
    signature: (
      <>التوقيع = قيمة HMAC-SHA256 بالنظام الست عشري لـ <InlineCode>{"<X-Radar-Timestamp>.<raw body>"}</InlineCode> باستخدام سرّك، مسبوقة بـ <InlineCode>sha256=</InlineCode>.</>
    ),
    verify: "تحقّق من كل إرسال",
    verifyIntro: (
      <>احسب التوقيع على البايتات <strong>الخام</strong> قبل تحليل JSON، وقارن بزمن ثابت، وارفض الطوابع الزمنية الأقدم من 5 دقائق (حماية من إعادة الإرسال). اختُبرت الدالتان أدناه مع شيفرة التوقيع الفعلية للرادار بطلبات صحيحة ومعدّلة ومنتهية.</>
    ),
    receiver: "مستقبِل كامل (Express)",
    delivery: "قواعد الإرسال",
    deliveryItems: [
      <>إرسال واحد لكل تشغيل يومي، فقط عند وجود تغيير.</>,
      <>أجب بأي رمز <InlineCode>2xx</InlineCode> خلال 30 ثانية، ونفّذ الأعمال البطيئة بعد الرد.</>,
      <>حتى 3 محاولات (بعد 5 ثوانٍ ثم 10). بعدها يتوقف التشغيل، وتبقى المُدخلات نفسها في <InlineCode>changes.json</InlineCode> لمدة 60 يومًا.</>,
      <>قد يصل المُدخل مرتين. تجاوز أي <InlineCode>idempotency_key</InlineCode> سبق أن عالجته.</>,
    ],
    secretTitle: "حافظ على سرية السر",
    secret: "احفظه في مدير الأسرار على خادمك، ولا تضعه أبدًا في شيفرة الواجهة أو المستودع أو السجلات أو لقطات الشاشة. غيّره فورًا إن تسرّب.",
  },
};

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: COPY[langFromMatches(matches)].metaTitle }];
}

export default function Webhooks() {
  const { d, lang } = useDocsI18n();
  const c = COPY[lang];
  return (
    <DocPage title={c.title} lead={c.lead}>
      <section aria-labelledby="setup" className="space-y-3">
        <H2 id="setup">{c.setup}</H2>
        <ol className="list-decimal space-y-1 ps-5">
          {c.setupSteps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </section>

      <section aria-labelledby="request" className="space-y-3">
        <H2 id="request">{c.request}</H2>
        <CodeBlock code={REQUEST} language="http" filename={c.example} />
        <p>{c.signature}</p>
      </section>

      <section aria-labelledby="verify" className="space-y-3">
        <H2 id="verify">{c.verify}</H2>
        <p>{c.verifyIntro}</p>
        <CodeTabs snippets={VERIFY_WEBHOOK} />
        <h3 className="pt-2 text-h3">{c.receiver}</h3>
        <CodeBlock code={EXPRESS_RECEIVER.code} language={EXPRESS_RECEIVER.language} filename={EXPRESS_RECEIVER.filename} />
        <p className="text-sm text-muted">
          {d.run} <InlineCode><bdi>{EXPRESS_RECEIVER.run}</bdi></InlineCode>
        </p>
      </section>

      <section aria-labelledby="delivery" className="space-y-3">
        <H2 id="delivery">{c.delivery}</H2>
        <ul className="list-disc space-y-1 ps-5">
          {c.deliveryItems.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </section>

      <Callout title={c.secretTitle} tone="warning">
        <p>{c.secret}</p>
      </Callout>
    </DocPage>
  );
}
