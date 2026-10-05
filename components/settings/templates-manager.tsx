"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { deleteTemplate, saveTemplate, type SettingsActionResult } from "@/lib/actions/settings";
import { CREATOR_CATEGORIES } from "@/lib/creators/constants";
import type { Template } from "@/types/db";

const emptyTemplate = {
  id: "",
  name: "",
  type: "Product Collaboration",
  category: "Other",
  channel: "WhatsApp",
  language: "EN",
  body: "",
  is_active: true,
};

function previewBody(body: string) {
  const examples: Record<string, string> = {
    creator_name: "Alicia",
    product_name: "Swiss Thomas",
    commission_rate: "7%",
    product_links: "Product 1: https://example.com/product",
    tracking_number: "TRK-123456",
  };
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (token, key: string) => examples[key] ?? token);
}

export function TemplatesManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(emptyTemplate);
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [busy, startTransition] = useTransition();

  function edit(template: Template) {
    setDraft({
      id: template.id,
      name: template.name ?? "",
      type: template.type || "Product Collaboration",
      category: template.category || "Other",
      channel: template.channel || "WhatsApp",
      language: template.language || "EN",
      body: template.body ?? "",
      is_active: template.is_active ?? true,
    });
    setResult(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", draft.id);
    formData.set("is_active", String(draft.is_active));
    startTransition(async () => {
      const response = await saveTemplate(formData);
      setResult(response);
      if (response.success) {
        setDraft(emptyTemplate);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this message template? This cannot be undone.")) return;
    startTransition(async () => {
      const response = await deleteTemplate(id);
      setResult(response);
      if (response.success) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <thead><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></thead>
              <tbody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.name}</TableCell><TableCell>{template.type}</TableCell><TableCell>{template.channel}</TableCell><TableCell>{template.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell><div className="flex gap-3"><button type="button" className="text-violet-700" onClick={() => edit(template)}>Edit</button><button type="button" className="text-red-600" onClick={() => remove(template.id)}>Delete</button></div></TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && <TableRow><TableCell colSpan={5}>No templates yet. Create one below.</TableCell></TableRow>}
              </tbody>
            </Table>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Live preview</h2>
          <div className="min-h-40 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {previewBody(draft.body) || "Your message preview will appear here as you type."}
          </div>
          <p className="mt-3 text-xs text-slate-500">Common placeholders are previewed with sample values.</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">{draft.id ? "Edit template" : "New template"}</h2>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm font-medium">Name
              <input name="name" required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">Type
              <select name="type" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                {["Product Collaboration", "MCN Invite", "Follow-up", "Sample"].map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Category
              <select name="category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                {CREATOR_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Channel
              <select name="channel" value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                {["WhatsApp", "TikTok DM", "Email"].map((channel) => <option key={channel}>{channel}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Language
              <input name="language" required maxLength={20} value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
              <input name="is_active" type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />
              Active template
            </label>
          </div>
          <label className="block text-sm font-medium">Message body
            <textarea name="body" required maxLength={40000} rows={12} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save template" : "Create template"}</Button>
            {draft.id && <Button type="button" className="bg-slate-600 hover:bg-slate-500" onClick={() => { setDraft(emptyTemplate); setResult(null); }}>Cancel edit</Button>}
            <ActionFeedback result={result} />
          </div>
        </form>
      </Card>
    </div>
  );
}
