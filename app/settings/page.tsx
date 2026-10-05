import Link from "next/link";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/data";

export default async function SettingsPage() {
  const appSettings = await getSettings();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-600">Configuration</p>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/settings/products"><Button>Manage Products</Button></Link>
          <Link href="/settings/templates"><Button className="bg-violet-700 hover:bg-violet-600">Manage Templates</Button></Link>
        </div>
      </div>
      <SettingsForm settings={appSettings} />
    </div>
  );
}
