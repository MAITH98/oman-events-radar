import { useRevalidator } from "react-router";
import { useI18n } from "../../../shared/i18n";

export function ApiErrorState({ message }: { message: string }) {
  const { t } = useI18n();
  const revalidator = useRevalidator();
  const busy = revalidator.state === "loading";
  return (
    <div role="alert" className="hud-panel mx-auto max-w-xl p-6 text-center">
      <p className="font-semibold">{t.common.loadFailed}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={() => revalidator.revalidate()}
        disabled={busy}
        className="btn-primary mt-4 min-h-11 rounded-[var(--radius-control)] px-4 text-sm font-medium disabled:opacity-60"
      >
        {busy ? t.common.retrying : t.common.retry}
      </button>
    </div>
  );
}
