"use client";

import type { SettingsActionResult } from "@/lib/actions/settings";

export function ActionFeedback({ result }: { result: SettingsActionResult | null }) {
  if (!result?.error && !result?.success) return null;
  return (
    <p role={result.error ? "alert" : "status"} className={`text-sm ${result.error ? "text-red-700" : "text-emerald-700"}`}>
      {result.error ?? result.success}
    </p>
  );
}
