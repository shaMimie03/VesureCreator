"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CREATOR_CATEGORIES, CREATOR_SOURCES, CREATOR_STATUSES } from "@/lib/creators/constants";

export type CreatorActionState = { error?: string; success?: string };

const creatorSchema = z.object({
  creator_name: z.string().trim().min(1, "Creator name is required.").max(120, "Creator name must be 120 characters or fewer."),
  tiktok_handle: z.string().trim().min(1, "TikTok handle is required.").max(25, "TikTok handle must be 24 characters or fewer.")
    .regex(/^@?[a-zA-Z0-9._]{1,24}$/, "Enter a valid TikTok handle using letters, numbers, periods, or underscores.")
    .transform((handle) => handle.replace(/^@/, "").toLowerCase()),
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
  engagement_rate: z.string().trim().transform((value) => value === "" ? null : Number(value))
    .pipe(z.number().finite("Engagement rate must be a valid number.").min(0, "Engagement rate cannot be negative.").max(100, "Engagement rate cannot exceed 100%.").nullable()),
  product_id: z.union([z.literal(""), z.string().uuid("Choose a valid product.")]).transform((value) => value || null),
  pic: z.string().trim().max(100, "PIC must be 100 characters or fewer.").transform((value) => value || null),
  notes: z.string().trim().max(5000, "Notes must be 5,000 characters or fewer.").transform((value) => value || null),
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
  if (error.code === "23505") return `A creator with this TikTok handle already exists.`;
  if (error.code === "23503") return `The selected product or template no longer exists. Refresh the page and try again.`;
  return `${operation}: ${error.message}`;
}

async function ensureUniqueHandle(handle: string, exceptId?: string) {
  const supabase = await createServerSupabaseClient();
  for (const candidate of [handle, `@${handle}`]) {
    let query = supabase.from("creators").select("id").ilike("tiktok_handle", candidate).limit(1);
    if (exceptId) query = query.neq("id", exceptId);
    const { data, error } = await query.maybeSingle();
    if (error) return { error: `Could not check for duplicate TikTok handles: ${error.message}` };
    if (data) return { error: "A creator with this TikTok handle already exists." };
  }
  return { supabase };
}

function parseCreator(formData: FormData) {
  return creatorSchema.safeParse({
    creator_name: text(formData, "creator_name"),
    tiktok_handle: text(formData, "tiktok_handle"),
    whatsapp_number: text(formData, "whatsapp_number"),
    email: text(formData, "email"),
    category: text(formData, "category"),
    source: text(formData, "source"),
    status: text(formData, "status"),
    follower_count: text(formData, "follower_count"),
    engagement_rate: text(formData, "engagement_rate"),
    product_id: text(formData, "product_id"),
    pic: text(formData, "pic"),
    notes: text(formData, "notes"),
  });
}

export async function createCreator(_state: CreatorActionState, formData: FormData): Promise<CreatorActionState> {
  const parsed = parseCreator(formData);
  if (!parsed.success) return { error: formatValidationError(parsed.error) };

  try {
    const unique = await ensureUniqueHandle(parsed.data.tiktok_handle);
    if (unique.error || !unique.supabase) return { error: unique.error ?? "Could not verify the TikTok handle." };
    const { data, error } = await unique.supabase.from("creators").insert(parsed.data).select("id").single();
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
    const unique = await ensureUniqueHandle(parsed.data.tiktok_handle, id);
    if (unique.error || !unique.supabase) return { error: unique.error ?? "Could not verify the TikTok handle." };
    const { data: previous, error: readError } = await unique.supabase.from("creators").select("status").eq("id", id).maybeSingle();
    if (readError) return { error: `Could not load creator before saving: ${readError.message}` };
    if (!previous) return { error: "This creator no longer exists. Refresh and try again." };

    const { error } = await unique.supabase.from("creators").update(parsed.data).eq("id", id);
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
      .select("id, status").in("id", creatorIds);
    if (readError) return { error: `Could not load selected creators: ${readError.message}` };
    if (!selectedCreators?.length) return { error: "The selected creators could not be found. Refresh the page and try again." };

    const changedCreators = selectedCreators.filter((creator) => creator.status !== targetStatus);
    const updateFailures: string[] = [];
    const activityFailures: string[] = [];
    for (const creator of changedCreators) {
      const { error: updateError } = await supabase.from("creators").update({ status: targetStatus }).eq("id", creator.id);
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
    if (parsed.data.template_id) {
      const { data: template, error: templateError } = await supabase.from("templates")
        .select("id, channel, is_active").eq("id", parsed.data.template_id).maybeSingle();
      if (templateError) return { error: `Could not verify the selected template: ${templateError.message}` };
      if (!template || !template.is_active || template.channel !== "WhatsApp") {
        return { error: "The selected WhatsApp template is no longer available. Choose another template." };
      }
    }
    const sentAt = new Date().toISOString();
    const { error: insertError } = await supabase.from("contact_log").insert({
      creator_id: id,
      channel: "WhatsApp",
      template_id: parsed.data.template_id,
      message_body: parsed.data.message_body,
      sent_at: sentAt,
      replied: false,
    });
    if (insertError) return { error: databaseError(insertError, "Could not record sent message") };
    const { error: updateError } = await supabase.from("creators").update({ last_contact_at: sentAt }).eq("id", id);
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
    const { data: creator, error: creatorError } = await supabase.from("creators").select("status").eq("id", id).maybeSingle();
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

    if (creator.status !== "Replied") {
      const { error: updateError } = await supabase.from("creators").update({ status: "Replied" }).eq("id", id);
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
