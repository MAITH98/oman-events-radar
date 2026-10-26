import { Form, useSubmit } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { SuggestInput, type Suggestion } from "../../../shared/ui/SuggestInput";
import { VIEWS, type EventFilters } from "../filters";

const field = "flex flex-col gap-1 text-sm text-muted";
const control = "neu-inset min-h-11 w-full rounded-[var(--radius-control)] px-3 text-base text-ink sm:text-sm";

/**
 * Filters live in the URL (shareable, back-button friendly). Selects submit on change;
 * the search box submits on Enter or with the button. Every option set is a dropdown,
 * so nothing scrolls sideways on phones.
 */
export function EventFiltersBar({ filters, categories, keep = {}, suggestions }: { filters: EventFilters; categories: string[]; keep?: Record<string, string>; suggestions: Suggestion[] }) {
  const { t } = useI18n();
  const submit = useSubmit();
  const onSelect = (e: React.ChangeEvent<HTMLSelectElement>) => submit(e.currentTarget.form, { replace: true });

  return (
    <Form method="get" role="search" className="hud-panel relative z-20 grid grid-cols-1 gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_1fr] sm:items-end sm:p-5">
      {/* other URL state (e.g. the calendar month) survives a filter change */}
      {Object.entries(keep).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <div className={field}>
        <label htmlFor="calendar-search">{t.filters.search}</label>
        {/* relative: the suggestion list spans the field and its button */}
        <span className="relative flex gap-2">
          <SuggestInput id="calendar-search" name="q" defaultValue={filters.q} placeholder={t.filters.placeholder}
            suggestions={suggestions} labels={t.suggest} className={control} />
          <button type="submit" className="btn-primary min-h-11 shrink-0 rounded-[var(--radius-control)] px-4 text-sm font-medium">
            {t.filters.searchButton}
          </button>
        </span>
      </div>
      <label className={field}>
        {t.filters.show}
        <select name="view" defaultValue={filters.view} onChange={onSelect} className={control}>
          {Object.keys(VIEWS).map((value) => (
            <option key={value} value={value}>
              {t.filters.views[value]}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        {t.filters.relevance}
        <select name="relevance" defaultValue={filters.relevance} onChange={onSelect} className={control}>
          <option value="">{t.filters.all}</option>
          {(["High", "Medium", "Low"] as const).map((r) => (
            <option key={r} value={r}>
              {t.relevance[r]}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        {t.filters.category}
        <select name="category" defaultValue={filters.category} onChange={onSelect} className={control}>
          <option value="">{t.filters.all}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {t.category[c] ?? c}
            </option>
          ))}
        </select>
      </label>
    </Form>
  );
}
