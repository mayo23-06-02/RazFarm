import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { DocsNav } from "./_sections/DocsNav";
import { DirectionSection, ColorSection, TypographySection, SpacingSection, AppShellSection } from "./_sections/FoundationsSections";
import { ButtonsSection } from "./_sections/ButtonsSection";
import { FormControlsSection } from "./_sections/FormControlsSection";
import { CardsStatsSection } from "./_sections/CardsStatsSection";
import { DataDisplaySection } from "./_sections/DataDisplaySection";
import { OverlaysSection } from "./_sections/OverlaysSection";
import { NavigationSection } from "./_sections/NavigationSection";
import { ChartsSection } from "./_sections/ChartsSection";
import { CompositesSection } from "./_sections/CompositesSection";
import { IconsSection } from "./_sections/IconsSection";

export const metadata: Metadata = {
  title: "Component Library — RazFarm",
  description: "Living style guide for the Sugarcane FMS design system.",
};

export default function DocsPage() {
  return (
    <ToastProvider>
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-2 border-b border-paper-200 pb-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            design.md · v1.0
          </span>
          <h1 className="font-display text-[32px] font-bold text-ink-900">RazFarm — Component Library</h1>
          <p className="max-w-2xl text-sm text-ink-500">
            The full FMS design system rendered as a living style guide: every token and primitive from{" "}
            <code className="rounded bg-paper-100 px-1.5 py-0.5 font-mono text-xs text-ink-700">design.md</code>, plus
            the domain composites built on top of them for the sugarcane grower association platform.
          </p>
        </header>

        <div className="flex gap-10">
          <DocsNav />
          <main className="min-w-0 flex-1 space-y-10">
            <DirectionSection />
            <ColorSection />
            <TypographySection />
            <SpacingSection />
            <AppShellSection />
            <ButtonsSection />
            <FormControlsSection />
            <CardsStatsSection />
            <DataDisplaySection />
            <OverlaysSection />
            <NavigationSection />
            <ChartsSection />
            <CompositesSection />
            <IconsSection />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
