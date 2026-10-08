"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateCreator, type CreatorActionState } from "@/lib/actions/creators";
import { CREATOR_CATEGORIES, CREATOR_SOURCES, CREATOR_STATUSES } from "@/lib/creators/constants";
import type { Creator, Product } from "@/types/db";

const initialState: CreatorActionState = {};
const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2";

export function CreatorEditForm({ creator, products }: { creator: Creator; products: Product[] }) {
  const [state, action, pending] = useActionState(updateCreator.bind(null, creator.id), initialState);
  return (
    <Card className="p-6">
      <h2 className="mb-5 text-xl font-semibold">Edit creator</h2>
      <form action={action} className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="edit-name" className="mb-1 block text-sm font-medium">Name *</label>
          <input id="edit-name" name="creator_name" required maxLength={120} defaultValue={creator.creator_name ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-handle" className="mb-1 block text-sm font-medium">TikTok handle *</label>
          <input id="edit-handle" name="tiktok_handle" required maxLength={25} defaultValue={creator.tiktok_handle ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-profile-url" className="mb-1 block text-sm font-medium">Profile URL</label>
          <input id="edit-profile-url" name="profile_url" type="url" maxLength={500} defaultValue={creator.profile_url ?? ""} placeholder="https://www.tiktok.com/@handle" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-whatsapp" className="mb-1 block text-sm font-medium">WhatsApp</label>
          <input id="edit-whatsapp" name="whatsapp_number" inputMode="tel" maxLength={40} defaultValue={creator.whatsapp_number ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="edit-email" name="email" type="email" maxLength={254} defaultValue={creator.email ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-category" className="mb-1 block text-sm font-medium">Category *</label>
          <select id="edit-category" name="category" defaultValue={creator.category} className={fieldClass}>
            {CREATOR_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="edit-status" className="mb-1 block text-sm font-medium">Status *</label>
          <select id="edit-status" name="status" defaultValue={creator.status} className={fieldClass}>
            {CREATOR_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="edit-recruitment-status" className="mb-1 block text-sm font-medium">Recruitment status</label>
          <select id="edit-recruitment-status" name="recruitment_status" defaultValue={creator.recruitment_status ?? "New"} className={fieldClass}>
            {["New", "Already Contacted", "Invitation Sent", "Replied", "Interested", "Not Interested", "Joined", "Follow-up Required", "No Response", "Rejected"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="edit-source" className="mb-1 block text-sm font-medium">Source *</label>
          <select id="edit-source" name="source" defaultValue={creator.source} className={fieldClass}>
            {CREATOR_SOURCES.map((source) => <option key={source}>{source}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="edit-pic" className="mb-1 block text-sm font-medium">PIC / owner</label>
          <input id="edit-pic" name="pic" maxLength={100} defaultValue={creator.pic ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-product" className="mb-1 block text-sm font-medium">Assigned product</label>
          <select id="edit-product" name="product_id" defaultValue={creator.product_id ?? ""} className={fieldClass}>
            <option value="">No product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.is_active ? "" : " (inactive)"}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="edit-followers" className="mb-1 block text-sm font-medium">Followers</label>
          <input id="edit-followers" name="follower_count" type="number" min="0" step="1" defaultValue={creator.follower_count ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-following" className="mb-1 block text-sm font-medium">Following</label>
          <input id="edit-following" name="following_count" type="number" min="0" step="1" defaultValue={creator.following_count ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-engagement" className="mb-1 block text-sm font-medium">Engagement rate (%)</label>
          <input id="edit-engagement" name="engagement_rate" type="number" min="0" max="100" step="0.01" defaultValue={creator.engagement_rate ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-engagement-details" className="mb-1 block text-sm font-medium">Visible engagement details</label>
          <input id="edit-engagement-details" name="engagement_details" maxLength={1000} defaultValue={creator.engagement_details ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-content-type" className="mb-1 block text-sm font-medium">Content type</label>
          <input id="edit-content-type" name="content_type" maxLength={300} defaultValue={creator.content_type ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="edit-recent-activity" className="mb-1 block text-sm font-medium">Recent activity</label>
          <input id="edit-recent-activity" name="recent_activity" maxLength={1000} defaultValue={creator.recent_activity ?? ""} className={fieldClass} />
        </div>
        <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 md:col-span-2">
          <h2 className="font-semibold text-slate-900">MCN and eligibility review</h2>
          <p className="mt-1 text-sm text-slate-600">
            Last checked: {creator.mcn_checked_at ? new Date(creator.mcn_checked_at).toLocaleString() : "Not confirmed"}.
            {" "}Confirmed MCN results require evidence; unknown results are never eligible.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="edit-mcn-status" className="mb-1 block text-sm font-medium">MCN status</label>
              <select id="edit-mcn-status" name="mcn_status" defaultValue={creator.mcn_status ?? "MCN Unknown"} className={fieldClass}>
                {["Checking MCN", "MCN Signed", "Not MCN Signed", "MCN Unknown"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="edit-mcn-company" className="mb-1 block text-sm font-medium">MCN / company name</label>
              <input id="edit-mcn-company" name="mcn_company" maxLength={200} defaultValue={creator.mcn_company ?? ""} className={fieldClass} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="edit-mcn-evidence" className="mb-1 block text-sm font-medium">Evidence / source for MCN check</label>
              <textarea id="edit-mcn-evidence" name="mcn_evidence" maxLength={2000} defaultValue={creator.mcn_evidence ?? ""} placeholder="Record publicly available evidence or the authorized source. Do not guess." className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
            </div>
            <div>
              <label htmlFor="edit-eligibility-status" className="mb-1 block text-sm font-medium">Eligibility</label>
              <select id="edit-eligibility-status" name="eligibility_status" defaultValue={creator.eligibility_status ?? "Pending"} className={fieldClass}>
                {["Pending", "Eligible", "Not Eligible"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="edit-eligibility-score" className="mb-1 block text-sm font-medium">Score (optional, 0–100)</label>
              <input id="edit-eligibility-score" name="eligibility_score" type="number" min="0" max="100" step="1" defaultValue={creator.eligibility_score ?? ""} className={fieldClass} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="edit-eligibility-reason" className="mb-1 block text-sm font-medium">Eligibility reason</label>
              <textarea id="edit-eligibility-reason" name="eligibility_reason" maxLength={2000} defaultValue={creator.eligibility_reason ?? ""} className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="edit-notes" className="mb-1 block text-sm font-medium">Notes</label>
          <textarea id="edit-notes" name="notes" maxLength={5000} defaultValue={creator.notes ?? ""} className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
        </div>
        {state.error && <p className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{state.error}</p>}
        {state.success && <p className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{state.success}</p>}
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </Card>
  );
}
