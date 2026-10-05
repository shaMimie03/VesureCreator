"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CREATOR_CATEGORIES } from "@/lib/creators/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SettingsActionResult = { error?: string; success?: string };

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(120, "Product name must be 120 characters or fewer."),
  category: z.enum(CREATOR_CATEGORIES),
  description: z.string().trim().max(5000, "Description must be 5,000 characters or fewer."),
  commission_rate: z.string().trim().min(1, "Commission rate is required.").max(20, "Commission rate must be 20 characters or fewer.")
    .regex(/^\d+(\.\d{1,2})?%?$/, "Enter a valid commission rate, such as 7%."),
  is_active: z.enum(["true", "false"]).transform((value) => value === "true"),
  links: z.array(z.object({
    label: z.string().trim().min(1, "Every product link needs a label.").max(80, "Link labels must be 80 characters or fewer."),
    url: z.string().trim().url("Enter a valid URL for every product link.").max(2048, "Product URLs must be 2,048 characters or fewer."),
  })).max(30, "A product can have at most 30 links."),
});

const templateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required.").max(120, "Template name must be 120 characters or fewer."),
  type: z.enum(["Product Collaboration", "MCN Invite", "Follow-up", "Sample"]),
  category: z.enum(CREATOR_CATEGORIES),
  channel: z.enum(["WhatsApp", "TikTok DM", "Email"]),
  language: z.string().trim().min(1, "Language is required.").max(20, "Language must be 20 characters or fewer."),
  body: z.string().trim().min(1, "Template body is required.").max(40000, "Template body must be 40,000 characters or fewer."),
  is_active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const settingsSchema = z.object({
  enterprise_name: z.string().trim().min(1, "Enterprise name is required.").max(120, "Enterprise name must be 120 characters or fewer."),
  mcn_name: z.string().trim().min(1, "MCN name is required.").max(120, "MCN name must be 120 characters or fewer."),
  default_rate: z.string().trim().min(1, "Default commission rate is required.").max(20, "Commission rate must be 20 characters or fewer.")
    .regex(/^\d+(\.\d{1,2})?%?$/, "Enter a valid commission rate, such as 7%."),
  first: z.coerce.number().int().min(1).max(365, "Follow-up days must be between 1 and 365."),
  second: z.coerce.number().int().min(1).max(365, "Follow-up days must be between 1 and 365."),
  sample_reminder_1: z.coerce.number().int().min(1).max(365, "Reminder days must be between 1 and 365."),
  sample_reminder_2: z.coerce.number().int().min(1).max(365, "Reminder days must be between 1 and 365."),
});

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item : "";
}

function validationMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(" ");
}

function validId(id: string) {
  return z.string().uuid().safeParse(id).success;
}

function databaseMessage(error: { code?: string; message: string }, operation: string) {
  if (error.code === "23503") return `${operation}: this record is in use by other data.`;
  return `${operation}: ${error.message}`;
}

function parseProduct(formData: FormData) {
  let links: unknown;
  try {
    links = JSON.parse(value(formData, "links"));
  } catch {
    return { success: false as const, error: "Product links are invalid. Please review the links and try again." };
  }
  const parsed = productSchema.safeParse({
    name: value(formData, "name"),
    category: value(formData, "category"),
    description: value(formData, "description"),
    commission_rate: value(formData, "commission_rate"),
    is_active: value(formData, "is_active"),
    links,
  });
  return parsed.success ? parsed : { success: false as const, error: validationMessage(parsed.error) };
}

function parseTemplate(formData: FormData) {
  const parsed = templateSchema.safeParse({
    name: value(formData, "name"),
    type: value(formData, "type"),
    category: value(formData, "category"),
    channel: value(formData, "channel"),
    language: value(formData, "language"),
    body: value(formData, "body"),
    is_active: value(formData, "is_active"),
  });
  return parsed.success ? parsed : { success: false as const, error: validationMessage(parsed.error) };
}

export async function saveProduct(formData: FormData): Promise<SettingsActionResult> {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { error: parsed.error };
  const id = value(formData, "id");
  if (id && !validId(id)) return { error: "Invalid product ID." };

  try {
    const supabase = await createServerSupabaseClient();
    const result = id
      ? await supabase.from("products").update(parsed.data).eq("id", id).select("id").maybeSingle()
      : await supabase.from("products").insert(parsed.data).select("id").single();
    if (result.error) return { error: databaseMessage(result.error, "Could not save product") };
    if (!result.data) return { error: "This product no longer exists. Refresh and try again." };
    revalidatePath("/settings/products");
    revalidatePath("/settings");
    revalidatePath("/creators");
    return { success: id ? "Product saved." : "Product created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save product. Please try again." };
  }
}

export async function deleteProduct(id: string): Promise<SettingsActionResult> {
  if (!validId(id)) return { error: "Invalid product ID." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("products").delete().eq("id", id).select("id").maybeSingle();
    if (error) return { error: databaseMessage(error, "Could not delete product") };
    if (!data) return { error: "This product no longer exists. Refresh and try again." };
    revalidatePath("/settings/products");
    revalidatePath("/settings");
    revalidatePath("/creators");
    return { success: "Product deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete product. Please try again." };
  }
}

export async function saveTemplate(formData: FormData): Promise<SettingsActionResult> {
  const parsed = parseTemplate(formData);
  if (!parsed.success) return { error: parsed.error };
  const id = value(formData, "id");
  if (id && !validId(id)) return { error: "Invalid template ID." };
  try {
    const supabase = await createServerSupabaseClient();
    const result = id
      ? await supabase.from("templates").update(parsed.data).eq("id", id).select("id").maybeSingle()
      : await supabase.from("templates").insert(parsed.data).select("id").single();
    if (result.error) return { error: databaseMessage(result.error, "Could not save template") };
    if (!result.data) return { error: "This template no longer exists. Refresh and try again." };
    revalidatePath("/settings/templates");
    revalidatePath("/creators");
    return { success: id ? "Template saved." : "Template created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save template. Please try again." };
  }
}

export async function deleteTemplate(id: string): Promise<SettingsActionResult> {
  if (!validId(id)) return { error: "Invalid template ID." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("templates").delete().eq("id", id).select("id").maybeSingle();
    if (error) return { error: databaseMessage(error, "Could not delete template") };
    if (!data) return { error: "This template no longer exists. Refresh and try again." };
    revalidatePath("/settings/templates");
    revalidatePath("/creators");
    return { success: "Template deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete template. Please try again." };
  }
}

export async function saveAppSettings(formData: FormData): Promise<SettingsActionResult> {
  const parsed = settingsSchema.safeParse({
    enterprise_name: value(formData, "enterprise_name"),
    mcn_name: value(formData, "mcn_name"),
    default_rate: value(formData, "default_rate"),
    first: value(formData, "first"),
    second: value(formData, "second"),
    sample_reminder_1: value(formData, "sample_reminder_1"),
    sample_reminder_2: value(formData, "sample_reminder_2"),
  });
  if (!parsed.success) return { error: validationMessage(parsed.error) };

  const { enterprise_name, mcn_name, default_rate, ...follow_up_days } = parsed.data;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("settings").upsert([
      { key: "brand", value: { enterprise_name, mcn_name } },
      { key: "commission", value: { default_rate } },
      { key: "follow_up_days", value: follow_up_days },
    ], { onConflict: "key" });
    if (error) return { error: databaseMessage(error, "Could not save settings") };
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: "Settings saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save settings. Please try again." };
  }
}
