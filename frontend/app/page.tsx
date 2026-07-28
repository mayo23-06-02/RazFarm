import Link from "next/link";
import { TbArrowRight, TbLeaf } from "react-icons/tb";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-paper-50 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-card bg-brand-500 text-white shadow-card">
        <TbLeaf className="size-7" />
      </span>
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Cane &amp; Ledger</h1>
        <p className="mt-2 max-w-md text-sm text-ink-500">
          Sugarcane Farm Management System — design system and component library.
        </p>
      </div>
      <Link
        href="/docs"
        className="inline-flex h-11 items-center gap-2 rounded-ctrl bg-brand-500 px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-400"
      >
        View component library
        <TbArrowRight className="size-4" />
      </Link>
    </div>
  );
}
