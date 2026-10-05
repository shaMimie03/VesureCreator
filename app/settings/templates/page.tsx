import Link from "next/link";
import { TemplatesManager } from "@/components/settings/templates-manager";
import { Button } from "@/components/ui/button";
import { getTemplates } from "@/lib/data";

export default async function TemplatesSettingsPage() {
  const templates = await getTemplates();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-600">Templates</p>
          <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
        </div>
        <Link href="/settings"><Button className="bg-slate-600 hover:bg-slate-500">Back to Settings</Button></Link>
      </div>
      <TemplatesManager templates={templates} />
    </div>
  );
}
