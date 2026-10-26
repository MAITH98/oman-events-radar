export function Callout({ title, children, tone = "info" }: { title: string; children: React.ReactNode; tone?: "info" | "warning" }) {
  const style = tone === "warning" ? "border-medium/40 bg-medium-bg" : "border-high/30 bg-high-bg";
  return (
    <aside className={`rounded-xl border p-4 text-sm ${style}`}>
      <p className="font-semibold text-ink">{title}</p>
      <div className="mt-1 space-y-2 text-ink/90">{children}</div>
    </aside>
  );
}
