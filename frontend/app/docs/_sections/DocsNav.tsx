const SECTIONS = [
  { id: "direction", label: "Design Direction" },
  { id: "color", label: "Color Tokens" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing & Elevation" },
  { id: "shell", label: "App Shell" },
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Form Controls" },
  { id: "cards", label: "Cards & Stats" },
  { id: "data", label: "Data Display" },
  { id: "overlays", label: "Overlays & Feedback" },
  { id: "navigation", label: "Navigation & Structure" },
  { id: "charts", label: "Charts" },
  { id: "composites", label: "Domain Composites" },
  { id: "icons", label: "Icons" },
];

export function DocsNav() {
  return (
    <nav className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-52 shrink-0 overflow-y-auto lg:block">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">On this page</p>
      <ul className="space-y-0.5 border-l border-paper-200">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block border-l-2 border-transparent py-1 pl-3 text-sm text-ink-500 transition-colors duration-150 hover:border-brand-300 hover:text-ink-700"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
