import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
        MCN & Affiliate Ops
      </div>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900">
        Creator tracking and outreach workflow built for TikTok growth teams.
      </h1>
      <p className="max-w-xl text-lg text-slate-600">
        Manage outreach, follow-ups, product assignments, and creator activity from one place.
      </p>
      <div className="flex gap-4">
        <Link href="/login">
          <Button>Go to Login</Button>
        </Link>
        <Link href="/dashboard">
          <Button className="bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100">
            View Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
