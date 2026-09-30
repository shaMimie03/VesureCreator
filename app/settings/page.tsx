import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSettings } from "@/lib/data";

export default async function SettingsPage() {
  const appSettings = await getSettings();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600">Configuration</p>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <Link href="/settings/products">
          <Button>Manage Products</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Brand names</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Enterprise name</label>
              <input value={appSettings.brand.enterprise_name} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">MCN name</label>
              <input value={appSettings.brand.mcn_name} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Commission</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Default commission rate</label>
            <input value={appSettings.commission.default_rate} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Follow-up timing</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">First follow-up</label>
            <input value={appSettings.follow_up_days.first} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Second follow-up</label>
            <input value={appSettings.follow_up_days.second} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sample reminder 1</label>
            <input value={appSettings.follow_up_days.sample_reminder_1} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sample reminder 2</label>
            <input value={appSettings.follow_up_days.sample_reminder_2} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
          </div>
        </div>
      </Card>
    </div>
  );
}
