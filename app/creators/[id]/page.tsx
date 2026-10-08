import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactTimelineEntry, MarkRepliedButton, MessageModal } from "@/components/creators/creator-detail-actions";
import { CreatorEditForm } from "@/components/creators/creator-edit-form";
import { getProducts, getSettings, getTemplates } from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toMytDate } from "@/lib/utils";
import type { ActivityLog, ContactLog, Creator } from "@/types/db";

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let creator: Creator | null = null;
  let creatorError = "";

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
    if (error) creatorError = `Could not load creator: ${error.message}`;
    creator = data as Creator | null;
  } catch (error) {
    creatorError = error instanceof Error ? error.message : "Could not connect to the creator database.";
  }
  if (!creator && !creatorError) notFound();

  const productsPromise = getProducts();
  const templatesPromise = getTemplates();
  const settingsPromise = getSettings();
  let contactLog: ContactLog[] = [];
  let activity: ActivityLog[] = [];
  let timelineError = "";
  if (creator) {
    try {
      const supabase = await createServerSupabaseClient();
      const [contactsResult, activityResult] = await Promise.all([
        supabase.from("contact_log").select("*").eq("creator_id", id).order("sent_at", { ascending: false }),
        supabase.from("activity_log").select("*").eq("creator_id", id).order("created_at", { ascending: false }),
      ]);
      if (contactsResult.error) timelineError = `Could not load contact timeline: ${contactsResult.error.message}`;
      else contactLog = (contactsResult.data ?? []) as ContactLog[];
      if (activityResult.error) {
        timelineError = `${timelineError ? `${timelineError} ` : ""}Could not load activity history: ${activityResult.error.message}`;
      } else activity = (activityResult.data ?? []) as ActivityLog[];
    } catch (error) {
      timelineError = error instanceof Error ? error.message : "Could not load creator history.";
    }
  }
  const [products, templates, settings] = await Promise.all([productsPromise, templatesPromise, settingsPromise]);

  if (!creator) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="border-red-200 bg-red-50 text-red-800" role="alert">{creatorError}</Card>
        <Link href="/creators"><Button type="button" className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Back to creators</Button></Link>
      </div>
    );
  }

  const assignedProduct = products.find((item) => item.id === creator.product_id);
  const templateNames = new Map(templates.map((template) => [template.id, template.name]));
  const isProspect = creator.status === "Not Contacted" || creator.status === "Cold Lead";
  const mayContactProspect = creator.mcn_status === "Not MCN Signed" && creator.eligibility_status === "Eligible";
  const timeline = [
    ...contactLog.map((entry) => ({ kind: "contact" as const, date: entry.sent_at, entry })),
    ...activity.map((entry) => ({ kind: "activity" as const, date: entry.created_at, entry })),
  ].sort((left, right) => {
    const leftPending = left.kind === "contact" && left.entry.status === "pending_send";
    const rightPending = right.kind === "contact" && right.entry.status === "pending_send";
    if (leftPending !== rightPending) return leftPending ? -1 : 1;
    return new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Creator profile</p>
          <h1 className="text-3xl font-bold tracking-tight">{creator.creator_name || "Unnamed creator"}</h1>
          <p className="text-slate-500">{creator.tiktok_handle ? `@${creator.tiktok_handle.replace(/^@/, "")}` : "No TikTok handle"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-violet-50 text-violet-700">{creator.status}</Badge>
          {(!isProspect || mayContactProspect) && (
            <MessageModal creator={creator} templates={templates} product={assignedProduct} settings={settings} />
          )}
        </div>
      </div>

      {isProspect && !mayContactProspect && (
        <Card className={`border p-4 text-sm ${creator.mcn_status === "MCN Signed" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`} role="status">
          {creator.mcn_status === "MCN Signed"
            ? "Recruitment is blocked: this creator is marked MCN Signed. Do not invite."
            : creator.mcn_status !== "Not MCN Signed"
              ? "Contact is locked until MCN status is verified. Unknown or unchecked cases stay in manual review."
              : "MCN status is clear, but eligibility must be marked Eligible before recruitment contact is enabled."}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <CreatorEditForm creator={creator} products={products} />
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Creator overview</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-slate-500">Status</dt><dd className="font-medium">{creator.status}</dd>
              <dt className="text-slate-500">MCN status</dt><dd className="font-medium">{creator.mcn_status ?? "MCN Unknown"}</dd>
              <dt className="text-slate-500">MCN / company</dt><dd className="font-medium">{creator.mcn_company || "Not recorded"}</dd>
              <dt className="text-slate-500">Eligibility</dt><dd className="font-medium">{creator.eligibility_status ?? "Pending"}{creator.eligibility_score != null ? ` · Score ${creator.eligibility_score}` : ""}</dd>
              <dt className="text-slate-500">Recruitment</dt><dd className="font-medium">{creator.recruitment_status ?? "New"}</dd>
              <dt className="text-slate-500">PIC</dt><dd className="font-medium">{creator.pic || "Unassigned"}</dd>
              <dt className="text-slate-500">Source</dt><dd className="font-medium">{creator.source || "—"}</dd>
              <dt className="text-slate-500">Discovered</dt><dd className="font-medium">{toMytDate(creator.discovered_at ?? creator.created_at)}</dd>
              <dt className="text-slate-500">MCN checked</dt><dd className="font-medium">{toMytDate(creator.mcn_checked_at)}</dd>
              <dt className="text-slate-500">Profile URL</dt><dd className="font-medium">{creator.profile_url ? <a className="break-all text-violet-700 underline" href={creator.profile_url} target="_blank" rel="noreferrer">Open TikTok profile</a> : "Not recorded"}</dd>
              <dt className="text-slate-500">Product</dt><dd className="font-medium">{assignedProduct?.name ?? "Unassigned"}</dd>
              <dt className="text-slate-500">Last contact</dt><dd className="font-medium">{toMytDate(creator.last_contact_at)}</dd>
            </dl>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <MarkRepliedButton creatorId={creator.id} contactLogId="" />
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="mb-2 text-lg font-semibold">Contact details</h2>
            <p className="text-sm text-slate-600">WhatsApp: {creator.whatsapp_number || "Not provided"}</p>
            <p className="mt-1 text-sm text-slate-600">Email: {creator.email || "Not provided"}</p>
            <p className="mt-3 text-sm text-slate-600">Following: {creator.following_count?.toLocaleString() ?? "Not recorded"}</p>
            <p className="mt-1 text-sm text-slate-600">Engagement: {creator.engagement_rate ?? "Not recorded"}% {creator.engagement_details ? `· ${creator.engagement_details}` : ""}</p>
            <p className="mt-1 text-sm text-slate-600">Content type: {creator.content_type || "Not recorded"}</p>
            <p className="mt-1 text-sm text-slate-600">Recent activity: {creator.recent_activity || "Not recorded"}</p>
            {creator.mcn_evidence && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>MCN evidence:</strong> {creator.mcn_evidence}</p>}
            {creator.eligibility_reason && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Eligibility reason:</strong> {creator.eligibility_reason}</p>}
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Contact timeline</h2>
        {timelineError && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{timelineError}</p>}
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No contact or status activity has been recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {timeline.map((item) => item.kind === "contact" ? (
              <ContactTimelineEntry key={`contact-${item.entry.id}`} creatorId={creator.id} entry={item.entry} templateName={item.entry.template_id ? templateNames.get(item.entry.template_id) : undefined} />
            ) : (
              <article key={`activity-${item.entry.id}`} className="rounded-lg border border-violet-100 bg-violet-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">{item.entry.action || "Activity"}</p>
                  <span className="text-xs text-slate-500">{toMytDate(item.entry.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  {item.entry.old_value || "—"} <span aria-hidden="true">→</span> {item.entry.new_value || "—"}
                </p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
