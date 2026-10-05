"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createCreator, type CreatorActionState } from "@/lib/actions/creators";
import { CREATOR_CATEGORIES, CREATOR_SOURCES, CREATOR_STATUSES } from "@/lib/creators/constants";
import type { Product } from "@/types/db";

const initialState: CreatorActionState = {};
const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2";

export function CreatorForm({ products }: { products: Product[] }) {
  const [state, action, pending] = useActionState(createCreator, initialState);

  return (
    <Card className="p-6">
      <form action={action} className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="creator-name" className="mb-1 block text-sm font-medium">Creator name *</label>
          <input id="creator-name" name="creator_name" required maxLength={120} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-handle" className="mb-1 block text-sm font-medium">TikTok handle *</label>
          <input id="creator-handle" name="tiktok_handle" required maxLength={25} placeholder="@handle" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-whatsapp" className="mb-1 block text-sm font-medium">WhatsApp number</label>
          <input id="creator-whatsapp" name="whatsapp_number" inputMode="tel" maxLength={40} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="creator-email" name="email" type="email" maxLength={254} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-category" className="mb-1 block text-sm font-medium">Category *</label>
          <select id="creator-category" name="category" defaultValue="Other" className={fieldClass}>
            {CREATOR_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="creator-source" className="mb-1 block text-sm font-medium">Source *</label>
          <select id="creator-source" name="source" defaultValue="Manual" className={fieldClass}>
            {CREATOR_SOURCES.map((source) => <option key={source}>{source}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="creator-status" className="mb-1 block text-sm font-medium">Status *</label>
          <select id="creator-status" name="status" defaultValue="Not Contacted" className={fieldClass}>
            {CREATOR_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="creator-product" className="mb-1 block text-sm font-medium">Assigned product</label>
          <select id="creator-product" name="product_id" defaultValue="" className={fieldClass}>
            <option value="">No product</option>
            {products.filter((product) => product.is_active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="creator-followers" className="mb-1 block text-sm font-medium">Followers</label>
          <input id="creator-followers" name="follower_count" type="number" min="0" step="1" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-engagement" className="mb-1 block text-sm font-medium">Engagement rate (%)</label>
          <input id="creator-engagement" name="engagement_rate" type="number" min="0" max="100" step="0.01" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-pic" className="mb-1 block text-sm font-medium">PIC / owner</label>
          <input id="creator-pic" name="pic" maxLength={100} className={fieldClass} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="creator-notes" className="mb-1 block text-sm font-medium">Notes</label>
          <textarea id="creator-notes" name="notes" maxLength={5000} className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
        </div>
        {state.error && <p className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{state.error}</p>}
        <div className="flex justify-end gap-3 md:col-span-2">
          <Link href="/creators"><Button type="button" className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Cancel</Button></Link>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Creator"}</Button>
        </div>
      </form>
    </Card>
  );
}
