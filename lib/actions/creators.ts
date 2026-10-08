"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CREATOR_CATEGORIES, CREATOR_SOURCES, CREATOR_STATUSES } from "@/lib/creators/constants";
import { initialRecruitmentStatus } from "@/lib/creators/recruitment-status";

export type CreatorActionState = { error?: string; success?: string };

const creatorSchema = z.object({
  creator_name: z.string().trim().min(1, "Creator name is required.").max(120, "Creator name must be 120 characters or fewer."),
  tiktok_handle: z.string().trim().min(1, "TikTok handle is required.").max(25, "TikTok handle must be 24 characters or fewer.")
    .regex(/^@?[a-zA-Z0-9._]{1,24}$/, "Enter a valid TikTok handle using letters, numbers, periods, or underscores.")
    .transform((handle) => handle.replace(/^@/, "").toLowerCase()),
  profile_url: z.string().trim().max(500, "Profile URL is too long.")
    .pipe(z.union([
      z.literal(""),
      z.url("Enter a valid TikTok profile URL.").refine((value) => {
        const host = new URL(value).hostname.toLowerCase();
        return (host === "tiktok.com" || host.endsWith(".tiktok.com")) && /^\/@[^/]+\/?$/.test(new URL(value).pathname);
      }, "Enter a TikTok creator profile URL."),
    ]))
    .transform((value) => {
      if (!value) return null;
      const url = new URL(value);
      return `https://www.tiktok.com${url.pathname.replace(/\/+$/, "")}`;
    }),
  whatsapp_number: z.string().trim().max(40, "WhatsApp number must be 40 characters or fewer.")
    .regex(/^[+0-9() .-]*$/, "Enter a valid WhatsApp number.").transform((value) => value || null),
  email: z.string().trim().max(254, "Email must be 254 characters or fewer.")
    .pipe(z.union([z.literal(""), z.email("Enter a valid email address.")]))
    .transform((value) => value || null),
  category: z.enum(CREATOR_CATEGORIES),
  source: z.enum(CREATOR_SOURCES),
  status: z.enum(CREATOR_STATUSES),
  follower_count: z.string().trim().transform((value) => value === "" ? null : Number(value))
    .pipe(z.number().int("Follower count must be a whole number.").min(0, "Follower count cannot be negative.").max(Number.MAX_SAFE_INTEGER, "Follower count is too large.").nullable()),
  following_count: z.string().trim().transform((value) => value === "" ? null : Number(value))
    .pipe(z.number().int("Following count must be a whole number.").min(0, "Following count cannot be negative.").max(Number.MAX_SAFE_INTEGER, "Following count is too large.").nullable()),
  engagement_rate: z.string().trim().transform((value) => value === "" ? null : Number(value))
    .pipe(z.number().finite("Engagement rate must be a valid number.").min(0, "Engagement rate cannot be negative.").max(100, "Engagement rate cannot exceed 100%.").nullable()),
  engagement_details: z.string().trim().max(1000).transform((value) => value || null),
  content_type: z.string().trim().max(300).transform((value) => value || null),
  recent_activity: z.string().trim().max(1000).transform((value) => value || null),
  mcn_status: z.enum(["Checking MCN", "MCN Signed", "Not MCN Signed", "MCN Unknown"]),
  mcn_company: z.string().trim().max(200).transform((value) => value || null),
  mcn_evidence: z.string().trim().max(2000).transform((value) => value || null),
  eligibility_status: z.enum(["Pending", "Eligible", "Not Eligible"]),
  eligibility_score: z.string().trim().transform((value) => value === "" ? null : Number(value))
    .pipe(z.number().int("Eligibility score must be a whole number.").min(0).max(100).nullable()),
  eligibility_reason: z.string().trim().max(2000).transform((value) => value || null),
  recruitment_status: z.enum([
    "New", "Already Contacted", "Invitation Sent", "Replied", "Interested",
    "Not Interested", "Joined", "Follow-up Required", "No Response", "Rejected",
  ]),
  product_id: z.union([z.literal(""), z.string().uuid("Choose a valid product.")]).transform((value) => value || null),
  pic: z.string().trim().max(100, "PIC must be 100 characters or fewer.").transform((value) => value || null),
  notes: z.string().trim().max(5000, "Notes must be 5,000 characters or fewer.").transform((value) => value || null),
}).superRefine((creator, context) => {
  if (creator.mcn_status !== "MCN Unknown" && creator.mcn_status !== "Checking MCN" && !creator.mcn_evidence) {
    context.addIssue({
      code: "custom",
      path: ["mcn_evidence"],
      message: "Add evidence for a confirmed MCN status.",
    });
  }
  if (creator.eligibility_status === "Eligible" && creator.mcn_status !== "Not MCN Signed") {
    context.addIssue({
      code: "custom",
      path: ["eligibility_status"],
      message: "A creator can only be eligible after MCN status is confirmed as Not MCN Signed.",
    });
  }
  if (creator.profile_url) {
    const profileHandle = new URL(creator.profile_url).pathname.slice(2).toLowerCase();
    if (profileHandle !== creator.tiktok_handle) {
      context.addIssue({
        code: "custom",
        path: ["profile_url"],
        message: "The profile URL username must match the TikTok handle.",
      });
    }
  }
});

const messageSchema = z.object({
  template_id: z.union([z.literal(""), z.string().uuid("Choose a valid template.")]).transform((value) => value || null),
  message_body: z.string().trim().min(1, "Message cannot be empty.").max(40000, "Message is too long."),
});

const bulkUpdateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("status"),
    status: z.enum(CREATOR_STATUSES),
  }),
  z.object({
    mode: z.literal("pic"),
    pic: z.string().trim().max(100, "PIC must be 100 characters or fewer."),
  }),
]);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(" ");
}

function databaseError(error: { code?: string; message: string }, operation: string) {
  if (error.code === "23505") return `A creator with this TikTok handle or profile URL already exists.`;
  if (error.code === "23503") return `The selected product or template no longer exists. Refresh the page and try again.`;
  return `${operation}: ${error.message}`;
}

async function ensureUniqueHandle(handle: string, profileUrl: string, exceptId?: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("find_creator_duplicates", {
    handle_values: [handle.toLowerCase()],
    profile_url_values: [profileUrl.toLowerCase().replace(/\/+$/, "")],
  });
  if (error) return { error: `Could not check for duplicate TikTok handles or profile URLs: ${error.message}` };
  if (data?.some((creator: { creator_id: string }) => creator.creator_id !== exceptId)) {
    return { error: "A creator with this TikTok handle or profile URL already exists." };
  }
  return { supabase };
}

function parseCreator(formData: FormData) {
  return creatorSchema.safeParse({
    creator_name: text(formData, "creator_name"),
    tiktok_handle: text(formData, "tiktok_handle"),
    profile_url: text(formData, "profile_url"),
    whatsapp_number: text(formData, "whatsapp_number"),
    email: text(formData, "email"),
    category: text(formData, "category"),
    source: text(formData, "source"),
    status: text(formData, "status"),
    follower_count: text(formData, "follower_count"),
    following_count: text(formData, "following_count"),
    engagement_rate: text(formData, "engagement_rate"),
    engagement_details: text(formData, "engagement_details"),
    content_type: text(formData, "content_type"),
    recent_activity: text(formData, "recent_activity"),
    mcn_status: text(formData, "mcn_status"),
    mcn_company: text(formData, "mcn_company"),
    mcn_evidence: text(formData, "mcn_evidence"),
    eligibility_status: text(formData, "eligibility_status"),
    eligibility_score: text(formData, "eligibility_score"),
    eligibility_reason: text(formData, "eligibility_reason"),
    recruitment_status: text(formData, "recruitment_status"),
    product_id: text(formData, "product_id"),
    pic: text(formData, "pic"),
    notes: text(formData, "notes"),
  });
}

export async function createCreator(_state: CreatorActionState, formData: FormData): Promise<CreatorActionState> {
  const parsed = parseCreator(formData);
  if (!parsed.success) return { error: formatValidationError(parsed.error) };

  try {
    const profileUrl = parsed.data.profile_url ?? `https://www.tiktok.com/@${parsed.data.tiktok_handle}`;
    const creatorData = {
      ...parsed.data,
      profile_url: profileUrl,
      mcn_checked_at:
        parsed.data.mcn_status === "MCN Unknown" || parsed.data.mcn_status === "Checking MCN"
          ? null
          : new Date().toISOString(),
      recruitment_status: initialRecruitmentStatus(parsed.data.mcn_status, parsed.data.status),
    };
    const unique = await ensureUniqueHandle(parsed.data.tiktok_handle, profileUrl);
    if (unique.error || !unique.supabase) return { error: unique.error ?? "Could not verify the TikTok handle." };
    const { data, error } = await unique.supabase.from("creators").insert(creatorData).select("id").single();
    if (error) return { error: databaseError(error, "Could not create creator") };
    revalidatePath("/creators");
    redirect(`/creators/${data.id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
    return { error: error instanceof Error ? error.message : "Could not create creator. Please try again." };
  }
}

export async function updateCreator(id: string, _state: CreatorActionState, formData: FormData): Promise<CreatorActionState> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid creator ID." };
  const parsed = parseCreator(formData);
  if (!parsed.success) return { error: formatValidationError(parsed.error) };

  try {
    const profileUrl = parsed.data.profile_url ?? `https://www.tiktok.com/@${parsed.data.tiktok_handle}`;
    const unique = await ensureUniqueHandle(parsed.data.tiktok_handle, profileUrl, id);
    if (unique.error || !unique.supabase) return { error: unique.error ?? "Could not verify the TikTok handle." };
    const { data: previous, error: readError } = await unique.supabase.from("creators")
      .select("status,mcn_status,mcn_evidence,mcn_checked_at,recruitment_status").eq("id", id).maybeSingle();
    if (readError) return { error: `Could not load creator before saving: ${readError.message}` };
    if (!previous) return { error: "This creator no longer exists. Refresh and try again." };
    if (
      ["Invited", "Follow-up 1 Sent", "Follow-up 2 Sent"].includes(parsed.data.status) &&
      previous.status !== parsed.data.status &&
      (parsed.data.mcn_status !== "Not MCN Signed" || parsed.data.eligibility_status !== "Eligible")
    ) {
      return { error: "Recruitment status cannot advance until MCN status is confirmed Not MCN Signed and eligibility is marked Eligible." };
    }
    if (
      parsed.data.status === "Invited" &&
      previous.status !== "Invited" &&
      previous.recruitment_status !== "Invitation Sent"
    ) {
      return { error: "Record the eligible invitation through the contact action before changing status to Invited." };
    }
    if (
      parsed.data.recruitment_status !== previous.recruitment_status &&
      ["Invitation Sent", "Interested", "Joined", "Follow-up Required", "No Response"].includes(parsed.data.recruitment_status) &&
      (parsed.data.mcn_status !== "Not MCN Signed" || parsed.data.eligibility_status !== "Eligible")
    ) {
      return { error: "This recruitment status requires a confirmed Not MCN Signed result and Eligible screening." };
    }
    if (parsed.data.recruitment_status === "Invitation Sent" && previous.recruitment_status !== "Invitation Sent") {
      const { data: invitation, error: invitationError } = await unique.supabase.from("contact_log")
        .select("id").eq("creator_id", id).eq("recruitment_invitation", true).limit(1).maybeSingle();
      if (invitationError) return { error: `Could not verify the invitation record: ${invitationError.message}` };
      if (!invitation) return { error: "Record an invitation through the creator contact action before setting Invitation Sent." };
    }

    const statusRecruitment = parsed.data.status !== previous.status
      ? parsed.data.status === "Replied" ? "Replied"
        : parsed.data.status === "Agreed" ? "Interested"
          : parsed.data.status === "Rejected" ? "Rejected"
            : ["Invited", "Follow-up 1 Sent", "Follow-up 2 Sent"].includes(parsed.data.status)
              ? "Invitation Sent"
              : null
      : null;
    const creatorData = {
      ...parsed.data,
      profile_url: profileUrl,
      mcn_checked_at:
        parsed.data.mcn_status === "MCN Unknown" || parsed.data.mcn_status === "Checking MCN"
          ? null
          : previous.mcn_status !== parsed.data.mcn_status || previous.mcn_evidence !== parsed.data.mcn_evidence
            ? new Date().toISOString()
            : previous.mcn_checked_at,
      recruitment_status:
        parsed.data.mcn_status === "MCN Signed"
          ? "Rejected"
          : statusRecruitment ?? parsed.data.recruitment_status,
    };
    const { error } = await unique.supabase.from("creators").update(creatorData).eq("id", id);
    if (error) return { error: databaseError(error, "Could not save creator") };

    if (previous.status !== parsed.data.status) {
      const { error: activityError } = await unique.supabase.from("activity_log").insert({
        creator_id: id,
        action: "Status changed",
        old_value: previous.status,
        new_value: parsed.data.status,
        performed_by: "Creator Tracker",
      });
      if (activityError) {
        revalidatePath(`/creators/${id}`);
        revalidatePath("/creators");
        return { error: `Creator details were saved, but status history could not be recorded: ${activityError.message}` };
      }
    }

    revalidatePath(`/creators/${id}`);
    revalidatePath("/creators");
    return { success: "Creator details saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save creator. Please try again." };
  }
}

export async function bulkUpdateCreators(_state: CreatorActionState, formData: FormData): Promise<CreatorActionState> {
  const creatorIds = [...new Set(formData.getAll("creator_ids")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim()))];
  if (creatorIds.length === 0) return { error: "Select at least one creator." };
  if (creatorIds.length > 50) return { error: "Bulk actions can update up to 50 creators at a time." };
  if (creatorIds.some((id) => !z.string().uuid().safeParse(id).success)) {
    return { error: "One or more selected creator IDs are invalid. Refresh the page and try again." };
  }

  const parsed = bulkUpdateSchema.safeParse({
    mode: text(formData, "mode"),
    status: text(formData, "status"),
    pic: text(formData, "pic"),
  });
  if (!parsed.success) return { error: formatValidationError(parsed.error) };

  try {
    const supabase = await createServerSupabaseClient();
    if (parsed.data.mode === "pic") {
      const { data, error } = await supabase.from("creators").update({ pic: parsed.data.pic || null })
        .in("id", creatorIds).select("id");
      if (error) return { error: `Could not update PIC assignment: ${error.message}` };
      const updatedCount = data?.length ?? 0;
      revalidatePath("/creators");
      if (updatedCount !== creatorIds.length) {
        return { error: `PIC assignment was updated for ${updatedCount} of ${creatorIds.length} selected creators. Some records may have been removed; refresh and review the list.` };
      }
      return { success: `PIC assignment updated for ${updatedCount} creator${updatedCount === 1 ? "" : "s"}.` };
    }

    if (parsed.data.mode !== "status") {
      return { error: "Choose a valid bulk action and try again." };
    }
    const targetStatus = parsed.data.status;

    const { data: selectedCreators, error: readError } = await supabase.from("creators")
      .select("id, status, mcn_status, eligibility_status, recruitment_status").in("id", creatorIds);
    if (readError) return { error: `Could not load selected creators: ${readError.message}` };
    if (!selectedCreators?.length) return { error: "The selected creators could not be found. Refresh the page and try again." };
    if (["Invited", "Follow-up 1 Sent", "Follow-up 2 Sent"].includes(targetStatus)) {
      const notEligible = selectedCreators.filter(
        (creator) => creator.mcn_status !== "Not MCN Signed" || creator.eligibility_status !== "Eligible",
      );
      if (notEligible.length) {
        return { error: `${notEligible.length} selected creator(s) are not confirmed as eligible and not MCN signed. Resolve screening before advancing recruitment status.` };
      }
      if (targetStatus === "Invited") {
        return { error: "Bulk actions cannot record invitations. Send and record each eligible invitation from the creator profile first." };
      }
    }

    const changedCreators = selectedCreators.filter((creator) => creator.status !== targetStatus);
    const updateFailures: string[] = [];
    const activityFailures: string[] = [];
    for (const creator of changedCreators) {
      const recruitmentStatus =
        targetStatus === "Replied" ? "Replied"
          : targetStatus === "Agreed" ? "Interested"
            : targetStatus === "Rejected" ? "Rejected"
              : ["Invited", "Follow-up 1 Sent", "Follow-up 2 Sent"].includes(targetStatus)
                ? "Invitation Sent"
                : creator.recruitment_status;
      const { error: updateError } = await supabase.from("creators")
        .update({ status: targetStatus, recruitment_status: recruitmentStatus }).eq("id", creator.id);
      if (updateError) {
        updateFailures.push(creator.id);
        continue;
      }
      const { error: activityError } = await supabase.from("activity_log").insert({
        creator_id: creator.id,
        action: "Status changed",
        old_value: creator.status,
        new_value: targetStatus,
        performed_by: "Creator Tracker",
      });
      if (activityError) activityFailures.push(creator.id);
    }
    revalidatePath("/creators");
    for (const creator of changedCreators) revalidatePath(`/creators/${creator.id}`);

    const unchangedCount = selectedCreators.length - changedCreators.length;
    const succeededCount = changedCreators.length - updateFailures.length;
    if (updateFailures.length || activityFailures.length) {
      const details = [
        updateFailures.length ? `${updateFailures.length} creator status update(s) failed` : "",
        activityFailures.length ? `${activityFailures.length} status change(s) were saved without activity history` : "",
      ].filter(Boolean).join("; ");
      return { error: `${details}. ${succeededCount} of ${selectedCreators.length} selected creator(s) now have status “${targetStatus}”; ${unchangedCount} already had this status. Refresh and review the list.` };
    }
    return { success: `Status changed to ${targetStatus} for ${succeededCount} creator${succeededCount === 1 ? "" : "s"}; ${unchangedCount} already had this status.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not apply bulk action. Please try again." };
  }
}

export async function logMessageSent(id: string, _state: CreatorActionState, formData: FormData): Promise<CreatorActionState> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid creator ID." };
  const parsed = messageSchema.safeParse({
    template_id: text(formData, "template_id"),
    message_body: text(formData, "message_body"),
  });
  if (!parsed.success) return { error: formatValidationError(parsed.error) };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: creator, error: creatorError } = await supabase.from("creators")
      .select("status,mcn_status,eligibility_status,recruitment_status")
      .eq("id", id).maybeSingle();
    if (creatorError) return { error: `Could not verify creator screening before contact: ${creatorError.message}` };
    if (!creator) return { error: "This creator no longer exists. Refresh and try again." };

    let templateType: string | null = null;
    if (parsed.data.template_id) {
      const { data: template, error: templateError } = await supabase.from("templates")
        .select("id, channel, type, is_active").eq("id", parsed.data.template_id).maybeSingle();
      if (templateError) return { error: `Could not verify the selected template: ${templateError.message}` };
      if (!template || !template.is_active || template.channel !== "WhatsApp") {
        return { error: "The selected WhatsApp template is no longer available. Choose another template." };
      }
      templateType = template.type;
    }

    const isProspect = creator.status === "Not Contacted" || creator.status === "Cold Lead";
    const isRecruitmentInvitation =
      templateType === "MCN Invite" || (isProspect && creator.recruitment_status === "New");
    const isRecruitmentFollowUp =
      templateType === "Follow-up" &&
      (
        ["Invitation Sent", "Follow-up Required", "No Response"].includes(creator.recruitment_status) ||
        ["Invited", "Follow-up 1 Sent", "Follow-up 2 Sent"].includes(creator.status)
      );
    if (creator.mcn_status === "MCN Signed" && isRecruitmentInvitation) {
      return { error: "This creator is marked MCN Signed. Recruitment invitations are blocked." };
    }
    if (creator.mcn_status === "MCN Signed" && isRecruitmentFollowUp) {
      return { error: "This creator is marked MCN Signed. Recruitment follow-ups are blocked." };
    }
    if (isProspect || isRecruitmentInvitation || isRecruitmentFollowUp) {
      if (creator.mcn_status !== "Not MCN Signed" || creator.eligibility_status !== "Eligible") {
        return { error: "Contact is blocked until MCN status is confirmed Not MCN Signed and eligibility is marked Eligible." };
      }
    }
    if (isProspect && creator.recruitment_status !== "New" && templateType !== "Follow-up") {
      return { error: "This creator has already been contacted. Select a follow-up action instead of sending another first invitation." };
    }
    if (isRecruitmentInvitation && creator.recruitment_status !== "New") {
      return { error: "An invitation or contact is already recorded for this creator. Do not send a duplicate invitation." };
    }

    const sentAt = new Date().toISOString();
    const { error: insertError } = await supabase.from("contact_log").insert({
      creator_id: id,
      channel: "WhatsApp",
      template_id: parsed.data.template_id,
      message_body: parsed.data.message_body,
      sent_at: sentAt,
      replied: false,
      recruitment_invitation: isRecruitmentInvitation,
    });
    if (insertError) {
      if (insertError.code === "23505" && isRecruitmentInvitation) {
        return { error: "An invitation has already been recorded for this creator. Duplicate invitations are blocked." };
      }
      return { error: databaseError(insertError, "Could not record sent message") };
    }
    const creatorUpdate: {
      last_contact_at: string;
      status?: string;
      recruitment_status?: string;
    } = { last_contact_at: sentAt };
    if (isRecruitmentInvitation) {
      creatorUpdate.status = "Invited";
      creatorUpdate.recruitment_status = "Invitation Sent";
    } else if (isProspect) {
      creatorUpdate.recruitment_status = "Already Contacted";
    }
    const { error: updateError } = await supabase.from("creators").update(creatorUpdate).eq("id", id);
    revalidatePath(`/creators/${id}`);
    revalidatePath("/creators");
    if (updateError) return { error: `Message was recorded, but last contact could not be updated: ${updateError.message}` };
    return { success: "Message marked as sent and added to the contact timeline." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record the message. Please try again." };
  }
}

export async function markQueuedMessageSent(id: string, _state: CreatorActionState, formData: FormData): Promise<CreatorActionState> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid creator ID." };
  const contactLogId = text(formData, "contact_log_id");
  if (!z.string().uuid().safeParse(contactLogId).success) return { error: "Invalid contact timeline entry." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: logEntry, error: logReadError } = await supabase.from("contact_log")
      .select("id, status, sent_at").eq("id", contactLogId).eq("creator_id", id).maybeSingle();
    if (logReadError) return { error: `Could not load the queued message: ${logReadError.message}` };
    if (!logEntry) return { error: "This queued message does not belong to the selected creator." };
    if (logEntry.status !== "pending_send" || logEntry.sent_at) {
      return { error: "This message is no longer waiting to be sent. Refresh the timeline and try again." };
    }

    const { data: reminder, error: reminderError } = await supabase.from("scheduled_reminder_runs")
      .select("workflow_key").eq("queued_contact_id", contactLogId).maybeSingle();
    if (reminderError) return { error: `Could not verify the scheduled reminder: ${reminderError.message}` };
    if (!reminder) return { error: "The scheduled reminder record is missing. Contact support before changing its status." };
    if (reminder.workflow_key.startsWith("follow_up")) {
      const { data: creator, error: creatorError } = await supabase.from("creators")
        .select("mcn_status,eligibility_status").eq("id", id).maybeSingle();
      if (creatorError) return { error: `Could not verify screening before follow-up: ${creatorError.message}` };
      if (!creator || creator.mcn_status !== "Not MCN Signed" || creator.eligibility_status !== "Eligible") {
        return { error: "This recruitment follow-up is blocked until MCN status is confirmed Not MCN Signed and eligibility is Eligible." };
      }
    }

    const sentAt = new Date().toISOString();
    const { data: updatedLog, error: updateLogError } = await supabase.from("contact_log")
      .update({ status: "sent", sent_at: sentAt })
      .eq("id", contactLogId).eq("creator_id", id).eq("status", "pending_send")
      .select("id").maybeSingle();
    if (updateLogError) return { error: `Could not mark the queued message as sent: ${updateLogError.message}` };
    if (!updatedLog) return { error: "This message was already updated. Refresh the timeline to see its current status." };

    const nextStatus = reminder.workflow_key === "follow_up_7_days"
      ? "Follow-up 1 Sent"
      : reminder.workflow_key === "follow_up_30_days"
        ? "Follow-up 2 Sent"
        : null;
    const { data: creator, error: creatorReadError } = await supabase.from("creators")
      .select("status").eq("id", id).maybeSingle();
    if (creatorReadError) return { error: `Message was marked sent, but creator details could not be loaded: ${creatorReadError.message}` };
    if (!creator) return { error: "Message was marked sent, but the creator record no longer exists." };

    const creatorUpdate: { last_contact_at: string; status?: string } = { last_contact_at: sentAt };
    if (nextStatus) creatorUpdate.status = nextStatus;
    const { error: updateCreatorError } = await supabase.from("creators").update(creatorUpdate).eq("id", id);
    if (updateCreatorError) {
      return { error: `Message was marked sent, but creator details could not be updated: ${updateCreatorError.message}` };
    }

    if (nextStatus && creator.status !== nextStatus) {
      const { error: activityError } = await supabase.from("activity_log").insert({
        creator_id: id,
        action: "Status changed",
        old_value: creator.status,
        new_value: nextStatus,
        performed_by: "Creator Tracker",
      });
      if (activityError) {
        revalidatePath(`/creators/${id}`);
        revalidatePath("/creators");
        return { error: `Message was sent and creator status was updated, but activity history could not be recorded: ${activityError.message}` };
      }
    }

    revalidatePath(`/creators/${id}`);
    revalidatePath("/creators");
    return { success: "Queued message marked as sent. The contact time and follow-up status were updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the queued message. Please try again." };
  }
}

export async function markCreatorReplied(id: string, _state: CreatorActionState, formData: FormData): Promise<CreatorActionState> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid creator ID." };
  const contactLogId = text(formData, "contact_log_id");
  if (contactLogId && !z.string().uuid().safeParse(contactLogId).success) return { error: "Invalid contact timeline entry." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: creator, error: creatorError } = await supabase.from("creators")
      .select("status,recruitment_status").eq("id", id).maybeSingle();
    if (creatorError) return { error: `Could not load creator: ${creatorError.message}` };
    if (!creator) return { error: "This creator no longer exists. Refresh and try again." };

    let logId = contactLogId;
    if (!logId) {
      const { data: latest, error: latestError } = await supabase.from("contact_log")
        .select("id").eq("creator_id", id).not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(1).maybeSingle();
      if (latestError) return { error: `Could not load the latest contact: ${latestError.message}` };
      logId = latest?.id ?? "";
    }
    if (logId) {
      const { data: logEntry, error: logReadError } = await supabase.from("contact_log").select("id, sent_at")
        .eq("id", logId).eq("creator_id", id).maybeSingle();
      if (logReadError) return { error: `Could not verify the contact entry: ${logReadError.message}` };
      if (!logEntry) return { error: "The selected contact entry does not belong to this creator." };
      if (!logEntry.sent_at) {
        return { error: "This message has not been sent yet, so it cannot be marked as replied." };
      }
      const { error: repliedError } = await supabase.from("contact_log")
        .update({ replied: true, replied_at: new Date().toISOString() }).eq("id", logId).eq("creator_id", id);
      if (repliedError) return { error: `Could not mark the contact as replied: ${repliedError.message}` };
    }

    if (creator.status !== "Replied" || creator.recruitment_status !== "Replied") {
      const { error: updateError } = await supabase.from("creators")
        .update({ status: "Replied", recruitment_status: "Replied" }).eq("id", id);
      if (updateError) return { error: `Contact was marked replied, but creator status could not be updated: ${updateError.message}` };
      const { error: activityError } = await supabase.from("activity_log").insert({
        creator_id: id,
        action: "Status changed",
        old_value: creator.status,
        new_value: "Replied",
        performed_by: "Creator Tracker",
      });
      if (activityError) {
        revalidatePath(`/creators/${id}`);
        revalidatePath("/creators");
        return { error: `Creator is marked as replied, but status history could not be recorded: ${activityError.message}` };
      }
    }

    revalidatePath(`/creators/${id}`);
    revalidatePath("/creators");
    return { success: "Creator marked as replied." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update reply status. Please try again." };
  }
}
