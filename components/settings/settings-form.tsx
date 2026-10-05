"use client";

import { useState, useTransition } from "react";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveAppSettings, type SettingsActionResult } from "@/lib/actions/settings";
import type { AppSettings } from "@/types/db";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [busy, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setResult(await saveAppSettings(formData)));
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Brand names</h2>
          <div className="space-y-4">
            <label className="block text-sm font-medium">Enterprise name
              <input name="enterprise_name" required maxLength={120} defaultValue={settings.brand.enterprise_name} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">MCN name
              <input name="mcn_name" required maxLength={120} defaultValue={settings.brand.mcn_name} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Commission</h2>
          <label className="block text-sm font-medium">Default commission rate
            <input name="default_rate" required maxLength={20} defaultValue={settings.commission.default_rate} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </Card>
      </div>
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Follow-up timing</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm font-medium">First follow-up (days)
            <input name="first" type="number" min={1} max={365} required defaultValue={settings.follow_up_days.first || 7} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">Second follow-up (days)
            <input name="second" type="number" min={1} max={365} required defaultValue={settings.follow_up_days.second || 30} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">Sample reminder 1 (days)
            <input name="sample_reminder_1" type="number" min={1} max={365} required defaultValue={settings.follow_up_days.sample_reminder_1 || 3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">Sample reminder 2 (days)
            <input name="sample_reminder_2" type="number" min={1} max={365} required defaultValue={settings.follow_up_days.sample_reminder_2 || 7} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
        <ActionFeedback result={result} />
      </div>
    </form>
  );
}
