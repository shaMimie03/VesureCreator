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
        <input type="hidden" name="recruitment_status" value="New" />
        <div>
          <label htmlFor="creator-name" className="mb-1 block text-sm font-medium">Creator name *</label>
          <input id="creator-name" name="creator_name" required maxLength={120} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-handle" className="mb-1 block text-sm font-medium">TikTok handle *</label>
          <input id="creator-handle" name="tiktok_handle" required maxLength={25} placeholder="@handle" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-profile-url" className="mb-1 block text-sm font-medium">Profile URL</label>
          <input id="creator-profile-url" name="profile_url" type="url" maxLength={500} placeholder="https://www.tiktok.com/@handle" className={fieldClass} />
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
          <label htmlFor="creator-following" className="mb-1 block text-sm font-medium">Following</label>
          <input id="creator-following" name="following_count" type="number" min="0" step="1" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-engagement" className="mb-1 block text-sm font-medium">Engagement rate (%)</label>
          <input id="creator-engagement" name="engagement_rate" type="number" min="0" max="100" step="0.01" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-engagement-details" className="mb-1 block text-sm font-medium">Visible engagement details</label>
          <input id="creator-engagement-details" name="engagement_details" maxLength={1000} placeholder="Views, likes, comments, or source notes" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-content-type" className="mb-1 block text-sm font-medium">Content type</label>
          <input id="creator-content-type" name="content_type" maxLength={300} placeholder="Reviews, tutorials, livestreams…" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="creator-recent-activity" className="mb-1 block text-sm font-medium">Recent activity</label>
          <input id="creator-recent-activity" name="recent_activity" maxLength={1000} placeholder="Most recent post / activity observed" className={fieldClass} />
        </div>
        <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 md:col-span-2">
          <h2 className="font-semibold text-slate-900">MCN and eligibility review</h2>
          <p className="mt-1 text-sm text-slate-600">Unknown or unverified MCN status must stay in manual review. Confirmed MCN status needs evidence.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="creator-mcn-status" className="mb-1 block text-sm font-medium">MCN status</label>
              <select id="creator-mcn-status" name="mcn_status" defaultValue="MCN Unknown" className={fieldClass}>
                {["Checking MCN", "MCN Signed", "Not MCN Signed", "MCN Unknown"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="creator-mcn-company" className="mb-1 block text-sm font-medium">MCN / company name</label>
              <input id="creator-mcn-company" name="mcn_company" maxLength={200} className={fieldClass} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="creator-mcn-evidence" className="mb-1 block text-sm font-medium">Evidence / source for MCN check</label>
              <textarea id="creator-mcn-evidence" name="mcn_evidence" maxLength={2000} placeholder="Record the publicly available evidence or authorized source used. Do not guess." className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
            </div>
            <div>
              <label htmlFor="creator-eligibility-status" className="mb-1 block text-sm font-medium">Eligibility</label>
              <select id="creator-eligibility-status" name="eligibility_status" defaultValue="Pending" className={fieldClass}>
                {["Pending", "Eligible", "Not Eligible"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="creator-eligibility-score" className="mb-1 block text-sm font-medium">Score (optional, 0–100)</label>
              <input id="creator-eligibility-score" name="eligibility_score" type="number" min="0" max="100" step="1" className={fieldClass} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="creator-eligibility-reason" className="mb-1 block text-sm font-medium">Eligibility reason</label>
              <textarea id="creator-eligibility-reason" name="eligibility_reason" maxLength={2000} className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
            </div>
          </div>
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
