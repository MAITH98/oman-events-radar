import { Form } from "react-router";
import { SuggestInput, type Suggestion, type SuggestLabels } from "./SuggestInput";

/** Large rounded search field with an inline action and live suggestions. Submits ?q= to `action`. */
export function SearchPill({
  action,
  label,
  placeholder,
  button,
  defaultValue = "",
  suggestions,
  suggestLabels,
}: {
  action: string;
  label: string;
  placeholder: string;
  button: string;
  defaultValue?: string;
  suggestions: Suggestion[];
  suggestLabels: SuggestLabels;
}) {
  return (
    <Form method="get" action={action} role="search" className="w-full">
      <label className="sr-only" htmlFor="hero-search">{label}</label>
      <div className="neu-inset relative flex items-center gap-2 rounded-full p-1.5">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="ms-3 hidden h-5 w-5 shrink-0 text-muted sm:block" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <SuggestInput
          id="hero-search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          suggestions={suggestions}
          labels={suggestLabels}
          className="min-h-11 min-w-0 flex-1 bg-transparent ps-3 text-base text-ink outline-none placeholder:text-muted sm:ps-0"
        />
        <button type="submit" className="btn-primary min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold sm:px-5">
          {button}
        </button>
      </div>
    </Form>
  );
}
