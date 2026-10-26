import { Outlet } from "react-router";
import { DocsNav } from "../../features/docs/components/DocsNav";

export default function DocsLayout() {
  return (
    // Home's language: the page list is a card (sticky from sm; a dropdown on phones), cards 16 px apart, on Home's edges
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="sm:hud-panel sm:sticky sm:top-28 sm:self-start sm:p-2">
        <DocsNav />
      </aside>
      <Outlet />
    </div>
  );
}
