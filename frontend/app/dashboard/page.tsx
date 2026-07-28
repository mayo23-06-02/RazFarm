import Link from "next/link";
import { TbCircleCheck } from "react-icons/tb";

// TODO: replace with the real dashboard (Module G). This stub only exists
// so the auth flows have somewhere to redirect to end-to-end.
export default function DashboardStubPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-50 px-6 text-center">
      <TbCircleCheck className="size-10 text-field-500" />
      <h1 className="font-display text-2xl font-bold text-ink-900">You&apos;re signed in</h1>
      <p className="max-w-sm text-sm text-ink-500">
        This is a placeholder dashboard. The real dashboard ships in a later pass.
      </p>
      <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to sign in
      </Link>
    </div>
  );
}
