import { useI18n } from "../../../shared/i18n";
import type { EventStatus, Relevance } from "../types";

const RELEVANCE_STYLE: Record<Relevance, string> = {
  High: "bg-high-bg text-high",
  Medium: "bg-medium-bg text-medium",
  Low: "bg-low-bg text-low",
};

const FLAGGED: EventStatus[] = ["Needs review", "Lead – verify", "Expected – confirm", "Cancelled", "Rescheduled", "Removed"];

export function Badge({ children, className = "bg-low-bg text-low" }: { children: React.ReactNode; className?: string }) {
  // min-w-0 + inner truncate: in a single-line row a long label shortens with … instead of wrapping
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function RelevanceBadge({ relevance }: { relevance: Relevance }) {
  const { t } = useI18n();
  return <Badge className={RELEVANCE_STYLE[relevance]}>{t.relevanceBadge(t.relevance[relevance] ?? relevance)}</Badge>;
}

export function CategoryBadge({ category }: { category: string }) {
  const { t } = useI18n();
  return <Badge>{t.category[category] ?? category}</Badge>;
}

/** Shown only for statuses the team must notice; normal upcoming events need no badge. */
export function StatusBadge({ status }: { status: EventStatus }) {
  const { t } = useI18n();
  if (!FLAGGED.includes(status)) return null;
  return <Badge className="bg-alert-bg text-alert">{t.status[status] ?? status}</Badge>;
}
