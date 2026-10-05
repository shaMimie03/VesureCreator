"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { deleteProduct, saveProduct, type SettingsActionResult } from "@/lib/actions/settings";
import { CREATOR_CATEGORIES } from "@/lib/creators/constants";
import type { Product, ProductLink } from "@/types/db";

const emptyProduct = {
  id: "",
  name: "",
  category: "Other",
  description: "",
  commission_rate: "7%",
  is_active: true,
  links: [] as ProductLink[],
};

export function ProductsManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(emptyProduct);
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [busy, startTransition] = useTransition();

  function setField<K extends keyof typeof emptyProduct>(key: K, value: (typeof emptyProduct)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function edit(product: Product) {
    setDraft({
      id: product.id,
      name: product.name ?? "",
      category: product.category || "Other",
      description: product.description ?? "",
      commission_rate: product.commission_rate ?? "",
      is_active: product.is_active ?? true,
      links: (product.links ?? []).map((link) => ({ ...link })),
    });
    setResult(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", draft.id);
    formData.set("links", JSON.stringify(draft.links));
    formData.set("is_active", String(draft.is_active));
    startTransition(async () => {
      const response = await saveProduct(formData);
      setResult(response);
      if (response.success) {
        setDraft(emptyProduct);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    startTransition(async () => {
      const response = await deleteProduct(id);
      setResult(response);
      if (response.success) router.refresh();
    });
  }

  function moveLink(index: number, offset: number) {
    const destination = index + offset;
    if (destination < 0 || destination >= draft.links.length) return;
    const links = [...draft.links];
    [links[index], links[destination]] = [links[destination], links[index]];
    setField("links", links);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{draft.id ? "Edit product" : "Add product"}</h2>
          <p className="mt-1 text-sm text-slate-600">Manage product details and ordered affiliate links.</p>
        </div>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">Name
              <input name="name" required maxLength={120} value={draft.name} onChange={(event) => setField("name", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">Category
              <select name="category" value={draft.category} onChange={(event) => setField("category", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                {CREATOR_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Commission rate
              <input name="commission_rate" required maxLength={20} value={draft.commission_rate} onChange={(event) => setField("commission_rate", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
              <input name="is_active" type="checkbox" checked={draft.is_active} onChange={(event) => setField("is_active", event.target.checked)} />
              Active product
            </label>
            <label className="block text-sm font-medium md:col-span-2">Description
              <textarea name="description" maxLength={5000} rows={3} value={draft.description} onChange={(event) => setField("description", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Product links</h3>
              <Button type="button" className="bg-violet-700 hover:bg-violet-600" onClick={() => setField("links", [...draft.links, { label: "", url: "" }])}>Add link</Button>
            </div>
            {draft.links.map((link, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_2fr_auto]">
                <label className="text-sm font-medium">Label
                  <input aria-label={`Link ${index + 1} label`} value={link.label} onChange={(event) => setField("links", draft.links.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm font-medium">URL
                  <input aria-label={`Link ${index + 1} URL`} type="url" value={link.url} onChange={(event) => setField("links", draft.links.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <div className="flex items-end gap-1">
                  <Button type="button" aria-label={`Move link ${index + 1} up`} disabled={index === 0} onClick={() => moveLink(index, -1)} className="px-3">↑</Button>
                  <Button type="button" aria-label={`Move link ${index + 1} down`} disabled={index === draft.links.length - 1} onClick={() => moveLink(index, 1)} className="px-3">↓</Button>
                  <Button type="button" aria-label={`Remove link ${index + 1}`} onClick={() => setField("links", draft.links.filter((_, itemIndex) => itemIndex !== index))} className="bg-red-700 px-3 hover:bg-red-600">Remove</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save product" : "Create product"}</Button>
            {draft.id && <Button type="button" className="bg-slate-600 hover:bg-slate-500" onClick={() => { setDraft(emptyProduct); setResult(null); }}>Cancel edit</Button>}
            <ActionFeedback result={result} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <thead><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Commission</TableHead><TableHead>Links</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></thead>
            <tbody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell><TableCell>{product.category}</TableCell><TableCell>{product.commission_rate}</TableCell><TableCell>{product.links?.length ?? 0}</TableCell><TableCell>{product.is_active ? "Active" : "Inactive"}</TableCell>
                  <TableCell><div className="flex gap-3"><button type="button" className="text-violet-700" onClick={() => edit(product)}>Edit</button><button type="button" className="text-red-600" onClick={() => remove(product.id)}>Delete</button></div></TableCell>
                </TableRow>
              ))}
              {products.length === 0 && <TableRow><TableCell colSpan={6}>No products yet. Add one above.</TableCell></TableRow>}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
